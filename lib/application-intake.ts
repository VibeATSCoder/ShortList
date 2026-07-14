import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { RowDataPacket } from "mysql2/promise";

import { assessmentJobHash, verifyAssessmentSeal } from "@/lib/assessment-seal";
import { withTransaction } from "@/lib/db";
import type { ScreeningResult } from "@/lib/types";
import type { WorkspaceSession } from "@/lib/workspace-types";

export class ApplicationIntakeError extends Error {}

export async function importSealedAssessment(
  session: WorkspaceSession,
  input: {
    positionId: string;
    assessment: ScreeningResult;
    workspaceSeal: string;
    candidateEmail?: string;
    source: string;
    locale: "en" | "fa";
  },
): Promise<{ applicationId: string; candidateId: string; assessmentId: string }> {
  return withTransaction(async (connection) => {
    const [positions] = await connection.execute<
      (RowDataPacket & { id: string; title: string; description: string })[]
    >(
      `SELECT id, title, description
         FROM positions
        WHERE id = ? AND organization_id = ? AND status <> 'archived'
        LIMIT 1
        FOR UPDATE`,
      [input.positionId, session.organizationId],
    );
    const position = positions[0];
    if (!position) throw new ApplicationIntakeError("POSITION_NOT_FOUND");
    if (input.assessment.source !== "live") {
      throw new ApplicationIntakeError("LIVE_ASSESSMENT_REQUIRED");
    }
    if (!verifyAssessmentSeal(position, input.assessment, input.workspaceSeal)) {
      throw new ApplicationIntakeError("ASSESSMENT_SEAL_INVALID");
    }

    const [stages] = await connection.execute<
      (RowDataPacket & { id: string })[]
    >(
      `SELECT id
         FROM pipeline_stages
        WHERE organization_id = ? AND position_id = ? AND archived_at IS NULL
        ORDER BY CASE WHEN stage_key = 'screen' THEN 0 WHEN stage_key = 'applied' THEN 1 ELSE 2 END,
                 sort_order
        LIMIT 1`,
      [session.organizationId, position.id],
    );
    const stage = stages[0];
    if (!stage) throw new ApplicationIntakeError("POSITION_PIPELINE_MISSING");

    const normalizedEmail = input.candidateEmail?.trim().toLowerCase() || null;
    let candidateId: string | undefined;
    if (normalizedEmail) {
      const [existingCandidates] = await connection.execute<
        (RowDataPacket & { id: string })[]
      >(
        `SELECT id FROM candidates
          WHERE organization_id = ? AND LOWER(email) = ?
          ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
        [session.organizationId, normalizedEmail],
      );
      candidateId = existingCandidates[0]?.id;
    }

    const parseQuality = input.assessment.parseQuality ?? {
      score: 0,
      contact: "missing" as const,
      experience: "missing" as const,
      skills: "missing" as const,
      dates: "missing" as const,
      warnings: ["Parse diagnostics were not returned for this assessment."],
    };
    if (!candidateId) {
      candidateId = randomUUID();
      await connection.execute(
        `INSERT INTO candidates
          (id, organization_id, display_name, current_role, email,
           parse_quality_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [
          candidateId,
          session.organizationId,
          input.assessment.profile.displayName,
          input.assessment.profile.currentRole,
          normalizedEmail,
          JSON.stringify(parseQuality),
        ],
      );
    } else {
      await connection.execute(
        `UPDATE candidates
            SET current_role = ?, parse_quality_json = ?, updated_at = UTC_TIMESTAMP(3)
          WHERE id = ? AND organization_id = ?`,
        [
          input.assessment.profile.currentRole,
          JSON.stringify(parseQuality),
          candidateId,
          session.organizationId,
        ],
      );
    }

    const [existingApplications] = await connection.execute<
      (RowDataPacket & { id: string })[]
    >(
      "SELECT id FROM applications WHERE organization_id = ? AND position_id = ? AND candidate_id = ? LIMIT 1",
      [session.organizationId, position.id, candidateId],
    );
    if (existingApplications[0]) {
      throw new ApplicationIntakeError("CANDIDATE_ALREADY_APPLIED");
    }

    const applicationId = randomUUID();
    const assessmentId = randomUUID();
    await connection.execute(
      `INSERT INTO applications
        (id, organization_id, position_id, candidate_id, current_stage_id,
         latest_assessment_id, source, state, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NULL, ?, 'active', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [applicationId, session.organizationId, position.id, candidateId, stage.id, input.source],
    );

    const rubricHash = createHash("sha256")
      .update(JSON.stringify(input.assessment.rubric))
      .digest("hex");
    await connection.execute(
      `INSERT INTO assessment_snapshots
        (id, organization_id, position_id, application_id, resume_asset_id,
         rubric_version, prompt_version, model, locale, job_hash, rubric_hash,
         score, recommendation, confidence, assessment_json, created_by, created_at)
       VALUES (?, ?, ?, ?, NULL, '100-point-v1', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
      [
        assessmentId,
        session.organizationId,
        position.id,
        applicationId,
        input.assessment.meta.promptVersion,
        input.assessment.meta.model,
        input.locale,
        assessmentJobHash(position),
        rubricHash,
        input.assessment.score,
        input.assessment.recommendation,
        input.assessment.confidence,
        JSON.stringify(input.assessment),
        session.userId,
      ],
    );
    await connection.execute(
      "UPDATE applications SET latest_assessment_id = ? WHERE id = ? AND organization_id = ?",
      [assessmentId, applicationId, session.organizationId],
    );
    await connection.execute(
      `INSERT INTO application_stage_transitions
        (id, organization_id, position_id, application_id, from_stage_id, to_stage_id,
         actor_id, reason, source, idempotency_key, expected_version,
         resulting_version, occurred_at)
       VALUES (UUID(), ?, ?, ?, NULL, ?, ?, 'Imported from sealed live screening',
               'import', ?, 0, 1, UTC_TIMESTAMP(3))`,
      [session.organizationId, position.id, applicationId, stage.id, session.userId, `intake:${assessmentId}`],
    );
    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, position_id, application_id, source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'assessment.imported', 'application', ?, ?, ?, ?,
               'api', ?, UTC_TIMESTAMP(3))`,
      [
        session.organizationId,
        session.userId,
        applicationId,
        input.assessment.profile.displayName,
        position.id,
        applicationId,
        JSON.stringify({ assessmentId, promptVersion: input.assessment.meta.promptVersion }),
      ],
    );

    return { applicationId, candidateId, assessmentId };
  });
}

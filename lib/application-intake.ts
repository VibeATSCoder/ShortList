import "server-only";

import { createHash, randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { assessmentJobHash, verifyAssessmentSeal } from "@/lib/assessment-seal";
import { withTransaction } from "@/lib/db";
import type { ScreeningResult } from "@/lib/types";
import type { WorkspaceSession } from "@/lib/workspace-types";
import { planEntitlements } from "@/lib/plans";

export class ApplicationIntakeError extends Error {}

export async function attachResumeAsset(
  session: WorkspaceSession,
  input: {
    assetId: string;
    applicationId: string;
    candidateId: string;
    assessmentId: string;
    storageKey: string;
    originalName: string;
    contentType: string;
    byteSize: number;
    sha256: string;
  },
): Promise<void> {
  await withTransaction(async (connection) => {
    const retentionUntil = new Date(Date.now() + 180 * 24 * 60 * 60 * 1_000);
    await connection.execute(
      `INSERT INTO resume_assets
        (id, organization_id, candidate_id, storage_key, original_name,
         content_type, byte_size, sha256, encryption_key_version, state,
         retention_until, created_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', ?, UTC_TIMESTAMP(3), NULL)`,
      [
        input.assetId,
        session.organizationId,
        input.candidateId,
        input.storageKey,
        input.originalName,
        input.contentType,
        input.byteSize,
        input.sha256,
        retentionUntil,
      ],
    );
    const [assessment] = await connection.execute<ResultSetHeader>(
      `UPDATE assessment_snapshots
          SET resume_asset_id = ?
        WHERE id = ? AND organization_id = ? AND application_id = ?
          AND created_by = ?`,
      [input.assetId, input.assessmentId, session.organizationId, input.applicationId, session.userId],
    );
    if (assessment.affectedRows !== 1) throw new Error("ASSESSMENT_RESUME_ATTACH_FAILED");
  });
}

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
): Promise<{ applicationId: string; candidateId: string; assessmentId: string | null; created: boolean }> {
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
    const plan = planEntitlements(session.planTier);
    const [applicationCounts] = await connection.execute<(RowDataPacket & { application_count: number })[]>(
      `SELECT COUNT(*) AS application_count
         FROM applications
        WHERE organization_id = ? AND position_id = ? AND state <> 'archived'`,
      [session.organizationId, position.id],
    );
    if (Number(applicationCounts[0]?.application_count ?? 0) >= plan.candidateLimitPerPosition) {
      throw new ApplicationIntakeError("PLAN_CANDIDATE_LIMIT");
    }
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
    let archivedApplication:
      | { id: string; currentStageId: string; version: number }
      | undefined;
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

    if (candidateId) {
      const [existingApplications] = await connection.execute<
        (RowDataPacket & {
          id: string;
          latest_assessment_id: string | null;
          current_stage_id: string;
          state: string;
          version: number;
        })[]
      >(
        `SELECT id, latest_assessment_id, current_stage_id, state, version
           FROM applications
          WHERE organization_id = ? AND position_id = ? AND candidate_id = ?
          ORDER BY CASE WHEN state <> 'archived' THEN 0 ELSE 1 END, created_at ASC
          LIMIT 1
          FOR UPDATE`,
        [session.organizationId, position.id, candidateId],
      );
      const existingApplication = existingApplications[0];
      if (existingApplication && existingApplication.state !== "archived") {
        return {
          applicationId: existingApplication.id,
          candidateId,
          assessmentId: existingApplication.latest_assessment_id,
          created: false,
        };
      }
      if (existingApplication) {
        archivedApplication = {
          id: existingApplication.id,
          currentStageId: existingApplication.current_stage_id,
          version: Number(existingApplication.version),
        };
      }
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

    const applicationId = archivedApplication?.id ?? randomUUID();
    const assessmentId = randomUUID();
    if (archivedApplication) {
      const [reactivation] = await connection.execute<ResultSetHeader>(
        `UPDATE applications
            SET current_stage_id = ?, latest_assessment_id = NULL, source = ?,
                state = 'active', version = version + 1, updated_at = UTC_TIMESTAMP(3)
          WHERE id = ? AND organization_id = ? AND position_id = ? AND state = 'archived'`,
        [stage.id, input.source, applicationId, session.organizationId, position.id],
      );
      if (reactivation.affectedRows !== 1) {
        throw new ApplicationIntakeError("APPLICATION_REACTIVATION_CONFLICT");
      }
    } else {
      await connection.execute(
        `INSERT INTO applications
          (id, organization_id, position_id, candidate_id, current_stage_id,
           latest_assessment_id, source, state, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, 'active', 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [applicationId, session.organizationId, position.id, candidateId, stage.id, input.source],
      );
    }

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
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 'import', ?, ?, ?, UTC_TIMESTAMP(3))`,
      [
        session.organizationId,
        position.id,
        applicationId,
        archivedApplication?.currentStageId ?? null,
        stage.id,
        session.userId,
        archivedApplication ? "Reactivated from a new sealed live screening" : "Imported from sealed live screening",
        `intake:${assessmentId}`,
        archivedApplication?.version ?? 0,
        (archivedApplication?.version ?? 0) + 1,
      ],
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
        JSON.stringify({ assessmentId, promptVersion: input.assessment.meta.promptVersion, reactivated: Boolean(archivedApplication) }),
      ],
    );

    return { applicationId, candidateId, assessmentId, created: true };
  });
}

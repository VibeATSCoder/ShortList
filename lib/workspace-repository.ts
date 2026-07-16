import "server-only";

import { randomUUID } from "node:crypto";

import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import {
  can,
  canForPosition,
  canReadPositionIdentity,
  hasOrganizationWidePositionAccess,
} from "@/lib/auth";
import { databaseConfigured, queryRows, withTransaction } from "@/lib/db";
import { emailDeliveryConfigured } from "@/lib/review-email";
import { reviewStorageMode } from "@/lib/review-store";
import { planEntitlements } from "@/lib/plans";
import { reviewCandidateSchema } from "@/lib/reviews";
import { candidateForBlindExport } from "@/lib/export";
import { normalizeParseQuality } from "@/lib/assessment";
import type {
  AuditEventSummary,
  AutomationRuleSummary,
  EmailTemplateSummary,
  ParseQuality,
  PipelineStage,
  PositionStatus,
  PositionSummary,
  StageTransitionCommand,
  TeamMember,
  WorkspaceCandidate,
  WorkspaceSession,
  WorkspaceSnapshot,
} from "@/lib/workspace-types";

interface PositionRow extends RowDataPacket {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  status: PositionStatus;
  default_locale: "en" | "fa";
  candidate_count: number;
  updated_at: Date | string;
}

interface StageRow extends RowDataPacket {
  id: string;
  stage_key: string;
  name_en: string;
  name_fa: string;
  kind: PipelineStage["kind"];
  sort_order: number;
  is_terminal: number;
}

interface CandidateRow extends RowDataPacket {
  application_id: string;
  application_version: number;
  candidate_id: string;
  display_name: string;
  current_role: string;
  email: string | null;
  source: string;
  stage_id: string;
  stage_key: string;
  score: number | null;
  recommendation: WorkspaceCandidate["recommendation"];
  confidence: WorkspaceCandidate["confidence"];
  applied_at: Date | string;
  last_activity_at: Date | string;
  parse_quality_json: string | null;
  assessment_json: string | null;
  resume_asset_id: string | null;
  resume_original_name: string | null;
  resume_content_type: string | null;
}

interface TeamRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  role: TeamMember["role"];
  position_access: TeamMember["positionAccess"];
  identity_access: number;
  status: TeamMember["status"];
  last_active_at: Date | string | null;
}

interface TemplateRow extends RowDataPacket {
  id: string;
  template_key: string;
  name: string;
  locale: "en" | "fa";
  subject: string;
  body_text: string;
  version: number;
  status: EmailTemplateSummary["status"];
  allowed_variables_json: string;
}

interface AutomationRow extends RowDataPacket {
  id: string;
  name: string;
  trigger_label: string;
  action_label: string;
  enabled: number;
  requires_approval: number;
  last_run_at: Date | string | null;
  last_run_status: AutomationRuleSummary["lastRunStatus"] | null;
}

interface AuditRow extends RowDataPacket {
  id: string;
  actor: string;
  action: string;
  target: string;
  occurred_at: Date | string;
  source: AuditEventSummary["source"];
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(`${value}Z`.replace("ZZ", "Z")).toISOString();
}

function safeJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function position(row: PositionRow): PositionSummary {
  return {
    id: row.id,
    title: row.title,
    department: row.department,
    location: row.location,
    employmentType: row.employment_type,
    description: row.description,
    status: row.status,
    defaultLocale: row.default_locale,
    candidateCount: Number(row.candidate_count),
    updatedAt: iso(row.updated_at),
    protected: isProtectedPositionId(row.id),
  };
}

export function isProtectedPositionId(positionId: string): boolean {
  const protectedId = (
    process.env.SHOWCASE_POSITION_ID || process.env.PUBLIC_INTAKE_POSITION_ID
  )?.trim();
  return Boolean(protectedId && positionId === protectedId);
}

const emptyParseQuality: ParseQuality = {
  score: 0,
  contact: "missing",
  experience: "missing",
  skills: "missing",
  dates: "missing",
  warnings: [],
};

export async function loadWorkspace(
  session: WorkspaceSession,
  requestedPositionId?: string,
): Promise<WorkspaceSnapshot> {
  if (!databaseConfigured()) throw new Error("DATABASE_NOT_CONFIGURED");
  const plan = planEntitlements(session.planTier);

  const positionRows = await queryRows<PositionRow>(
    `SELECT p.id, p.title, p.department, p.location, p.employment_type, p.description, p.status,
            p.default_locale, p.updated_at, COUNT(a.id) AS candidate_count
       FROM positions p
       LEFT JOIN applications a ON a.position_id = p.id AND a.state <> 'archived'
      WHERE p.organization_id = ? AND p.status <> 'archived'
        AND (
          ? = 1 OR EXISTS (
            SELECT 1
              FROM position_memberships access
             WHERE access.organization_id = p.organization_id
               AND access.position_id = p.id
               AND access.user_id = ?
          )
        )
      GROUP BY p.id, p.title, p.department, p.location, p.employment_type, p.description,
               p.status, p.default_locale, p.updated_at
      ORDER BY CASE p.status
                 WHEN 'open' THEN 1 WHEN 'draft' THEN 2 WHEN 'paused' THEN 3
                 WHEN 'closed' THEN 4 ELSE 5
               END,
               p.updated_at DESC`,
    [
      session.organizationId,
      hasOrganizationWidePositionAccess(session) ? 1 : 0,
      session.userId,
    ],
  );
  const positions = positionRows.map(position);
  const activePosition = positions.find((item) => item.id === requestedPositionId) ?? positions[0];
  if (!activePosition) throw new Error("WORKSPACE_HAS_NO_POSITIONS");

  const [
    identityVisible,
    canUseTemplates,
    canManageAutomations,
    canReadAudit,
  ] = await Promise.all([
    canReadPositionIdentity(session, activePosition.id),
    Promise.all([
      canForPosition(session, activePosition.id, "template.manage"),
      canForPosition(session, activePosition.id, "email.send"),
    ]).then((permissions) => permissions.some(Boolean)),
    canForPosition(session, activePosition.id, "automation.manage"),
    canForPosition(session, activePosition.id, "audit.read"),
  ]);
  const canManageTeam = plan.teamAccess && can(session, "team.manage");

  const [stageRows, candidateRows, teamRows, templateRows, automationRows, auditRows, organizationRows] = await Promise.all([
    queryRows<StageRow>(
      `SELECT id, stage_key, name_en, name_fa, kind, sort_order, is_terminal
         FROM pipeline_stages
        WHERE organization_id = ? AND position_id = ? AND archived_at IS NULL
        ORDER BY sort_order ASC`,
      [session.organizationId, activePosition.id],
    ),
    queryRows<CandidateRow>(
      `SELECT a.id AS application_id, a.version AS application_version,
              c.id AS candidate_id, c.display_name, c.current_role, c.email, a.source,
              s.id AS stage_id, s.stage_key, x.score, x.recommendation, x.confidence,
              a.created_at AS applied_at, a.updated_at AS last_activity_at,
              c.parse_quality_json, x.assessment_json,
              r.id AS resume_asset_id, r.original_name AS resume_original_name,
              r.content_type AS resume_content_type
         FROM applications a
         JOIN candidates c ON c.id = a.candidate_id AND c.organization_id = a.organization_id
         JOIN pipeline_stages s ON s.id = a.current_stage_id
         LEFT JOIN assessment_snapshots x
           ON x.id = a.latest_assessment_id
          AND x.organization_id = a.organization_id
          AND x.position_id = a.position_id
          AND x.application_id = a.id
         LEFT JOIN resume_assets r
          ON r.id = x.resume_asset_id
         AND r.organization_id = a.organization_id
         AND r.candidate_id = a.candidate_id
         AND r.state = 'active'
        WHERE a.organization_id = ? AND a.position_id = ? AND a.state <> 'archived'
        ORDER BY COALESCE(x.score, -1) DESC, a.created_at DESC`,
      [session.organizationId, activePosition.id],
    ),
    canManageTeam ? queryRows<TeamRow>(
      `SELECT u.id, u.name, u.email, m.role,
              CASE WHEN m.role IN ('owner', 'admin', 'recruiter')
                   THEN 'all' ELSE 'assigned' END AS position_access,
              COALESCE(pm.identity_access, m.identity_access, 0) AS identity_access,
              CASE WHEN u.status = 'invited' THEN 'invited'
                   WHEN u.status = 'suspended' THEN 'suspended' ELSE 'active' END AS status,
              MAX(s.last_seen_at) AS last_active_at
         FROM organization_memberships m
         JOIN users u ON u.id = m.user_id
         LEFT JOIN position_memberships pm
           ON pm.organization_id = m.organization_id
          AND pm.user_id = u.id
          AND pm.position_id = ?
         LEFT JOIN sessions s
           ON s.organization_id = m.organization_id
          AND s.user_id = u.id
          AND s.revoked_at IS NULL
        WHERE m.organization_id = ? AND m.status = 'active'
        GROUP BY u.id, u.name, u.email, m.role, pm.id, pm.identity_access, m.identity_access, u.status
        ORDER BY CASE m.role
                   WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'recruiter' THEN 3
                   WHEN 'hiring_manager' THEN 4 WHEN 'interviewer' THEN 5
                   WHEN 'viewer' THEN 6 ELSE 7
                 END,
                 u.name`,
      [activePosition.id, session.organizationId],
    ) : Promise.resolve([] as TeamRow[]),
    plan.templates && canUseTemplates ? queryRows<TemplateRow>(
      `SELECT tv.id, t.template_key, t.name, tv.locale, tv.subject, tv.body_text,
              tv.version, tv.status, tv.allowed_variables_json
         FROM email_template_versions tv
         JOIN email_templates t
           ON t.organization_id = tv.organization_id
          AND t.id = tv.template_id
        WHERE tv.organization_id = ? AND tv.status IN ('active', 'draft')
        ORDER BY t.name, tv.locale, tv.version DESC`,
      [session.organizationId],
    ) : Promise.resolve([] as TemplateRow[]),
    plan.automations && canManageAutomations ? queryRows<AutomationRow>(
      `SELECT id, name, trigger_label, action_label, enabled, requires_approval,
              last_run_at, COALESCE(last_run_status, 'never') AS last_run_status
         FROM automation_rules
        WHERE organization_id = ? AND (position_id IS NULL OR position_id = ?)
        ORDER BY enabled DESC, name`,
      [session.organizationId, activePosition.id],
    ) : Promise.resolve([] as AutomationRow[]),
    plan.auditExport && canReadAudit ? queryRows<AuditRow>(
      `SELECT e.id, COALESCE(u.name, CASE WHEN e.actor_type = 'system' THEN 'Shortlist automation' ELSE 'External reviewer' END) AS actor,
              e.action, CONCAT(e.target_type, ' · ', e.target_label) AS target,
              e.occurred_at, e.source
         FROM audit_events e
         LEFT JOIN users u ON u.id = e.actor_id
        WHERE e.organization_id = ? AND (e.position_id IS NULL OR e.position_id = ?)
        ORDER BY e.occurred_at DESC
        LIMIT 50`,
      [session.organizationId, activePosition.id],
    ) : Promise.resolve([] as AuditRow[]),
    queryRows<RowDataPacket & { id: string; name: string }>(
      "SELECT id, name FROM organizations WHERE id = ? LIMIT 1",
      [session.organizationId],
    ),
  ]);

  const candidates: WorkspaceCandidate[] = candidateRows.map((row, index) => {
    const parsedAssessment = row.assessment_json
      ? reviewCandidateSchema.safeParse(safeJson<unknown>(row.assessment_json, null))
      : null;
    const normalizedAssessment = parsedAssessment?.success
      ? {
          ...parsedAssessment.data,
          parseQuality: parsedAssessment.data.parseQuality
            ? normalizeParseQuality(parsedAssessment.data.parseQuality)
            : undefined,
        }
      : null;
    const assessment = normalizedAssessment
      ? identityVisible
        ? normalizedAssessment
        : candidateForBlindExport(
            normalizedAssessment,
            index + 1,
            activePosition.defaultLocale,
          )
      : null;
    return {
      applicationId: row.application_id,
      applicationVersion: Number(row.application_version),
      candidateId: row.candidate_id,
      displayName: identityVisible
        ? row.display_name
        : assessment?.profile.displayName ?? `Candidate ${String(index + 1).padStart(2, "0")}`,
      currentRole: assessment?.profile.currentRole ?? row.current_role,
      email: identityVisible ? row.email : null,
      source: row.source,
      stageId: row.stage_id,
      stageKey: row.stage_key,
      score: row.score === null ? null : Number(row.score),
      recommendation: row.recommendation,
      confidence: row.confidence,
      appliedAt: iso(row.applied_at),
      lastActivityAt: iso(row.last_activity_at),
      parseQuality: normalizeParseQuality(
        safeJson<ParseQuality>(row.parse_quality_json, emptyParseQuality),
      ),
      assessment,
      resume: identityVisible && row.resume_asset_id && row.resume_original_name && row.resume_content_type
        ? {
            fileName: row.resume_original_name,
            contentType: row.resume_content_type,
            url: `/api/workspace/applications/${row.application_id}/resume`,
          }
        : null,
      protected: Boolean(
        process.env.SHOWCASE_CANDIDATE_EMAIL?.trim() &&
        row.email?.trim().toLowerCase() === process.env.SHOWCASE_CANDIDATE_EMAIL.trim().toLowerCase()
      ),
    };
  });

  return {
    mode: "database",
    generatedAt: new Date().toISOString(),
    organization: organizationRows[0] ?? { id: session.organizationId, name: "Shortlist" },
    session,
    plan,
    positions,
    activePosition,
    stages: stageRows.map((row) => ({
      id: row.id,
      key: row.stage_key,
      name: { en: row.name_en, fa: row.name_fa },
      kind: row.kind,
      order: Number(row.sort_order),
      terminal: Boolean(row.is_terminal),
    })),
    candidates,
    team: teamRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      positionAccess: row.position_access,
      identityAccess: Boolean(row.identity_access),
      status: row.status,
      lastActiveAt: row.last_active_at ? iso(row.last_active_at) : null,
    })),
    templates: templateRows.map((row) => ({
      id: row.id,
      key: row.template_key,
      name: row.name,
      locale: row.locale,
      subject: row.subject,
      body: row.body_text,
      version: Number(row.version),
      status: row.status,
      allowedVariables: safeJson<string[]>(row.allowed_variables_json, []),
    })),
    automations: automationRows.map((row) => ({
      id: row.id,
      name: row.name,
      trigger: row.trigger_label,
      action: row.action_label,
      enabled: Boolean(row.enabled),
      requiresApproval: Boolean(row.requires_approval),
      lastRunAt: row.last_run_at ? iso(row.last_run_at) : null,
      lastRunStatus: row.last_run_status ?? "never",
    })),
    audit: auditRows.map((row) => ({ id: row.id, actor: row.actor, action: row.action, target: row.target, occurredAt: iso(row.occurred_at), source: row.source })),
    capabilities: {
      database: true,
      smtp: plan.emailSending && emailDeliveryConfigured(),
      ai: Boolean(process.env.OPENAI_API_KEY),
      privateFiles: reviewStorageMode() !== "disabled" || Boolean(process.env.PRIVATE_UPLOAD_DIR && process.env.FILE_ENCRYPTION_KEY),
    },
  };
}

export async function createPosition(
  session: WorkspaceSession,
  input: {
    title: string;
    department: string;
    location: string;
    employmentType: string;
    description: string;
    defaultLocale: "en" | "fa";
  },
): Promise<{ id: string }> {
  const plan = planEntitlements(session.planTier);
  const existing = await queryRows<RowDataPacket & { position_count: number }>(
    "SELECT COUNT(*) AS position_count FROM positions WHERE organization_id = ? AND status <> 'archived'",
    [session.organizationId],
  );
  if (Number(existing[0]?.position_count ?? 0) >= plan.positionLimit) {
    throw new Error("PLAN_POSITION_LIMIT");
  }
  const positionId = randomUUID();
  const stages = [
    ["applied", "Applied", "دریافت‌شده", "applied", 1, 0],
    ["screen", "AI screen", "غربال هوشمند", "screening", 2, 0],
    ["review", "Team review", "بررسی تیم", "screening", 3, 0],
    ["interview", "Interview", "مصاحبه", "interview", 4, 0],
    ["offer", "Offer", "پیشنهاد", "offer", 5, 0],
    ["hired", "Hired", "استخدام‌شده", "hired", 6, 1],
    ["rejected", "Declined", "ردشده", "rejected", 7, 1],
  ] as const;

  await withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO positions
        (id, organization_id, title, department, location, employment_type,
         description, status, default_locale, timezone, version, created_by,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, 'Asia/Tehran', 1, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
      [positionId, session.organizationId, input.title, input.department, input.location, input.employmentType, input.description, input.defaultLocale, session.userId],
    );
    for (const stage of stages) {
      await connection.execute(
        `INSERT INTO pipeline_stages
          (id, organization_id, position_id, stage_key, name_en, name_fa, kind,
           sort_order, is_terminal, created_at)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
        [session.organizationId, positionId, ...stage],
      );
    }
    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, position_id, source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'position.created', 'position', ?, ?, ?, 'api', '{}', UTC_TIMESTAMP(3))`,
      [session.organizationId, session.userId, positionId, input.title, positionId],
    );
  });
  return { id: positionId };
}

export async function archivePosition(
  session: WorkspaceSession,
  positionId: string,
): Promise<void> {
  if (!can(session, "position.manage")) throw new Error("POSITION_ARCHIVE_FORBIDDEN");
  if (isProtectedPositionId(positionId)) throw new Error("PROTECTED_POSITION");

  await withTransaction(async (connection) => {
    const [positions] = await connection.execute<
      (RowDataPacket & { id: string; title: string; status: PositionStatus })[]
    >(
      `SELECT id, title, status
         FROM positions
        WHERE id = ? AND organization_id = ? AND status <> 'archived'
        LIMIT 1
        FOR UPDATE`,
      [positionId, session.organizationId],
    );
    const target = positions[0];
    if (!target) throw new Error("POSITION_NOT_FOUND");
    if (isProtectedPositionId(target.id)) throw new Error("PROTECTED_POSITION");

    const [update] = await connection.execute<ResultSetHeader>(
      `UPDATE positions
          SET status = 'archived', version = version + 1, updated_at = UTC_TIMESTAMP(3)
        WHERE id = ? AND organization_id = ? AND status <> 'archived'`,
      [target.id, session.organizationId],
    );
    if (update.affectedRows !== 1) throw new WorkspaceConflictError("POSITION_ARCHIVE_CONFLICT");

    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, position_id, application_id, source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'position.archived', 'position', ?, ?, ?, NULL,
               'api', ?, UTC_TIMESTAMP(3))`,
      [
        session.organizationId,
        session.userId,
        target.id,
        target.title,
        target.id,
        JSON.stringify({ previousStatus: target.status, retention: "candidates-and-audit-preserved" }),
      ],
    );
  });
}

export class WorkspaceConflictError extends Error {}

export async function deleteApplication(
  session: WorkspaceSession,
  applicationId: string,
  expectedVersion: number,
): Promise<void> {
  if (!can(session, "application.delete")) throw new Error("APPLICATION_DELETE_FORBIDDEN");

  await withTransaction(async (connection) => {
    const [applications] = await connection.execute<
      (RowDataPacket & { id: string; position_id: string; version: number; candidate_name: string; candidate_email: string | null })[]
    >(
      `SELECT a.id, a.position_id, a.version, c.display_name AS candidate_name,
              c.email AS candidate_email
         FROM applications a
         JOIN candidates c
           ON c.organization_id = a.organization_id
          AND c.id = a.candidate_id
        WHERE a.id = ? AND a.organization_id = ? AND a.state <> 'archived'
        LIMIT 1
        FOR UPDATE`,
      [applicationId, session.organizationId],
    );
    const application = applications[0];
    if (!application) throw new Error("APPLICATION_NOT_FOUND");
    const protectedEmail = process.env.SHOWCASE_CANDIDATE_EMAIL?.trim().toLowerCase();
    if (protectedEmail && application.candidate_email?.trim().toLowerCase() === protectedEmail) {
      throw new Error("PROTECTED_APPLICATION");
    }
    if (Number(application.version) !== expectedVersion) {
      throw new WorkspaceConflictError("APPLICATION_VERSION_CONFLICT");
    }

    const [update] = await connection.execute<ResultSetHeader>(
      `UPDATE applications
          SET state = 'archived', version = version + 1, updated_at = UTC_TIMESTAMP(3)
        WHERE id = ? AND organization_id = ? AND version = ? AND state <> 'archived'`,
      [application.id, session.organizationId, expectedVersion],
    );
    if (update.affectedRows !== 1) throw new WorkspaceConflictError("APPLICATION_VERSION_CONFLICT");

    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, position_id, application_id, source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'application.deleted', 'application', ?, ?, ?, ?, 'api', ?, UTC_TIMESTAMP(3))`,
      [
        session.organizationId,
        session.userId,
        application.id,
        application.candidate_name,
        application.position_id,
        application.id,
        JSON.stringify({ retention: "audit-preserved", previousVersion: expectedVersion }),
      ],
    );
  });
}

export async function transitionApplication(
  session: WorkspaceSession,
  command: StageTransitionCommand,
): Promise<{ version: number; draftEmailCreated: boolean }> {
  return withTransaction(async (connection) => {
    const [applications] = await connection.execute<
      (RowDataPacket & {
        id: string;
        position_id: string;
        current_stage_id: string;
        version: number;
        candidate_id: string;
        candidate_email: string | null;
        candidate_name: string;
        position_title: string;
        position_locale: "en" | "fa";
      })[]
    >(
      `SELECT a.id, a.position_id, a.current_stage_id, a.version, a.candidate_id,
              c.email AS candidate_email, c.display_name AS candidate_name,
              p.title AS position_title, p.default_locale AS position_locale
         FROM applications a
         JOIN candidates c
           ON c.id = a.candidate_id
          AND c.organization_id = a.organization_id
         JOIN positions p
           ON p.id = a.position_id
          AND p.organization_id = a.organization_id
        WHERE a.id = ? AND a.organization_id = ? AND a.state <> 'archived'
          AND (
            ? IN ('owner', 'admin', 'recruiter') OR EXISTS (
              SELECT 1
                FROM position_memberships access
               WHERE access.organization_id = a.organization_id
                 AND access.position_id = a.position_id
                 AND access.user_id = ?
                 AND COALESCE(access.role_override, ?) IN ('recruiter', 'hiring_manager')
            )
          )
        FOR UPDATE`,
      [
        command.applicationId,
        session.organizationId,
        session.role,
        session.userId,
        session.role,
      ],
    );
    const application = applications[0];
    if (!application) throw new Error("APPLICATION_NOT_FOUND");

    const [existingTransitions] = await connection.execute<
      (RowDataPacket & {
        application_id: string;
        to_stage_id: string;
        reason: string;
        expected_version: number;
        resulting_version: number;
        draft_email_created: number;
      })[]
    >(
      `SELECT t.application_id, t.to_stage_id, t.reason, t.expected_version,
              t.resulting_version,
              EXISTS(
                SELECT 1 FROM email_outbox o
                 WHERE o.organization_id = t.organization_id
                   AND o.idempotency_key = CONCAT('transition:', t.id, ':interview-draft')
              ) AS draft_email_created
         FROM application_stage_transitions t
        WHERE t.organization_id = ? AND t.idempotency_key = ?
        LIMIT 1`,
      [session.organizationId, command.idempotencyKey],
    );
    const existingTransition = existingTransitions[0];
    if (existingTransition) {
      if (
        existingTransition.application_id !== application.id ||
        existingTransition.to_stage_id !== command.toStageId ||
        existingTransition.reason !== command.reason ||
        Number(existingTransition.expected_version) !== command.expectedVersion
      ) {
        throw new WorkspaceConflictError("IDEMPOTENCY_KEY_REUSED");
      }
      return {
        version: Number(existingTransition.resulting_version),
        draftEmailCreated: Boolean(existingTransition.draft_email_created),
      };
    }

    if (Number(application.version) !== command.expectedVersion) {
      throw new WorkspaceConflictError("APPLICATION_VERSION_CONFLICT");
    }

    const [stages] = await connection.execute<
      (RowDataPacket & { id: string; stage_key: string; name_en: string; kind: string })[]
    >(
      `SELECT id, stage_key, name_en, kind
         FROM pipeline_stages
        WHERE id = ? AND organization_id = ? AND position_id = ?
          AND archived_at IS NULL
        LIMIT 1`,
      [command.toStageId, session.organizationId, application.position_id],
    );
    const targetStage = stages[0];
    if (!targetStage) throw new Error("INVALID_PIPELINE_STAGE");
    if (targetStage.id === application.current_stage_id) {
      throw new WorkspaceConflictError("APPLICATION_ALREADY_IN_STAGE");
    }

    const transitionId = randomUUID();
    try {
      await connection.execute(
        `INSERT INTO application_stage_transitions
          (id, organization_id, position_id, application_id, from_stage_id,
           to_stage_id, actor_id, reason, source, idempotency_key,
           expected_version, resulting_version, occurred_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'human', ?, ?, ?, UTC_TIMESTAMP(3))`,
        [
          transitionId,
          session.organizationId,
          application.position_id,
          application.id,
          application.current_stage_id,
          targetStage.id,
          session.userId,
          command.reason,
          command.idempotencyKey,
          command.expectedVersion,
          command.expectedVersion + 1,
        ],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
        throw new WorkspaceConflictError("IDEMPOTENCY_KEY_REUSED");
      }
      throw error;
    }

    const [update] = await connection.execute<ResultSetHeader>(
      `UPDATE applications
          SET current_stage_id = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3),
              state = CASE WHEN ? = 'hired' THEN 'hired' WHEN ? = 'rejected' THEN 'rejected' ELSE 'active' END
        WHERE id = ? AND organization_id = ? AND position_id = ? AND version = ?`,
      [targetStage.id, targetStage.kind, targetStage.kind, application.id, session.organizationId, application.position_id, command.expectedVersion],
    );
    if (update.affectedRows !== 1) throw new WorkspaceConflictError("APPLICATION_VERSION_CONFLICT");

    let draftEmailCreated = false;
    if (targetStage.kind === "interview" && application.candidate_email) {
      const [templates] = await connection.execute<(RowDataPacket & { id: string; subject: string; body_text: string })[]>(
        `SELECT tv.id, tv.subject, tv.body_text
           FROM email_template_versions tv
           JOIN email_templates t
             ON t.organization_id = tv.organization_id
            AND t.id = tv.template_id
          WHERE tv.organization_id = ? AND t.template_key = 'interview_invite'
            AND tv.status = 'active' AND tv.locale = ?
          ORDER BY tv.version DESC LIMIT 1`,
        [session.organizationId, application.position_locale],
      );
      const template = templates[0];
      if (template) {
        const subject = template.subject.replaceAll("{{position_title}}", application.position_title);
        const body = template.body_text
          .replaceAll("{{candidate_name}}", application.candidate_name)
          .replaceAll("{{position_title}}", application.position_title);
        await connection.execute(
          `INSERT INTO email_outbox
            (id, organization_id, application_id, template_version_id, recipient,
             subject, body_text, status, requires_approval, idempotency_key,
             available_at, created_by, created_at, updated_at)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, 'draft', 1, ?, UTC_TIMESTAMP(3), ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
          [session.organizationId, application.id, template.id, application.candidate_email, subject, body, `transition:${transitionId}:interview-draft`, session.userId],
        );
        draftEmailCreated = true;
      }
    }

    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, position_id, application_id, source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'application.stage_changed', 'application', ?, ?, ?, ?, 'api', ?, UTC_TIMESTAMP(3))`,
      [session.organizationId, session.userId, application.id, `${application.candidate_name} → ${targetStage.name_en}`, application.position_id, application.id, JSON.stringify({ fromStageId: application.current_stage_id, toStageId: targetStage.id, reason: command.reason, draftEmailCreated })],
    );

    return { version: command.expectedVersion + 1, draftEmailCreated };
  });
}

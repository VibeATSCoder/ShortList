import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import type {
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from "mysql2/promise";

import { execute, queryRows, withTransaction } from "@/lib/db";
import type { WorkspaceSession } from "@/lib/workspace-types";

const EMAIL_LEASE_SECONDS = 120;
const MAX_EMAIL_ATTEMPTS = 5;
const RESERVED_VARIABLES = new Set([
  "candidate_name",
  "position_title",
  "sender_name",
]);
const CANDIDATE_TEMPLATE_VARIABLES = new Set([
  ...RESERVED_VARIABLES,
  "scheduling_url",
  "next_update_date",
]);

interface CandidateEmailRow extends RowDataPacket {
  application_id: string;
  position_id: string;
  candidate_name: string;
  candidate_email: string | null;
  position_title: string;
  template_version_id: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  allowed_variables_json: string;
}

interface OutboxRow extends RowDataPacket {
  id: string;
  application_id: string | null;
  template_version_id: string | null;
  recipient: string;
  subject: string;
  body_text: string;
  body_html: string | null;
  status: string;
  attempts: number;
  requires_approval: number;
  approved_by: string | null;
  lease_until: Date | string | null;
}

export interface PreparedEmail {
  outboxId: string;
  to: string;
  subject: string;
  text: string;
  html: string | undefined;
  alreadySent: boolean;
  inProgress: boolean;
  leaseToken: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function render(template: string, values: Record<string, string>, escape: boolean): string {
  return template.replace(/\{\{([a-z_]+)\}\}/g, (token, key: string) => {
    if (!(key in values)) return token;
    return escape ? escapeHtml(values[key]) : values[key];
  });
}

function templateVariables(...templates: Array<string | null>): Set<string> {
  const variables = new Set<string>();
  for (const template of templates) {
    for (const match of template?.matchAll(/\{\{([a-z_]+)\}\}/g) ?? []) {
      variables.add(match[1]);
    }
  }
  return variables;
}

function parseAllowedVariables(value: string): Set<string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("TEMPLATE_VARIABLE_POLICY_INVALID");
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (item) => typeof item === "string" && /^[a-z_]+$/.test(item),
    )
  ) {
    throw new Error("TEMPLATE_VARIABLE_POLICY_INVALID");
  }
  return new Set(parsed);
}

function validateExternalVariables(variables: Record<string, string>): void {
  for (const [key, value] of Object.entries(variables)) {
    if (!/^[a-z_]+$/.test(key) || value.length > 500) {
      throw new Error("TEMPLATE_VARIABLE_NOT_ALLOWED");
    }
    if (RESERVED_VARIABLES.has(key)) {
      throw new Error("TEMPLATE_VARIABLE_NOT_ALLOWED");
    }
    if (key.endsWith("_url")) {
      try {
        const url = new URL(value);
        if (url.protocol !== "https:") throw new Error("unsafe protocol");
      } catch {
        throw new Error("TEMPLATE_URL_INVALID");
      }
    }
    if (
      key.endsWith("_date") &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(`${value}T00:00:00Z`)))
    ) {
      throw new Error("TEMPLATE_VARIABLE_NOT_ALLOWED");
    }
  }
}

function preparedFromRow(
  row: OutboxRow,
  state: "claimed" | "sent" | "in-progress",
  leaseToken: string | null = null,
): PreparedEmail {
  return {
    outboxId: row.id,
    to: row.recipient,
    subject: row.subject,
    text: row.body_text,
    html: row.body_html ?? undefined,
    alreadySent: state === "sent",
    inProgress: state === "in-progress",
    leaseToken,
  };
}

function assertSameIdempotentCommand(
  row: OutboxRow,
  input: { applicationId: string; templateVersionId: string },
): void {
  if (
    row.application_id !== input.applicationId ||
    row.template_version_id !== input.templateVersionId
  ) {
    throw new Error("IDEMPOTENCY_KEY_REUSED");
  }
}

async function claimExistingOutbox(
  connection: PoolConnection,
  row: OutboxRow,
  input: { applicationId: string; templateVersionId: string },
): Promise<PreparedEmail> {
  assertSameIdempotentCommand(row, input);
  if (Boolean(row.requires_approval) && !row.approved_by) {
    throw new Error("EMAIL_APPROVAL_REQUIRED");
  }
  if (row.status === "sent") return preparedFromRow(row, "sent");

  const leaseIsActive =
    row.status === "sending" &&
    row.lease_until !== null &&
    new Date(row.lease_until).getTime() > Date.now();
  if (leaseIsActive) return preparedFromRow(row, "in-progress");
  if (["draft", "canceled", "dead"].includes(row.status)) {
    throw new Error("EMAIL_NOT_SENDABLE");
  }
  if (Number(row.attempts) >= MAX_EMAIL_ATTEMPTS) {
    await connection.execute(
      `UPDATE email_outbox
          SET status = 'dead', lease_until = NULL, lease_token = NULL,
              updated_at = UTC_TIMESTAMP(3)
        WHERE id = ?`,
      [row.id],
    );
    throw new Error("EMAIL_ATTEMPTS_EXHAUSTED");
  }

  const leaseToken = randomBytes(32).toString("hex");
  await connection.execute(
    `UPDATE email_outbox
        SET status = 'sending', attempts = attempts + 1,
            lease_until = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND),
            lease_token = ?, last_error_code = NULL,
            updated_at = UTC_TIMESTAMP(3)
      WHERE id = ?`,
    [EMAIL_LEASE_SECONDS, leaseToken, row.id],
  );
  return preparedFromRow(row, "claimed", leaseToken);
}

export async function prepareCandidateEmail(
  session: WorkspaceSession,
  input: {
    applicationId: string;
    templateVersionId: string;
    variables: Record<string, string>;
    idempotencyKey: string;
  },
): Promise<PreparedEmail> {
  return withTransaction(async (connection) => {
    const [existingRows] = await connection.execute<OutboxRow[]>(
      `SELECT o.id, o.application_id, o.template_version_id, o.recipient,
              o.subject, o.body_text, o.body_html, o.status, o.attempts,
              o.requires_approval, o.approved_by, o.lease_until
         FROM email_outbox o
         JOIN applications a
           ON a.organization_id = o.organization_id
          AND a.id = o.application_id
        WHERE o.organization_id = ? AND o.idempotency_key = ?
          AND (
            ? IN ('owner', 'admin', 'recruiter') OR EXISTS (
              SELECT 1
                FROM position_memberships access
               WHERE access.organization_id = a.organization_id
                 AND access.position_id = a.position_id
                 AND access.user_id = ?
                 AND COALESCE(access.role_override, ?) = 'recruiter'
            )
          )
        LIMIT 1
        FOR UPDATE`,
      [
        session.organizationId,
        input.idempotencyKey,
        session.role,
        session.userId,
        session.role,
      ],
    );
    if (existingRows[0]) {
      return claimExistingOutbox(connection, existingRows[0], input);
    }

    const [rows] = await connection.execute<CandidateEmailRow[]>(
      `SELECT a.id AS application_id, a.position_id,
              c.display_name AS candidate_name, c.email AS candidate_email,
              p.title AS position_title, tv.id AS template_version_id,
              tv.subject, tv.body_text, tv.body_html,
              tv.allowed_variables_json
         FROM applications a
         JOIN candidates c
           ON c.id = a.candidate_id
          AND c.organization_id = a.organization_id
         JOIN positions p
           ON p.id = a.position_id
          AND p.organization_id = a.organization_id
         JOIN email_template_versions tv
           ON tv.organization_id = a.organization_id
          AND tv.id = ? AND tv.status = 'active'
         JOIN email_templates t
           ON t.organization_id = tv.organization_id
          AND t.id = tv.template_id
        WHERE a.id = ? AND a.organization_id = ? AND a.state <> 'archived'
          AND (
            ? IN ('owner', 'admin', 'recruiter') OR EXISTS (
              SELECT 1
                FROM position_memberships access
               WHERE access.organization_id = a.organization_id
                 AND access.position_id = a.position_id
                 AND access.user_id = ?
                 AND COALESCE(access.role_override, ?) = 'recruiter'
            )
          )
        LIMIT 1`,
      [
        input.templateVersionId,
        input.applicationId,
        session.organizationId,
        session.role,
        session.userId,
        session.role,
      ],
    );
    const row = rows[0];
    if (!row) throw new Error("EMAIL_CONTEXT_NOT_FOUND");
    if (
      !row.candidate_email ||
      row.candidate_email.length > 254 ||
      /[\r\n]/.test(row.candidate_email) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.candidate_email)
    ) {
      throw new Error("CANDIDATE_EMAIL_MISSING");
    }

    validateExternalVariables(input.variables);
    const allowed = parseAllowedVariables(row.allowed_variables_json);
    for (const key of allowed) {
      if (!CANDIDATE_TEMPLATE_VARIABLES.has(key)) {
        throw new Error("TEMPLATE_VARIABLE_POLICY_INVALID");
      }
    }
    for (const key of Object.keys(input.variables)) {
      if (!allowed.has(key)) throw new Error("TEMPLATE_VARIABLE_NOT_ALLOWED");
    }
    for (const key of templateVariables(row.subject, row.body_text, row.body_html)) {
      if (!allowed.has(key)) throw new Error("TEMPLATE_VARIABLE_POLICY_INVALID");
    }

    const variables: Record<string, string> = {
      ...input.variables,
      candidate_name: row.candidate_name,
      position_title: row.position_title,
      sender_name: session.name,
    };
    const subject = render(row.subject, variables, false)
      .replace(/[\r\n]+/g, " ")
      .trim();
    const text = render(row.body_text, variables, false);
    const html = row.body_html ? render(row.body_html, variables, true) : undefined;
    if (!subject || subject.length > 255) throw new Error("EMAIL_SUBJECT_INVALID");
    if (/\{\{[a-z_]+\}\}/.test(`${subject}\n${text}\n${html ?? ""}`)) {
      throw new Error("TEMPLATE_VARIABLE_MISSING");
    }

    const outboxId = randomUUID();
    const leaseToken = randomBytes(32).toString("hex");
    await connection.execute(
      `INSERT INTO email_outbox
        (id, organization_id, application_id, template_version_id, recipient,
         subject, body_text, body_html, status, requires_approval, approved_by,
         approved_at, idempotency_key, attempts, available_at, lease_until,
         lease_token, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sending', 1, ?, UTC_TIMESTAMP(3), ?, 1,
               UTC_TIMESTAMP(3), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND),
               ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
       ON DUPLICATE KEY UPDATE id = email_outbox.id`,
      [
        outboxId,
        session.organizationId,
        row.application_id,
        row.template_version_id,
        row.candidate_email,
        subject,
        text,
        html ?? null,
        session.userId,
        input.idempotencyKey,
        EMAIL_LEASE_SECONDS,
        leaseToken,
        session.userId,
      ],
    );

    const [storedRows] = await connection.execute<OutboxRow[]>(
      `SELECT o.id, o.application_id, o.template_version_id, o.recipient,
              o.subject, o.body_text, o.body_html, o.status, o.attempts,
              o.requires_approval, o.approved_by, o.lease_until
         FROM email_outbox o
         JOIN applications a
           ON a.organization_id = o.organization_id
          AND a.id = o.application_id
        WHERE o.organization_id = ? AND o.idempotency_key = ?
          AND (
            ? IN ('owner', 'admin', 'recruiter') OR EXISTS (
              SELECT 1
                FROM position_memberships access
               WHERE access.organization_id = a.organization_id
                 AND access.position_id = a.position_id
                 AND access.user_id = ?
                 AND COALESCE(access.role_override, ?) = 'recruiter'
            )
          )
        LIMIT 1
        FOR UPDATE`,
      [
        session.organizationId,
        input.idempotencyKey,
        session.role,
        session.userId,
        session.role,
      ],
    );
    const stored = storedRows[0];
    if (!stored) throw new Error("EMAIL_OUTBOX_CREATE_FAILED");
    if (stored.id !== outboxId) {
      return claimExistingOutbox(connection, stored, input);
    }

    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, position_id, application_id, source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'email.approved', 'email_outbox', ?, ?, ?, ?, 'api', ?, UTC_TIMESTAMP(3))`,
      [
        session.organizationId,
        session.userId,
        outboxId,
        subject,
        row.position_id,
        row.application_id,
        JSON.stringify({ templateVersionId: row.template_version_id }),
      ],
    );
    return {
      outboxId,
      to: row.candidate_email,
      subject,
      text,
      html,
      alreadySent: false,
      inProgress: false,
      leaseToken,
    };
  });
}

export async function markEmailSent(
  session: WorkspaceSession,
  prepared: PreparedEmail,
  providerMessageId: string,
): Promise<void> {
  if (!prepared.leaseToken) throw new Error("EMAIL_LEASE_MISSING");
  await withTransaction(async (connection) => {
    const [result] = await connection.execute<ResultSetHeader>(
      `UPDATE email_outbox
          SET status = 'sent', lease_until = NULL, lease_token = NULL,
              last_error_code = NULL, updated_at = UTC_TIMESTAMP(3)
        WHERE id = ? AND organization_id = ? AND status = 'sending'
          AND lease_token = ?`,
      [prepared.outboxId, session.organizationId, prepared.leaseToken],
    );
    if (!result.affectedRows) {
      const [rows] = await connection.execute<(RowDataPacket & { status: string })[]>(
        "SELECT status FROM email_outbox WHERE id = ? AND organization_id = ? LIMIT 1",
        [prepared.outboxId, session.organizationId],
      );
      if (rows[0]?.status === "sent") return;
      throw new Error("EMAIL_LEASE_LOST");
    }
    await connection.execute(
      `INSERT INTO email_deliveries
        (id, organization_id, outbox_id, provider, provider_message_id, status, occurred_at)
       VALUES (UUID(), ?, ?, 'cpanel-smtp', ?, 'sent', UTC_TIMESTAMP(3))`,
      [session.organizationId, prepared.outboxId, providerMessageId],
    );
    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'email.sent', 'email_outbox', ?, ?, 'api', '{}', UTC_TIMESTAMP(3))`,
      [session.organizationId, session.userId, prepared.outboxId, prepared.subject],
    );
  });
}

export async function markEmailFailed(
  prepared: PreparedEmail,
  organizationId: string,
  code: string,
): Promise<void> {
  if (!prepared.leaseToken) return;
  await execute(
    `UPDATE email_outbox
        SET status = 'failed', lease_until = NULL, lease_token = NULL,
            last_error_code = ?, updated_at = UTC_TIMESTAMP(3)
      WHERE id = ? AND organization_id = ? AND status = 'sending'
        AND lease_token = ?`,
    [
      code.replace(/[\r\n]/g, " ").slice(0, 80),
      prepared.outboxId,
      organizationId,
      prepared.leaseToken,
    ],
  );
}

export async function outboxStatus(
  organizationId: string,
  outboxId: string,
): Promise<string | null> {
  const rows = await queryRows<RowDataPacket & { status: string }>(
    "SELECT status FROM email_outbox WHERE id = ? AND organization_id = ? LIMIT 1",
    [outboxId, organizationId],
  );
  return rows[0]?.status ?? null;
}

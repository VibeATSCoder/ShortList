import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { queryRows, withTransaction } from "@/lib/db";
import { configuredRecipientAllowlist } from "@/lib/reviews";
import type { WorkspaceSession } from "@/lib/workspace-types";

interface ReviewerRow extends RowDataPacket {
  id: string;
  name: string;
  email: string;
}

export interface ReviewerContact {
  id: string | null;
  name: string;
  email: string;
  source: "directory" | "configured";
}

function displayNameForEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || email;
}

export async function listReviewerContacts(session: WorkspaceSession): Promise<ReviewerContact[]> {
  const rows = await queryRows<ReviewerRow>(
    `SELECT id, name, email
       FROM reviewer_contacts
      WHERE organization_id = ? AND status = 'active'
      ORDER BY CASE WHEN name = '' THEN 1 ELSE 0 END, name, email`,
    [session.organizationId],
  );
  const contacts = new Map<string, ReviewerContact>();
  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    contacts.set(email, {
      id: row.id,
      name: row.name.trim() || displayNameForEmail(email),
      email,
      source: "directory",
    });
  }
  for (const email of configuredRecipientAllowlist()) {
    if (!contacts.has(email)) {
      contacts.set(email, {
        id: null,
        name: displayNameForEmail(email),
        email,
        source: "configured",
      });
    }
  }
  return [...contacts.values()].sort((left, right) =>
    left.name.localeCompare(right.name) || left.email.localeCompare(right.email),
  );
}

export async function addReviewerContact(
  session: WorkspaceSession,
  input: { name: string; email: string },
): Promise<ReviewerContact> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim() || displayNameForEmail(email);
  await withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO reviewer_contacts
        (id, organization_id, name, email, status, added_by, created_at, updated_at)
       VALUES (UUID(), ?, ?, ?, 'active', ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
       ON CONFLICT DO NOTHING`,
      [session.organizationId, name, email, session.userId],
    );
    await connection.execute(
      `UPDATE reviewer_contacts
          SET name = ?, status = 'active', updated_at = UTC_TIMESTAMP(3)
        WHERE organization_id = ? AND LOWER(email) = LOWER(?)`,
      [name, session.organizationId, email],
    );
    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'reviewer.added', 'reviewer_contact', ?, ?, 'ui', '{}', UTC_TIMESTAMP(3))`,
      [session.organizationId, session.userId, email, email],
    );
  });

  const rows = await queryRows<ReviewerRow>(
    `SELECT id, name, email FROM reviewer_contacts
      WHERE organization_id = ? AND LOWER(email) = LOWER(?) AND status = 'active' LIMIT 1`,
    [session.organizationId, email],
  );
  const reviewer = rows[0];
  if (!reviewer) throw new Error("REVIEWER_NOT_SAVED");
  return { id: reviewer.id, name: reviewer.name, email: reviewer.email.toLowerCase(), source: "directory" };
}

export async function reviewerRecipientsAreAllowed(
  session: WorkspaceSession,
  recipients: string[],
): Promise<boolean> {
  if (!recipients.length) return true;
  const allowed = new Set((await listReviewerContacts(session)).map((reviewer) => reviewer.email));
  return recipients.every((email) => allowed.has(email.trim().toLowerCase()));
}

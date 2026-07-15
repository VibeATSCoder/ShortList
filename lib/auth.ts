import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { databaseConfigured, execute, queryRows, withTransaction } from "@/lib/db";
import type { OrganizationRole, WorkspaceSession } from "@/lib/workspace-types";

export const SESSION_COOKIE = "shortlist_session";
export const CSRF_COOKIE = "shortlist_csrf";
const SESSION_DAYS = 7;
const IDLE_HOURS = 12;

interface SessionRow extends RowDataPacket {
  session_id: string;
  user_id: string;
  organization_id: string;
  name: string;
  email: string;
  role: OrganizationRole;
  expires_at: Date | string;
  idle_expires_at: Date | string;
  revoked_at: Date | string | null;
  csrf_token_hash: string;
}

interface LoginRow extends RowDataPacket {
  user_id: string;
  organization_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: OrganizationRole;
  status: string;
}

interface AuthenticatedUser {
  user_id: string;
  organization_id: string;
  name: string;
  email: string;
  role: OrganizationRole;
}

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("SESSION_SECRET_NOT_CONFIGURED");
  }
  return secret;
}

function tokenDigest(token: string, purpose: "session" | "csrf" | "ip" | "user-agent"): string {
  return createHmac("sha256", sessionSecret())
    .update(purpose)
    .update("\0")
    .update(token)
    .digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(`${value}Z`.replace("ZZ", "Z")).toISOString();
}

export function authConfigured(): boolean {
  return databaseConfigured() && Buffer.byteLength(process.env.SESSION_SECRET ?? "", "utf8") >= 32;
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  if (!authConfigured()) return null;
  const rows = await queryRows<LoginRow>(
    `SELECT u.id AS user_id, m.organization_id, u.name, u.email,
            u.password_hash, m.role, u.status
       FROM users u
       JOIN organization_memberships m ON m.user_id = u.id
      WHERE u.email = ? AND u.status = 'active' AND m.status = 'active'
      ORDER BY m.created_at ASC
      LIMIT 1`,
    [email.trim().toLowerCase()],
  );
  const user = rows[0];
  if (!user || !(await compare(password, user.password_hash))) return null;
  return {
    user_id: user.user_id,
    organization_id: user.organization_id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function createUserSession(
  user: AuthenticatedUser,
  response: NextResponse,
  request: NextRequest,
): Promise<void> {
  const rawToken = randomBytes(32).toString("base64url");
  const csrfToken = randomBytes(24).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  const idleExpiresAt = new Date(now.getTime() + IDLE_HOURS * 3_600_000);

  await withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO sessions
        (id, user_id, organization_id, token_hash, csrf_token_hash, ip_hash,
         user_agent_hash, created_at, last_seen_at, idle_expires_at, expires_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3), ?, ?)`,
      [
        user.user_id,
        user.organization_id,
        tokenDigest(rawToken, "session"),
        tokenDigest(csrfToken, "csrf"),
        tokenDigest(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown", "ip"),
        tokenDigest(request.headers.get("user-agent") ?? "unknown", "user-agent"),
        idleExpiresAt,
        expiresAt,
      ],
    );
    await connection.execute(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         source, metadata_json, occurred_at)
       VALUES (UUID(), ?, 'user', ?, 'auth.login', 'session', ?, 'api', '{}', UTC_TIMESTAMP(3))`,
      [user.organization_id, user.user_id, tokenDigest(rawToken, "session").slice(0, 16)],
    );
  });

  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
  response.cookies.set(CSRF_COOKIE, csrfToken, {
    httpOnly: false,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

async function sessionFromToken(rawToken: string | undefined): Promise<WorkspaceSession | null> {
  if (!rawToken || !authConfigured()) return null;
  const rows = await queryRows<SessionRow>(
    `SELECT s.id AS session_id, s.user_id, s.organization_id, u.name, u.email,
            m.role, s.expires_at, s.idle_expires_at, s.revoked_at, s.csrf_token_hash
       FROM sessions s
       JOIN users u ON u.id = s.user_id AND u.status = 'active'
       JOIN organization_memberships m
         ON m.organization_id = s.organization_id AND m.user_id = s.user_id AND m.status = 'active'
      WHERE s.token_hash = ?
      LIMIT 1`,
    [tokenDigest(rawToken, "session")],
  );
  const row = rows[0];
  const now = Date.now();
  if (
    !row ||
    row.revoked_at ||
    new Date(row.expires_at).getTime() <= now ||
    new Date(row.idle_expires_at).getTime() <= now
  ) {
    return null;
  }

  await execute(
    `UPDATE sessions
        SET last_seen_at = UTC_TIMESTAMP(3),
            idle_expires_at = LEAST(expires_at, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? HOUR))
      WHERE id = ? AND last_seen_at < DATE_SUB(UTC_TIMESTAMP(3), INTERVAL 5 MINUTE)`,
    [IDLE_HOURS, row.session_id],
  ).catch(() => undefined);

  return {
    userId: row.user_id,
    organizationId: row.organization_id,
    name: row.name,
    email: row.email,
    role: row.role,
    expiresAt: iso(row.expires_at),
  };
}

export async function currentSession(): Promise<WorkspaceSession | null> {
  const store = await cookies();
  return sessionFromToken(store.get(SESSION_COOKIE)?.value);
}

export async function requestSession(request: NextRequest): Promise<WorkspaceSession | null> {
  return sessionFromToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export async function revokeSession(request: NextRequest): Promise<void> {
  const rawToken = request.cookies.get(SESSION_COOKIE)?.value;
  if (!rawToken || !authConfigured()) return;
  await execute(
    "UPDATE sessions SET revoked_at = UTC_TIMESTAMP(3) WHERE token_hash = ? AND revoked_at IS NULL",
    [tokenDigest(rawToken, "session")],
  );
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, maxAge: 0, path: "/" });
  response.cookies.set(CSRF_COOKIE, "", { httpOnly: false, maxAge: 0, path: "/" });
}

export async function validCsrf(request: NextRequest): Promise<boolean> {
  const rawSession = request.cookies.get(SESSION_COOKIE)?.value;
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!rawSession || !cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) return false;
  const rows = await queryRows<SessionRow>(
    `SELECT csrf_token_hash
       FROM sessions
      WHERE token_hash = ? AND revoked_at IS NULL
        AND expires_at > UTC_TIMESTAMP(3) AND idle_expires_at > UTC_TIMESTAMP(3)
      LIMIT 1`,
    [tokenDigest(rawSession, "session")],
  );
  return Boolean(rows[0] && safeEqual(rows[0].csrf_token_hash, tokenDigest(cookieToken, "csrf")));
}

export const ROLE_PERMISSIONS: Record<OrganizationRole, ReadonlySet<string>> = {
  owner: new Set(["*"]),
  admin: new Set(["position.manage", "candidate.read", "candidate.identity", "application.move", "assessment.run", "review.request", "reviewer.manage", "template.manage", "automation.manage", "audit.read", "team.manage", "email.send"]),
  recruiter: new Set(["position.manage", "candidate.read", "candidate.identity", "application.move", "assessment.run", "review.request", "reviewer.manage", "template.manage", "automation.manage", "audit.read", "email.send"]),
  hiring_manager: new Set(["candidate.read", "candidate.identity", "application.move", "review.request", "audit.read"]),
  interviewer: new Set(["candidate.read", "review.request"]),
  viewer: new Set(["candidate.read"]),
};

export function can(session: WorkspaceSession, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[session.role];
  return permissions.has("*") || permissions.has(permission);
}

const ALL_POSITION_ROLES = new Set<OrganizationRole>(["owner", "admin", "recruiter"]);

interface PositionAccessRow extends RowDataPacket {
  role_override: OrganizationRole | null;
  identity_access: number;
}

async function positionAccessRow(
  session: WorkspaceSession,
  positionId: string,
): Promise<PositionAccessRow | null> {
  const rows = await queryRows<PositionAccessRow>(
    `SELECT pm.role_override,
            CASE
              WHEN pm.id IS NOT NULL THEN pm.identity_access
              ELSE m.identity_access
            END AS identity_access
       FROM organization_memberships m
       JOIN positions p
         ON p.organization_id = m.organization_id
        AND p.id = ?
        AND p.status <> 'archived'
       LEFT JOIN position_memberships pm
         ON pm.organization_id = m.organization_id
        AND pm.user_id = m.user_id
        AND pm.position_id = p.id
      WHERE m.organization_id = ? AND m.user_id = ? AND m.status = 'active'
      LIMIT 1`,
    [positionId, session.organizationId, session.userId],
  );
  const row = rows[0];
  if (!row) return null;
  if (!ALL_POSITION_ROLES.has(session.role) && row.role_override === null) return null;
  return row;
}

export async function canForPosition(
  session: WorkspaceSession,
  positionId: string,
  permission: string,
): Promise<boolean> {
  const access = await positionAccessRow(session, positionId);
  if (!access) return false;
  const effectiveRole = access.role_override ?? session.role;
  const permissions = ROLE_PERMISSIONS[effectiveRole];
  return permissions.has("*") || permissions.has(permission);
}

export async function canReadPositionIdentity(
  session: WorkspaceSession,
  positionId: string,
): Promise<boolean> {
  const access = await positionAccessRow(session, positionId);
  return Boolean(access?.identity_access);
}

export function hasOrganizationWidePositionAccess(session: WorkspaceSession): boolean {
  return ALL_POSITION_ROLES.has(session.role);
}

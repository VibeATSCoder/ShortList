import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { can, requestSession, validCsrf } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { demoWorkspaceSnapshot } from "@/lib/workspace-demo";
import { createPosition, loadWorkspace } from "@/lib/workspace-repository";
import { isSameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const createPositionSchema = z.object({
  title: z.string().trim().min(2).max(180),
  department: z.string().trim().max(140).default(""),
  location: z.string().trim().max(180).default(""),
  employmentType: z.string().trim().max(80).default(""),
  description: z.string().trim().min(80).max(20_000),
  defaultLocale: z.enum(["en", "fa"]).default("en"),
});

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const positionId = request.nextUrl.searchParams.get("positionId") ?? undefined;
  if (!databaseConfigured()) {
    return NextResponse.json(demoWorkspaceSnapshot(positionId), { headers: { "Cache-Control": "no-store" } });
  }
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to open the recruiter workspace.");
  try {
    return NextResponse.json(await loadWorkspace(session, positionId), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "PLAN_POSITION_LIMIT") {
      return apiError(403, "PLAN_POSITION_LIMIT", "Your plan has reached its active-position limit.");
    }
    if (error instanceof Error && error.message === "WORKSPACE_HAS_NO_POSITIONS") {
      return apiError(409, "WORKSPACE_EMPTY", "Create the first position to continue.");
    }
    console.error("workspace_load_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "WORKSPACE_LOAD_FAILED", "The workspace could not be loaded.");
  }
}

export async function POST(request: NextRequest) {
  if (!databaseConfigured()) return apiError(503, "DEMO_READ_ONLY", "Connect cPanel MySQL to save positions.");
  if (!isSameOrigin(request) || !(await validCsrf(request))) return apiError(403, "INVALID_CSRF", "Refresh and try again.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Position requests must use application/json.");
  }
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
  if (!can(session, "position.manage")) return apiError(403, "FORBIDDEN", "You cannot create positions.");
  const parsed = createPositionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_POSITION", parsed.error.issues[0]?.message ?? "Check the position fields.");
  try {
    const result = await createPosition(session, parsed.data);
    return NextResponse.json({ ok: true, ...result }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("position_create_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "POSITION_CREATE_FAILED", "The position could not be created.");
  }
}

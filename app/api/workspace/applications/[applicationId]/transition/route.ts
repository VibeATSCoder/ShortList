import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requestSession, validCsrf } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import { transitionApplication, WorkspaceConflictError } from "@/lib/workspace-repository";

export const dynamic = "force-dynamic";

const transitionSchema = z.object({
  toStageId: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  reason: z.string().trim().min(3).max(500),
  idempotencyKey: z.string().trim().min(16).max(160),
});

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  if (!isSameOrigin(request) || !(await validCsrf(request))) return apiError(403, "INVALID_CSRF", "Refresh and try again.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Transition requests must use application/json.");
  }
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const parsed = transitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_TRANSITION", parsed.error.issues[0]?.message ?? "Check the transition.");
  const { applicationId } = await context.params;
  if (!z.string().uuid().safeParse(applicationId).success) return apiError(404, "APPLICATION_NOT_FOUND", "Application not found.");
  try {
    const result = await transitionApplication(session, { applicationId, ...parsed.data });
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceConflictError) return apiError(409, error.message, "This application changed. Refresh before moving it again.");
    if (error instanceof Error && error.message === "APPLICATION_NOT_FOUND") return apiError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    if (error instanceof Error && error.message === "INVALID_PIPELINE_STAGE") return apiError(400, "INVALID_PIPELINE_STAGE", "Choose an active stage in this position.");
    console.error("application_transition_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "TRANSITION_FAILED", "The candidate could not be moved.");
  }
}

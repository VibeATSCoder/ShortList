import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requestSession, validCsrf } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import { deleteApplication, WorkspaceConflictError } from "@/lib/workspace-repository";

export const dynamic = "force-dynamic";

const deleteSchema = z.object({ expectedVersion: z.number().int().min(1) });

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  if (!isSameOrigin(request) || !(await validCsrf(request))) return apiError(403, "INVALID_CSRF", "Refresh and try again.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Delete requests must use application/json.");
  }
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_DELETE", "Refresh the candidate and try again.");
  const { applicationId } = await context.params;
  if (!z.string().uuid().safeParse(applicationId).success) return apiError(404, "APPLICATION_NOT_FOUND", "Application not found.");

  try {
    await deleteApplication(session, applicationId, parsed.data.expectedVersion);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof WorkspaceConflictError) return apiError(409, error.message, "This application changed. Refresh before deleting it.");
    if (error instanceof Error && error.message === "APPLICATION_DELETE_FORBIDDEN") return apiError(403, "FORBIDDEN", "Your role cannot delete applications.");
    if (error instanceof Error && error.message === "APPLICATION_NOT_FOUND") return apiError(404, "APPLICATION_NOT_FOUND", "Application not found.");
    console.error("application_delete_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "DELETE_FAILED", "The application could not be deleted.");
  }
}

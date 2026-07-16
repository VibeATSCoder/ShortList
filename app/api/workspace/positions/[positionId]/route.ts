import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requestSession, validCsrf } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import { archivePosition, WorkspaceConflictError } from "@/lib/workspace-repository";

export const dynamic = "force-dynamic";

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ positionId: string }> },
) {
  if (!isSameOrigin(request) || !(await validCsrf(request))) {
    return apiError(403, "INVALID_CSRF", "Refresh and try again.");
  }
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const { positionId } = await context.params;
  if (!z.string().uuid().safeParse(positionId).success) return apiError(404, "POSITION_NOT_FOUND", "Position not found.");

  try {
    await archivePosition(session, positionId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "PROTECTED_POSITION") {
      return apiError(409, "PROTECTED_POSITION", "The Solo AI Builder showcase position is protected.");
    }
    if (error instanceof Error && error.message === "POSITION_ARCHIVE_FORBIDDEN") {
      return apiError(403, "FORBIDDEN", "Your role cannot remove positions.");
    }
    if (error instanceof Error && error.message === "POSITION_NOT_FOUND") {
      return apiError(404, "POSITION_NOT_FOUND", "Position not found.");
    }
    if (error instanceof WorkspaceConflictError) {
      return apiError(409, error.message, "This position changed. Refresh before removing it.");
    }
    console.error("position_archive_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "POSITION_ARCHIVE_FAILED", "The position could not be removed.");
  }
}

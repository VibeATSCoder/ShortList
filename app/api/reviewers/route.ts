import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { can, requestSession, validCsrf } from "@/lib/auth";
import { addReviewerContact, listReviewerContacts } from "@/lib/reviewer-directory";
import { isSameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const reviewerSchema = z.object({
  name: z.string().trim().max(160).default(""),
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
});

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to access the reviewer directory.");
  if (!can(session, "review.request")) return apiError(403, "FORBIDDEN", "You cannot access reviewer contacts.");
  try {
    return NextResponse.json(
      {
        reviewers: await listReviewerContacts(session),
        canAdd: can(session, "reviewer.manage"),
        requesterName: session.name,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("reviewer_directory_load_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "REVIEWER_DIRECTORY_FAILED", "The reviewer directory could not be loaded.");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request) || !(await validCsrf(request))) {
    return apiError(403, "INVALID_CSRF", "Refresh and try again.");
  }
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to add a reviewer.");
  if (!can(session, "reviewer.manage")) return apiError(403, "FORBIDDEN", "You cannot add reviewer contacts.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Reviewer requests must use application/json.");
  }
  const parsed = reviewerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_REVIEWER", "Enter a valid reviewer email.");
  try {
    const reviewer = await addReviewerContact(session, parsed.data);
    return NextResponse.json({ ok: true, reviewer }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("reviewer_directory_save_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "REVIEWER_SAVE_FAILED", "The reviewer could not be saved.");
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ApplicationIntakeError, importSealedAssessment } from "@/lib/application-intake";
import { canForPosition, requestSession, validCsrf } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import { reviewCandidateSchema } from "@/lib/reviews";

export const dynamic = "force-dynamic";

const intakeSchema = z.object({
  positionId: z.string().uuid(),
  assessment: reviewCandidateSchema,
  workspaceSeal: z.string().min(80).max(2_048),
  candidateEmail: z.union([z.literal(""), z.email().max(254)]).optional(),
  source: z.string().trim().min(2).max(100).default("Direct"),
  locale: z.enum(["en", "fa"]),
});

function apiError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request) || !(await validCsrf(request))) {
    return apiError(403, "INVALID_CSRF", "Refresh and try again.");
  }
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, "INVALID_INTAKE", parsed.error.issues[0]?.message ?? "Check the candidate assessment.");
  }
  if (!(await canForPosition(session, parsed.data.positionId, "assessment.run"))) {
    return apiError(403, "FORBIDDEN", "You cannot import screened candidates for this position.");
  }
  try {
    const result = await importSealedAssessment(session, {
      ...parsed.data,
      candidateEmail: parsed.data.candidateEmail || undefined,
    });
    return NextResponse.json(
      { ok: true, ...result },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApplicationIntakeError) {
      const status = error.message === "CANDIDATE_ALREADY_APPLIED" ? 409 : error.message === "POSITION_NOT_FOUND" ? 404 : 400;
      return apiError(status, error.message, "The sealed assessment could not be added to this position.");
    }
    console.error("assessment_intake_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "ASSESSMENT_INTAKE_FAILED", "The candidate could not be added.");
  }
}

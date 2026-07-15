import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { ApplicationIntakeError, importSealedAssessment } from "@/lib/application-intake";
import { canForPosition, requestSession, validCsrf } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import { reviewCandidateSchema } from "@/lib/reviews";
import { queryRows } from "@/lib/db";
import { sendTransactionalEmail } from "@/lib/review-email";
import { validateResumeFile } from "@/lib/file-validation";

export const dynamic = "force-dynamic";

const intakeSchema = z.object({
  positionId: z.string().uuid(),
  assessment: reviewCandidateSchema,
  workspaceSeal: z.string().min(80).max(2_048),
  candidateEmail: z.union([z.literal(""), z.email().max(254)]).optional(),
  source: z.string().trim().min(2).max(100).default("Direct"),
  locale: z.enum(["en", "fa"]),
  resume: z.object({
    fileName: z.string().min(1).max(240),
    mimeType: z.string().min(1).max(120),
    dataUrl: z.string().min(1),
  }).optional(),
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
    const resume = parsed.data.resume ? validateResumeFile(parsed.data.resume) : null;
    const result = await importSealedAssessment(session, {
      positionId: parsed.data.positionId,
      assessment: parsed.data.assessment,
      workspaceSeal: parsed.data.workspaceSeal,
      candidateEmail: parsed.data.candidateEmail || undefined,
      source: parsed.data.source,
      locale: parsed.data.locale,
    });
    const notifier = (process.env.APPLICATION_NOTIFICATION_EMAIL || process.env.HR_NOTIFICATION_EMAIL)?.trim();
    let notificationSent = false;
    if (notifier && result.created) {
      const positions = await queryRows<RowDataPacket & { title: string }>(
        "SELECT title FROM positions WHERE id = ? AND organization_id = ? LIMIT 1",
        [parsed.data.positionId, session.organizationId],
      );
      const positionTitle = positions[0]?.title ?? "Position";
      const candidate = parsed.data.assessment.profile.displayName;
      const panelUrl = `${(process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "")}/workspace?positionId=${encodeURIComponent(parsed.data.positionId)}`;
      try {
        await sendTransactionalEmail({
          to: notifier,
          subject: `New screened application · ${candidate} · ${positionTitle}`,
          text: `${candidate} was AI-screened and added to ${positionTitle}.\n\nFit score: ${parsed.data.assessment.score}/100\nRecommendation: ${parsed.data.assessment.recommendation}\n\nOpen recruiter workspace: ${panelUrl}`,
          attachments: resume
            ? [{ filename: resume.fileName, content: resume.bytes, contentType: resume.mimeType }]
            : undefined,
        });
        notificationSent = true;
      } catch (error) {
        console.warn("workspace_intake_notification_failed", error instanceof Error ? error.name : "UnknownError");
      }
    }
    return NextResponse.json(
      { ok: true, ...result, notificationSent },
      { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApplicationIntakeError) {
      const status = error.message === "PLAN_CANDIDATE_LIMIT" ? 403 : error.message === "CANDIDATE_ALREADY_APPLIED" ? 409 : error.message === "POSITION_NOT_FOUND" ? 404 : 400;
      return apiError(status, error.message, "The sealed assessment could not be added to this position.");
    }
    const databaseError = error as { name?: string; code?: string; constraint?: string };
    console.error("assessment_intake_failed", {
      name: databaseError.name ?? "UnknownError",
      code: databaseError.code ?? "UNKNOWN",
      constraint: databaseError.constraint ?? "unknown",
    });
    return apiError(500, "ASSESSMENT_INTAKE_FAILED", "The candidate could not be added.");
  }
}

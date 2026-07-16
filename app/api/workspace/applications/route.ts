import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { ApplicationIntakeError, attachResumeAsset, importSealedAssessment } from "@/lib/application-intake";
import { sendApplicationNotifications } from "@/lib/application-email";
import { canForPosition, requestSession, validCsrf } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";
import { reviewCandidateSchema } from "@/lib/reviews";
import { queryRows } from "@/lib/db";
import { validateResumeFile } from "@/lib/file-validation";
import { reviewerRecipientsAreAllowed } from "@/lib/reviewer-directory";
import { isPublicDemoSession } from "@/lib/public-demo-accounts";
import { deleteReviewObject, saveWorkspaceResume } from "@/lib/review-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const intakeSchema = z.object({
  positionId: z.string().uuid(),
  assessment: reviewCandidateSchema,
  workspaceSeal: z.string().min(80).max(2_048),
  candidateEmail: z.union([z.literal(""), z.email().max(254)]).optional(),
  source: z.string().trim().min(2).max(100).default("Direct"),
  locale: z.enum(["en", "fa"]),
  reviewerEmails: z.array(z.email().max(254)).max(5).default([]),
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
  if (!(await reviewerRecipientsAreAllowed(session, parsed.data.reviewerEmails))) {
    return apiError(403, "REVIEWER_NOT_ALLOWED", "Choose reviewers from the approved reviewer directory.");
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
    let resumeStored = false;
    if (resume && result.created && result.assessmentId) {
      const assetId = randomUUID();
      const storageKey = `workspace-resumes/${session.organizationId}/${assetId}`;
      try {
        await saveWorkspaceResume(storageKey, resume.bytes, resume.mimeType);
        await attachResumeAsset(session, {
          assetId,
          applicationId: result.applicationId,
          candidateId: result.candidateId,
          assessmentId: result.assessmentId,
          storageKey,
          originalName: resume.fileName,
          contentType: resume.mimeType,
          byteSize: resume.bytes.byteLength,
          sha256: createHash("sha256").update(resume.bytes).digest("hex"),
        });
        resumeStored = true;
      } catch (error) {
        await deleteReviewObject(storageKey).catch(() => undefined);
        console.warn("workspace_resume_storage_failed", error instanceof Error ? error.name : "UnknownError");
      }
    }
    const notifier = (process.env.APPLICATION_NOTIFICATION_EMAIL || process.env.HR_NOTIFICATION_EMAIL)?.trim();
    let notifications = { candidateAcknowledged: false, internalSent: 0, internalFailed: 0 };
    if (result.created && !isPublicDemoSession(session)) {
      const positions = await queryRows<RowDataPacket & { title: string }>(
        "SELECT title FROM positions WHERE id = ? AND organization_id = ? LIMIT 1",
        [parsed.data.positionId, session.organizationId],
      );
      const positionTitle = positions[0]?.title ?? "Position";
      const candidate = parsed.data.assessment.profile.displayName;
      const panelUrl = `${(process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "")}/workspace?positionId=${encodeURIComponent(parsed.data.positionId)}`;
      notifications = await sendApplicationNotifications({
        candidateEmail: parsed.data.candidateEmail || undefined,
        candidateName: candidate,
        internalRecipients: [...(notifier ? [notifier] : []), ...parsed.data.reviewerEmails],
        panelUrl,
        positionTitle,
        recommendation: parsed.data.assessment.recommendation,
        resume: resume ? { fileName: resume.fileName, bytes: resume.bytes, contentType: resume.mimeType } : null,
        score: parsed.data.assessment.score,
      });
    }
    return NextResponse.json(
      { ok: true, ...result, resumeStored, ...notifications },
      { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApplicationIntakeError) {
      console.warn("assessment_intake_rejected", { code: error.message });
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

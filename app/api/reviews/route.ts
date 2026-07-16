import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { candidateForBlindExport } from "@/lib/export";
import { FileValidationError, validateResumeFile } from "@/lib/file-validation";
import { MAX_RAW_RESUME_BYTES } from "@/lib/limits";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  createReviewId,
  createReviewSchema,
  createReviewToken,
  normalizeRecipients,
  recipientsAreAllowed,
  type ReviewPack,
} from "@/lib/reviews";
import { requestSession } from "@/lib/auth";
import { reviewerRecipientsAreAllowed } from "@/lib/reviewer-directory";
import {
  emailDeliveryConfigured,
  sendReviewInvitations,
} from "@/lib/review-email";
import {
  deleteReviewObject,
  reviewStorageConfigured,
  saveReviewPack,
  saveReviewResume,
} from "@/lib/review-store";
import {
  clientIdentifier,
  expectedOrigin,
  isSameOrigin,
} from "@/lib/request-security";

export const dynamic = "force-dynamic";

const acceptedResumeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
]);

function responseError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return responseError(403, "ORIGIN_NOT_ALLOWED", "Open sharing from this Shortlist deployment.");
  }

  const rateLimit = await checkRateLimit({
    scope: "review-share",
    identifier: clientIdentifier(request),
    limit: 8,
    windowMs: 60 * 60 * 1_000,
  });
  if (!rateLimit.allowed) {
    return responseError(429, "RATE_LIMITED", "Too many review links were created. Try again later.");
  }

  if (!reviewStorageConfigured()) {
    return responseError(
      503,
      "REVIEW_STORAGE_NOT_CONFIGURED",
      "Private review storage is not configured for this deployment.",
    );
  }

  try {
    const form = await request.formData();
    const rawPayload = form.get("payload");
    if (typeof rawPayload !== "string" || rawPayload.length > 75_000) {
      return responseError(400, "INVALID_REVIEW_REQUEST", "The review request is invalid.");
    }

    const input = createReviewSchema.parse(JSON.parse(rawPayload));
    const requestedRecipients = normalizeRecipients(input.recipients);
    const emailConfigured = emailDeliveryConfigured();
    const session = requestedRecipients.length ? await requestSession(request) : null;
    if (session?.planTier === "free" && requestedRecipients.length) {
      return responseError(403, "PRO_REQUIRED", "Email review sharing is available on the Pro plan.");
    }
    const recipientsAllowed = session
      ? await reviewerRecipientsAreAllowed(session, requestedRecipients)
      : recipientsAreAllowed(requestedRecipients);
    if (emailConfigured && !recipientsAllowed) {
      return responseError(
        403,
        "RECIPIENT_NOT_ALLOWED",
        "Email recipients must be listed in REVIEW_ALLOWED_RECIPIENTS. You can still create a copyable link without recipients.",
      );
    }
    const recipients = emailConfigured ? requestedRecipients : [];

    const resumeValue = form.get("resume");
    const resume = resumeValue instanceof File && resumeValue.size > 0 ? resumeValue : null;
    if (resume && input.blindMode) {
      return responseError(
        400,
        "BLIND_RESUME_CONFLICT",
        "Disable blind review before attaching the identity-bearing resume.",
      );
    }
    if (resume && (resume.size > MAX_RAW_RESUME_BYTES || !acceptedResumeTypes.has(resume.type))) {
      return responseError(
        400,
        "INVALID_RESUME_ATTACHMENT",
        "The optional resume must be PDF, DOCX, TXT, or Markdown and no larger than 3 MiB.",
      );
    }
    const validatedResume = resume
      ? validateResumeFile({
          fileName: resume.name,
          mimeType: resume.type,
          dataUrl: `data:${resume.type};base64,${Buffer.from(await resume.arrayBuffer()).toString("base64")}`,
        })
      : null;

    const id = createReviewId();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + input.expiresInHours * 60 * 60 * 1_000);
    let resumePathname: string | null = null;

    try {
      if (resume) {
        const extension = validatedResume?.fileName.split(".").pop()?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
        resumePathname = `review-packs/${id}/resume.${extension.toLowerCase()}`;
        await saveReviewResume(resumePathname, resume);
      }

      const candidate = input.blindMode
        ? candidateForBlindExport(input.candidate, 1, input.locale)
        : input.candidate;
      const pack: ReviewPack = {
        version: 1,
        id,
        candidate,
        job: input.job,
        locale: input.locale,
        blindMode: input.blindMode,
        requesterName: input.requesterName,
        recipients,
        note: input.note,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        resume: resume && resumePathname
          ? {
              pathname: resumePathname,
              fileName: validatedResume?.fileName ?? resume.name.replace(/[\r\n"\\/]/g, "_").slice(0, 255),
              contentType: validatedResume?.mimeType ?? resume.type,
              size: resume.size,
            }
          : null,
      };

      const token = createReviewToken(id, pack.expiresAt);
      await saveReviewPack(pack);
      const appOrigin = (process.env.APP_URL || expectedOrigin(request)).replace(/\/$/, "");
      const reviewUrl = `${appOrigin}/review/${encodeURIComponent(token)}`;
      const delivery = await sendReviewInvitations(pack, reviewUrl).catch((error: unknown) => {
        const code = error && typeof error === "object" && "code" in error
          ? String(error.code).replace(/[^A-Z0-9_-]/gi, "").slice(0, 40)
          : "SMTP_DELIVERY_FAILED";
        console.warn("review_invitation_delivery_failed", code);
        return { configured: true, sent: 0, failed: recipients.length };
      });

      return NextResponse.json(
        {
          ok: true,
          reviewUrl,
          expiresAt: pack.expiresAt,
          emailConfigured: delivery.configured,
          emailsSent: delivery.sent,
          emailsFailed: delivery.failed,
          emailsRequested: requestedRecipients.length,
          recipientsDeferred: requestedRecipients.length > 0 && !emailConfigured,
          resumeIncluded: Boolean(pack.resume),
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      if (resumePathname) await deleteReviewObject(resumePathname).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof FileValidationError) {
      return responseError(error.status, error.code, error.message);
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return responseError(400, "INVALID_REVIEW_REQUEST", "Check the review fields and try again.");
    }
    console.error("Review creation failed", error instanceof Error ? error.name : "UnknownError");
    return responseError(500, "REVIEW_CREATION_FAILED", "The private review link could not be created.");
  }
}

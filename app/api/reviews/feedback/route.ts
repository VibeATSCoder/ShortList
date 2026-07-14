import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { checkRateLimit } from "@/lib/rate-limit";
import { sendFeedbackNotification } from "@/lib/review-email";
import {
  makeFeedback,
  submitFeedbackSchema,
  verifyReviewToken,
} from "@/lib/reviews";
import {
  loadReviewPack,
  saveReviewEvent,
} from "@/lib/review-store";
import { clientIdentifier, expectedOrigin, isSameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

function responseError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return responseError(403, "ORIGIN_NOT_ALLOWED", "Open feedback from this Shortlist review link.");
  }
  const limit = await checkRateLimit({
    scope: "review-feedback",
    identifier: clientIdentifier(request),
    limit: 12,
    windowMs: 60 * 60 * 1_000,
  });
  if (!limit.allowed) return responseError(429, "RATE_LIMITED", "Too many feedback attempts.");

  try {
    const input = submitFeedbackSchema.parse(await request.json());
    const token = verifyReviewToken(input.token);
    const pack = await loadReviewPack(token.id);
    if (
      !pack ||
      Math.floor(new Date(pack.expiresAt).getTime() / 1_000) !== token.exp
    ) {
      return responseError(404, "REVIEW_NOT_FOUND", "This review is unavailable.");
    }

    const feedback = makeFeedback(pack.id, input);
    await saveReviewEvent(feedback);
    const appOrigin = (process.env.APP_URL || expectedOrigin(request)).replace(/\/$/, "");
    const reviewUrl = `${appOrigin}/review/${encodeURIComponent(input.token)}`;
    const delivery = await sendFeedbackNotification(pack, feedback, reviewUrl).catch(() => ({
      configured: true,
      sent: 0,
    }));

    return NextResponse.json(
      {
        ok: true,
        feedback,
        notificationSent: delivery.sent > 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return responseError(400, "INVALID_FEEDBACK", "Complete every feedback field.");
    }
    if (error instanceof Error && /expired|invalid/i.test(error.message)) {
      return responseError(410, "REVIEW_LINK_INVALID", error.message);
    }
    console.error("Review feedback failed", error instanceof Error ? error.name : "UnknownError");
    return responseError(500, "FEEDBACK_FAILED", "Feedback could not be saved.");
  }
}

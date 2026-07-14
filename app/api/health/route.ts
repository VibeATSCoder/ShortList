import { NextResponse } from "next/server";

import { PROMPT_VERSION } from "@/lib/assessment";
import {
  MAX_PDF_PAGES,
  MAX_RAW_RESUME_BYTES,
  MAX_RESUMES_PER_BATCH,
  MAX_TEXT_RESUME_CHARACTERS,
} from "@/lib/limits";
import { distributedRateLimitConfigured } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export function GET() {
  const distributedRateLimit = distributedRateLimitConfigured();
  const apiKeyConfigured = Boolean(process.env.OPENAI_API_KEY);
  const liveReady =
    apiKeyConfigured &&
    (process.env.NODE_ENV !== "production" || distributedRateLimit);

  return NextResponse.json(
    {
      ok: true,
      service: "shortlist-screening",
      aiConfigured: liveReady,
      model: process.env.OPENAI_MODEL ?? "gpt-5.6",
      promptVersion: PROMPT_VERSION,
      limits: {
        maxFilesPerBatch: MAX_RESUMES_PER_BATCH,
        maxFileBytes: MAX_RAW_RESUME_BYTES,
        maxTextCharacters: MAX_TEXT_RESUME_CHARACTERS,
        maxPdfPages: MAX_PDF_PAGES,
        supported: ["PDF", "TXT", "MD"],
      },
      storage: "not-persisted-by-app",
      providerDataPolicy: "account-policy",
      rateLimit: distributedRateLimit
        ? "distributed"
        : process.env.NODE_ENV === "production"
          ? "required-for-live-ai"
          : "per-instance-development",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

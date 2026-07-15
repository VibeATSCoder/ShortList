import { NextResponse } from "next/server";

import { PROMPT_VERSION } from "@/lib/assessment";
import {
  MAX_PDF_PAGES,
  MAX_RAW_RESUME_BYTES,
  MAX_RESUMES_PER_BATCH,
  MAX_TEXT_RESUME_CHARACTERS,
} from "@/lib/limits";
import { distributedRateLimitConfigured } from "@/lib/rate-limit";
import { databaseHealth } from "@/lib/db";
import { emailDeliveryConfigured } from "@/lib/review-email";
import { reviewStorageConfigured, reviewStorageMode } from "@/lib/review-store";
import { aiProviderConfig } from "@/lib/ai-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  const distributedRateLimit = distributedRateLimitConfigured();
  const database = await databaseHealth();
  const ai = aiProviderConfig();
  const apiKeyConfigured = Boolean(ai.apiKey);
  const liveReady =
    apiKeyConfigured &&
    (process.env.NODE_ENV !== "production" || distributedRateLimit);

  return NextResponse.json(
    {
      ok: true,
      service: "shortlist-screening",
      aiConfigured: liveReady,
      provider: ai.provider,
      model: ai.model,
      promptVersion: PROMPT_VERSION,
      limits: {
        maxFilesPerBatch: MAX_RESUMES_PER_BATCH,
        maxFileBytes: MAX_RAW_RESUME_BYTES,
        maxTextCharacters: MAX_TEXT_RESUME_CHARACTERS,
        maxPdfPages: MAX_PDF_PAGES,
        supported: ["PDF", "DOCX", "TXT", "MD"],
      },
      storage: database.configured && database.connected
        ? "neon-postgres;private-files-optional"
        : reviewStorageConfigured()
          ? `screening-session-only;shared-reviews-${reviewStorageMode()}`
          : "not-persisted-by-app",
      database,
      collaboration: {
        reviewLinks: reviewStorageConfigured(),
        reviewStorage: reviewStorageMode(),
        cpanelEmail: emailDeliveryConfigured(),
        dailyReminders: Boolean(process.env.CRON_SECRET),
        recruiterWorkspace: database.configured && database.connected,
        plan: database.configured ? "vercel-hobby-neon" : "vercel-hobby",
      },
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

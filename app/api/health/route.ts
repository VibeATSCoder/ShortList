import { NextResponse } from "next/server";

import { MAX_FILE_BYTES, PROMPT_VERSION } from "@/lib/assessment";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "shortlist-screening",
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      promptVersion: PROMPT_VERSION,
      limits: {
        maxFilesPerBatch: 5,
        maxFileBytes: MAX_FILE_BYTES,
        supported: ["PDF", "TXT", "MD"],
      },
      retention: "ephemeral",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}


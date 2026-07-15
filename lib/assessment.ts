import { z } from "zod";

import { MAX_RAW_RESUME_BYTES } from "@/lib/limits";
import {
  RUBRIC,
  type Recommendation,
  type ResumeParseQuality,
  type RubricKey,
  type ScreeningResult,
} from "@/lib/types";

export const PROMPT_VERSION = "screen-v2.1.0";
// Vercel Functions accept at most a 4.5 MB request body. A 3 MiB file becomes
// roughly 4 MiB after base64 encoding, leaving room for the job and JSON shell.
export const MAX_FILE_BYTES = MAX_RAW_RESUME_BYTES;
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
] as const;

const rubricKeys = RUBRIC.map((item) => item.key) as [
  RubricKey,
  ...RubricKey[],
];

const rubricAssessmentSchema = z
  .array(
    z.object({
      key: z.enum(rubricKeys),
      score: z.number().min(0).max(30),
      rationale: z.string().min(1).max(500),
      evidence: z.array(z.string().max(220)).max(3),
    }),
  )
  // Keeping the cardinality in JSON Schema lets OpenAI Structured Outputs
  // constrain generation before the runtime uniqueness check below.
  .length(RUBRIC.length)
  .superRefine((items, context) => {
    const seen = new Set<RubricKey>();

    items.forEach((item, index) => {
      if (seen.has(item.key)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate rubric dimension: ${item.key}`,
          path: [index, "key"],
        });
      }

      seen.add(item.key);
    });

    for (const key of rubricKeys) {
      if (!seen.has(key)) {
        context.addIssue({
          code: "custom",
          message: `Missing rubric dimension: ${key}`,
          path: [],
        });
      }
    }
  });

export const screeningRequestSchema = z.object({
  locale: z.enum(["en", "fa"]).default("en"),
  job: z.object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(80).max(20_000),
    criteria: z
      .array(
        z.object({
          kind: z.enum(["must_have", "nice_to_have", "disqualifier"]),
          label: z.string().trim().min(2).max(240),
        }),
      )
      .max(18)
      .optional(),
  }),
  resume: z.object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.enum(ALLOWED_FILE_TYPES),
    dataUrl: z.string().min(20).max(4_250_000),
  }),
});

export const aiAssessmentSchema = z.object({
  profile: z.object({
    displayName: z.string().min(1).max(100),
    currentRole: z.string().min(1).max(120),
    yearsExperience: z.number().min(0).max(60),
  }),
  confidence: z.enum(["high", "medium", "low"]),
  verdict: z.string().min(1).max(180),
  summary: z.string().min(1).max(900),
  rubric: rubricAssessmentSchema,
  mustHaves: z
    .array(
      z.object({
        requirement: z.string().min(1).max(180),
        status: z.enum(["met", "partial", "missing", "unclear"]),
        evidence: z.string().min(1).max(300),
      }),
    )
    .min(1)
    .max(8),
  strengths: z.array(z.string().min(1).max(220)).min(2).max(4),
  gaps: z.array(z.string().min(1).max(220)).min(1).max(4),
  risks: z
    .array(
      z.object({
        risk: z.string().min(1).max(220),
        severity: z.enum(["low", "medium", "high"]),
        evidence: z.string().min(1).max(260),
      }),
    )
    .max(4),
  interviewQuestions: z
    .array(
      z.object({
        question: z.string().min(1).max(280),
        why: z.string().min(1).max(260),
      }),
    )
    .min(3)
    .max(5),
  fairnessNote: z.string().min(1).max(400),
  parseQuality: z.object({
    score: z.number().int().min(0).max(100),
    contact: z.enum(["parsed", "partial", "missing"]),
    experience: z.enum(["parsed", "partial", "missing"]),
    skills: z.enum(["parsed", "partial", "missing"]),
    dates: z.enum(["parsed", "partial", "missing"]),
    warnings: z.array(z.string().min(1).max(180)).max(4),
  }),
});

export type AIAssessment = z.infer<typeof aiAssessmentSchema>;
export type ScreeningRequest = z.infer<typeof screeningRequestSchema>;

export function recommendationForScore(score: number): Recommendation {
  if (score >= 85) return "strong_match";
  if (score >= 72) return "match";
  if (score >= 58) return "review";
  return "low_match";
}

export function normalizeParseQuality(
  quality: ResumeParseQuality,
): ResumeParseQuality {
  const weights = { contact: 10, experience: 35, skills: 35, dates: 20 } as const;
  const factor = { parsed: 1, partial: 0.5, missing: 0 } as const;
  const score = (Object.keys(weights) as Array<keyof typeof weights>).reduce(
    (total, key) => total + weights[key] * factor[quality[key]],
    0,
  );
  return { ...quality, score: Math.round(score) };
}

export function normalizeAssessment(
  assessment: AIAssessment,
  context: {
    id: string;
    fileName: string;
    model: string;
    durationMs: number;
    inputTokens?: number;
    outputTokens?: number;
    requestId?: string | null;
    assessedAt?: string;
    locale?: "en" | "fa";
  },
): ScreeningResult {
  const rubric = RUBRIC.map((definition) => {
    const modelScore = assessment.rubric.find(
      (item) => item.key === definition.key,
    );
    const score = Math.round(
      Math.min(definition.maxScore, Math.max(0, modelScore?.score ?? 0)),
    );

    return {
      ...definition,
      score,
      rationale:
        modelScore?.rationale ??
        (context.locale === "fa"
          ? "رزومه شواهد قابل اتکایی برای این معیار ارائه نکرده است."
          : "The resume did not provide usable evidence."),
      evidence: modelScore?.evidence ?? [],
    };
  });

  const score = rubric.reduce((total, item) => total + item.score, 0);

  return {
    id: context.id,
    fileName: context.fileName,
    source: "live",
    profile: assessment.profile,
    score,
    recommendation: recommendationForScore(score),
    confidence: assessment.confidence,
    verdict: assessment.verdict,
    summary: assessment.summary,
    rubric,
    mustHaves: assessment.mustHaves,
    strengths: assessment.strengths,
    gaps: assessment.gaps,
    risks: assessment.risks,
    interviewQuestions: assessment.interviewQuestions,
    fairnessNote: assessment.fairnessNote,
    humanDecision: null,
    meta: {
      model: context.model,
      promptVersion: PROMPT_VERSION,
      durationMs: context.durationMs,
      inputTokens: context.inputTokens ?? 0,
      outputTokens: context.outputTokens ?? 0,
      requestId: context.requestId ?? null,
      assessedAt: context.assessedAt ?? new Date().toISOString(),
    },
    parseQuality: normalizeParseQuality(assessment.parseQuality),
  };
}

export function redactTextPII(value: string): string {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email removed]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, (match) =>
      match.replace(/\D/g, "").length >= 10 ? "[phone removed]" : match,
    )
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "");
}

export function decodeTextDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:(text\/(?:plain|markdown));base64,(.+)$/);
  if (!match) throw new Error("Invalid text data URL.");
  return Buffer.from(match[2], "base64").toString("utf8");
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return Number.POSITIVE_INFINITY;
  const base64 = dataUrl.slice(comma + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

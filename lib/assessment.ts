import { z } from "zod";

import {
  RUBRIC,
  type Recommendation,
  type RubricKey,
  type ScreeningResult,
} from "@/lib/types";

export const PROMPT_VERSION = "screen-v1.0.0";
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
] as const;

const rubricKeys = RUBRIC.map((item) => item.key) as [
  RubricKey,
  ...RubricKey[],
];

export const screeningRequestSchema = z.object({
  job: z.object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(80).max(20_000),
  }),
  resume: z.object({
    fileName: z.string().trim().min(1).max(180),
    mimeType: z.enum(ALLOWED_FILE_TYPES),
    dataUrl: z.string().min(20).max(7_200_000),
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
  rubric: z
    .array(
      z.object({
        key: z.enum(rubricKeys),
        score: z.number().min(0).max(30),
        rationale: z.string().min(1).max(500),
        evidence: z.array(z.string().max(220)).max(3),
      }),
    )
    .min(1)
    .max(6),
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
});

export type AIAssessment = z.infer<typeof aiAssessmentSchema>;
export type ScreeningRequest = z.infer<typeof screeningRequestSchema>;

export function recommendationForScore(score: number): Recommendation {
  if (score >= 85) return "strong_match";
  if (score >= 72) return "match";
  if (score >= 58) return "review";
  return "low_match";
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
        modelScore?.rationale ?? "The resume did not provide usable evidence.",
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
  };
}

export function redactTextPII(value: string): string {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email removed]")
    .replace(
      /(?:\+?\d[\d\s().-]{7,}\d)/g,
      "[phone removed]",
    )
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .slice(0, 45_000);
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

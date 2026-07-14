import {
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { z } from "zod";

import type { JobProfile, ScreeningResult } from "@/lib/types";
import type { Locale } from "@/lib/i18n";

export const REVIEW_EXPIRY_HOURS = [24, 48, 72] as const;
export const REVIEW_DECISIONS = ["advance", "hold", "decline"] as const;

const safeText = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum: number) => z.string().trim().max(maximum).default("");

const rubricScoreSchema = z.object({
  key: z.enum([
    "core_skills",
    "relevant_experience",
    "demonstrated_impact",
    "ownership_delivery",
    "role_context",
    "communication",
  ]),
  label: safeText(100),
  score: z.number().min(0).max(100),
  maxScore: z.number().min(1).max(100),
  rationale: safeText(1_500),
  evidence: z.array(safeText(700)).max(8),
});

export const reviewCandidateSchema: z.ZodType<ScreeningResult> = z.object({
  id: safeText(160),
  fileName: safeText(255),
  source: z.enum(["demo", "live"]),
  profile: z.object({
    displayName: safeText(160),
    currentRole: safeText(200),
    yearsExperience: z.number().min(0).max(80),
  }),
  score: z.number().min(0).max(100),
  recommendation: z.enum(["strong_match", "match", "review", "low_match"]),
  confidence: z.enum(["high", "medium", "low"]),
  verdict: safeText(500),
  summary: safeText(3_000),
  rubric: z.array(rubricScoreSchema).min(1).max(6),
  mustHaves: z
    .array(
      z.object({
        requirement: safeText(500),
        status: z.enum(["met", "partial", "missing", "unclear"]),
        evidence: safeText(1_000),
      }),
    )
    .max(20),
  strengths: z.array(safeText(700)).max(12),
  gaps: z.array(safeText(700)).max(12),
  risks: z
    .array(
      z.object({
        risk: safeText(500),
        severity: z.enum(["low", "medium", "high"]),
        evidence: safeText(1_000),
      }),
    )
    .max(12),
  interviewQuestions: z
    .array(
      z.object({
        question: safeText(1_000),
        why: safeText(1_000),
      }),
    )
    .max(12),
  fairnessNote: safeText(1_500),
  humanDecision: z.enum(["advance", "hold", "decline"]).nullable(),
  meta: z.object({
    model: safeText(120),
    promptVersion: safeText(120),
    durationMs: z.number().min(0).max(3_600_000),
    inputTokens: z.number().int().min(0).max(10_000_000),
    outputTokens: z.number().int().min(0).max(10_000_000),
    requestId: z.string().max(255).nullable(),
    assessedAt: safeText(80),
  }),
  parseQuality: z
    .object({
      score: z.number().int().min(0).max(100),
      contact: z.enum(["parsed", "partial", "missing"]),
      experience: z.enum(["parsed", "partial", "missing"]),
      skills: z.enum(["parsed", "partial", "missing"]),
      dates: z.enum(["parsed", "partial", "missing"]),
      warnings: z.array(safeText(180)).max(4),
    })
    .optional(),
});

const jobSchema: z.ZodType<JobProfile> = z.object({
  title: safeText(200),
  description: safeText(20_000),
  criteria: z
    .array(
      z.object({
        kind: z.enum(["must_have", "nice_to_have", "disqualifier"]),
        label: safeText(240),
      }),
    )
    .max(18)
    .optional(),
});

export const createReviewSchema = z.object({
  candidate: reviewCandidateSchema,
  job: jobSchema,
  locale: z.enum(["en", "fa"]),
  blindMode: z.boolean(),
  requesterName: safeText(120),
  recipients: z.array(z.email().max(254)).max(5).default([]),
  note: optionalText(1_500),
  expiresInHours: z.union([
    z.literal(24),
    z.literal(48),
    z.literal(72),
  ]),
});

export const submitFeedbackSchema = z.object({
  token: safeText(2_048),
  reviewerName: safeText(120),
  decision: z.enum(REVIEW_DECISIONS),
  comment: safeText(2_000),
});

export interface ReviewResume {
  pathname: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface ReviewPack {
  version: 1;
  id: string;
  candidate: ScreeningResult;
  job: JobProfile;
  locale: Locale;
  blindMode: boolean;
  requesterName: string;
  recipients: string[];
  note: string;
  createdAt: string;
  expiresAt: string;
  resume: ReviewResume | null;
}

export interface ReviewFeedback {
  kind: "feedback";
  id: string;
  reviewId: string;
  reviewerName: string;
  decision: (typeof REVIEW_DECISIONS)[number];
  comment: string;
  submittedAt: string;
}

export interface ReminderEvent {
  kind: "reminder";
  id: string;
  reviewId: string;
  sentAt: string;
  recipientCount: number;
}

export type ReviewEvent = ReviewFeedback | ReminderEvent;

interface ReviewTokenPayload {
  id: string;
  exp: number;
  nonce: string;
}

function tokenSecret(): string {
  const secret = process.env.REVIEW_LINK_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "shortlist-local-review-secret-change-before-production";
  }
  throw new Error("REVIEW_LINK_SECRET is not configured.");
}

function signature(value: string): string {
  return createHmac("sha256", tokenSecret()).update(value).digest("base64url");
}

export function createReviewId(): string {
  return `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}`;
}

export function createReviewToken(id: string, expiresAt: string): string {
  const payload: ReviewTokenPayload = {
    id,
    exp: Math.floor(new Date(expiresAt).getTime() / 1_000),
    nonce: randomBytes(8).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyReviewToken(token: string): ReviewTokenPayload {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) throw new Error("Invalid review link.");

  const expected = Buffer.from(signature(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("Invalid review link.");
  }

  const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
  const payload = z
    .object({
      id: z.string().regex(/^[a-z0-9-]{10,80}$/),
      exp: z.number().int().positive(),
      nonce: z.string().min(6).max(80),
    })
    .parse(parsed);

  if (payload.exp <= Math.floor(Date.now() / 1_000)) {
    throw new Error("Review link expired.");
  }
  return payload;
}

export function makeFeedback(
  reviewId: string,
  input: z.infer<typeof submitFeedbackSchema>,
): ReviewFeedback {
  return {
    kind: "feedback",
    id: randomUUID(),
    reviewId,
    reviewerName: input.reviewerName,
    decision: input.decision,
    comment: input.comment,
    submittedAt: new Date().toISOString(),
  };
}

export function normalizeRecipients(recipients: string[]): string[] {
  return [...new Set(recipients.map((email) => email.trim().toLowerCase()))];
}

export function configuredRecipientAllowlist(): Set<string> {
  return new Set(
    (process.env.REVIEW_ALLOWED_RECIPIENTS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function recipientsAreAllowed(recipients: string[]): boolean {
  if (!recipients.length) return true;
  const allowlist = configuredRecipientAllowlist();
  return allowlist.size > 0 && recipients.every((email) => allowlist.has(email));
}

export function reviewPackPath(reviewId: string): string {
  return `review-packs/${reviewId}/request.json`;
}

export function reviewEventPath(reviewId: string, eventId: string): string {
  return `review-packs/${reviewId}/events/${Date.now()}-${eventId}.json`;
}

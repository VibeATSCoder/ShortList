import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import type { JobProfile, ScreeningResult } from "@/lib/types";

const SEAL_VERSION = 1;
const SEAL_TTL_MS = 60 * 60 * 1_000;

interface SealPayload {
  v: number;
  j: string;
  r: string;
  iat: number;
}

function secret(): string | null {
  const value = process.env.ASSESSMENT_SEAL_SECRET || process.env.SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function assessmentJobHash(job: Pick<JobProfile, "title" | "description">): string {
  return digest({ title: job.title.trim(), description: job.description.trim() });
}

function resultHash(result: ScreeningResult): string {
  return digest(result);
}

function equal(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAssessmentSeal(job: JobProfile, result: ScreeningResult): string | null {
  const key = secret();
  if (!key) return null;
  const payload: SealPayload = {
    v: SEAL_VERSION,
    j: assessmentJobHash(job),
    r: resultHash(result),
    iat: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", key).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyAssessmentSeal(
  job: Pick<JobProfile, "title" | "description">,
  result: ScreeningResult,
  token: string,
): boolean {
  const key = secret();
  const [encoded, signature, extra] = token.split(".");
  if (!key || !encoded || !signature || extra) return false;
  const expected = createHmac("sha256", key).update(encoded).digest("base64url");
  if (!equal(signature, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SealPayload;
    const age = Date.now() - payload.iat;
    return (
      payload.v === SEAL_VERSION &&
      Number.isFinite(payload.iat) &&
      age >= -60_000 &&
      age <= SEAL_TTL_MS &&
      equal(payload.j, assessmentJobHash(job)) &&
      equal(payload.r, resultHash(result))
    );
  } catch {
    return false;
  }
}

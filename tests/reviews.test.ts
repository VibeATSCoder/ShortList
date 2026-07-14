import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_CANDIDATES, DEMO_JOB } from "@/lib/demo-data";
import {
  createReviewSchema,
  createReviewToken,
  normalizeRecipients,
  recipientsAreAllowed,
  verifyReviewToken,
} from "@/lib/reviews";

afterEach(() => vi.unstubAllEnvs());

describe("private review links", () => {
  it("round-trips a signed, unexpired token", () => {
    vi.stubEnv("REVIEW_LINK_SECRET", "a-secure-test-secret-with-more-than-thirty-two-characters");
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const token = createReviewToken("review-123456", expiresAt);
    expect(verifyReviewToken(token).id).toBe("review-123456");
  });

  it("rejects tampered and expired tokens", () => {
    vi.stubEnv("REVIEW_LINK_SECRET", "a-secure-test-secret-with-more-than-thirty-two-characters");
    const valid = createReviewToken(
      "review-123456",
      new Date(Date.now() + 60_000).toISOString(),
    );
    expect(() => verifyReviewToken(`${valid.slice(0, -1)}x`)).toThrow(/invalid/i);

    const expired = createReviewToken(
      "review-123456",
      new Date(Date.now() - 60_000).toISOString(),
    );
    expect(() => verifyReviewToken(expired)).toThrow(/expired/i);
  });

  it("validates a bounded candidate review request", () => {
    const parsed = createReviewSchema.parse({
      candidate: DEMO_CANDIDATES[0],
      job: DEMO_JOB,
      locale: "en",
      blindMode: true,
      requesterName: "Talent Partner",
      recipients: [],
      note: "Validate the delivery evidence.",
      expiresInHours: 48,
    });
    expect(parsed.expiresInHours).toBe(48);
    expect(parsed.candidate.rubric).toHaveLength(6);
  });
});

describe("review email safety", () => {
  it("normalizes and deduplicates recipients", () => {
    expect(normalizeRecipients([" Lead@Example.com ", "lead@example.com"])).toEqual([
      "lead@example.com",
    ]);
  });

  it("allows only explicitly configured recipients", () => {
    vi.stubEnv("REVIEW_ALLOWED_RECIPIENTS", "lead@example.com, hr@example.com");
    expect(recipientsAreAllowed(["lead@example.com"])).toBe(true);
    expect(recipientsAreAllowed(["outside@example.com"])).toBe(false);
    expect(recipientsAreAllowed([])).toBe(true);
  });
});

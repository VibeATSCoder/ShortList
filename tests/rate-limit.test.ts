import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  distributedRateLimitConfigured,
  RateLimitUnavailableError,
  resetRateLimitStateForTests,
} from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("RATE_LIMIT_KEY_SALT", "test-only-salt");
    resetRateLimitStateForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    resetRateLimitStateForTests();
  });

  it("enforces and resets the bounded in-memory window", async () => {
    const options = {
      scope: "screening",
      identifier: "203.0.113.7",
      limit: 2,
      windowMs: 60_000,
    };

    const first = await checkRateLimit({ ...options, now: 1_000_000 });
    const second = await checkRateLimit({ ...options, now: 1_000_100 });
    const denied = await checkRateLimit({ ...options, now: 1_000_200 });
    const reset = await checkRateLimit({ ...options, now: 1_060_001 });

    expect(first).toMatchObject({
      allowed: true,
      remaining: 1,
      retryAfter: 0,
      backend: "memory",
    });
    expect(second.remaining).toBe(0);
    expect(denied).toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfter: 60,
    });
    expect(reset).toMatchObject({ allowed: true, remaining: 1 });
  });

  it("uses an anonymous Redis key when Upstash is configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ result: [1, 60_000] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkRateLimit({
      scope: "screening",
      identifier: "203.0.113.7",
      limit: 12,
      windowMs: 60_000,
      now: 2_000_000,
    });

    expect(distributedRateLimitConfigured()).toBe(true);
    expect(result).toMatchObject({
      allowed: true,
      remaining: 11,
      backend: "upstash",
    });
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const command = JSON.parse(String(init.body)) as string[];
    expect(command[3]).toMatch(/^shortlist:rate:screening:[A-Za-z0-9_-]{32}$/);
    expect(command[3]).not.toContain("203.0.113.7");
  });

  it("falls back safely when the distributed limiter is unavailable", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const result = await checkRateLimit({
      scope: "screening",
      identifier: "203.0.113.7",
      limit: 1,
      windowMs: 60_000,
      now: 3_000_000,
    });

    expect(result.backend).toBe("memory");
    expect(result.allowed).toBe(true);
  });

  it("fails closed when a distributed limiter is required but absent", async () => {
    await expect(
      checkRateLimit({
        scope: "screening",
        identifier: "203.0.113.7",
        limit: 1,
        windowMs: 60_000,
        requireDistributed: true,
      }),
    ).rejects.toBeInstanceOf(RateLimitUnavailableError);
  });

  it("fails closed when the required distributed limiter is offline", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "secret-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(
      checkRateLimit({
        scope: "screening",
        identifier: "203.0.113.7",
        limit: 1,
        windowMs: 60_000,
        requireDistributed: true,
      }),
    ).rejects.toBeInstanceOf(RateLimitUnavailableError);
  });
});

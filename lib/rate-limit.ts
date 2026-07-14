import { createHmac } from "node:crypto";

export type RateLimitBackend = "upstash" | "postgres" | "memory";

export interface RateLimitOptions {
  /** A non-sensitive namespace such as `screening`. */
  scope: string;
  /** A raw client identifier. It is HMAC-hashed before it becomes a key. */
  identifier: string;
  limit: number;
  windowMs: number;
  /** Injectable clock for deterministic tests. */
  now?: number;
  /** Reject instead of using process-local memory when Redis is unavailable. */
  requireDistributed?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix timestamp, in seconds, when this window resets. */
  reset: number;
  /** Whole seconds until another request may be attempted; zero when allowed. */
  retryAfter: number;
  backend: RateLimitBackend;
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("The distributed rate limiter is unavailable.");
    this.name = "RateLimitUnavailableError";
  }
}

interface MemoryWindow {
  count: number;
  resetAt: number;
}

interface MemoryState {
  windows: Map<string, MemoryWindow>;
  operations: number;
}

interface UpstashCommandResponse {
  result?: unknown;
  error?: string;
}

const MEMORY_KEY_LIMIT = 5_000;
const CLEANUP_INTERVAL = 100;
const UPSTASH_TIMEOUT_MS = 1_500;
const GLOBAL_STATE_KEY = Symbol.for("shortlist.rate-limit.memory-state");

const RATE_LIMIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {count, ttl}
`.trim();

type RateLimitGlobal = typeof globalThis & {
  [GLOBAL_STATE_KEY]?: MemoryState;
};

function memoryState(): MemoryState {
  const globalState = globalThis as RateLimitGlobal;
  globalState[GLOBAL_STATE_KEY] ??= {
    windows: new Map<string, MemoryWindow>(),
    operations: 0,
  };
  return globalState[GLOBAL_STATE_KEY];
}

function assertOptions(options: RateLimitOptions): void {
  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new RangeError("Rate-limit limit must be a positive integer.");
  }
  if (!Number.isInteger(options.windowMs) || options.windowMs < 1_000) {
    throw new RangeError("Rate-limit windowMs must be an integer of at least 1000.");
  }
}

function safeScope(scope: string): string {
  const normalized = scope
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return normalized || "default";
}

function keySalt(): string {
  return (
    process.env.RATE_LIMIT_KEY_SALT ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.VERCEL_PROJECT_ID ??
    "shortlist-local-development"
  );
}

function anonymousKey(scope: string, identifier: string): string {
  const digest = createHmac("sha256", keySalt())
    .update(identifier.trim() || "anonymous")
    .digest("base64url")
    .slice(0, 32);
  return `shortlist:rate:${safeScope(scope)}:${digest}`;
}

function toResult(
  count: number,
  resetAt: number,
  limit: number,
  now: number,
  backend: RateLimitBackend,
): RateLimitResult {
  const allowed = count <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, limit - count),
    reset: Math.ceil(resetAt / 1_000),
    retryAfter: allowed
      ? 0
      : Math.max(1, Math.ceil((resetAt - now) / 1_000)),
    backend,
  };
}

function cleanupMemory(state: MemoryState, now: number): void {
  state.operations += 1;
  if (
    state.operations % CLEANUP_INTERVAL !== 0 &&
    state.windows.size < MEMORY_KEY_LIMIT
  ) {
    return;
  }

  for (const [key, value] of state.windows) {
    if (value.resetAt <= now) state.windows.delete(key);
  }

  // Map iteration is insertion ordered, so evicting from the front bounds memory
  // while preferentially retaining newer client windows.
  while (state.windows.size >= MEMORY_KEY_LIMIT) {
    const oldestKey = state.windows.keys().next().value as string | undefined;
    if (!oldestKey) break;
    state.windows.delete(oldestKey);
  }
}

function checkMemory(
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): RateLimitResult {
  const state = memoryState();
  cleanupMemory(state, now);

  const existing = state.windows.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    state.windows.set(key, { count: 1, resetAt });
    return toResult(1, resetAt, limit, now, "memory");
  }

  existing.count += 1;
  return toResult(existing.count, existing.resetAt, limit, now, "memory");
}

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/+$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

function postgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

async function checkPostgres(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): Promise<RateLimitResult> {
  const { withTransaction } = await import("@/lib/db");
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const expiresAt = new Date(windowStartMs + windowMs);
  const subjectHash = createHmac("sha256", keySalt()).update(key).digest("hex");

  const count = await withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO rate_limit_windows
        (scope, subject_hash, window_start, hit_count, expires_at)
       VALUES (?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         hit_count = hit_count + 1,
         expires_at = VALUES(expires_at)`,
      [safeScope(scope), subjectHash, windowStart, expiresAt],
    );
    const [rows] = await connection.execute<
      ({ hit_count: number } & import("mysql2/promise").RowDataPacket)[]
    >(
      `SELECT hit_count
         FROM rate_limit_windows
        WHERE scope = ? AND subject_hash = ? AND window_start = ?
        LIMIT 1`,
      [safeScope(scope), subjectHash, windowStart],
    );
    if (!rows[0]) throw new Error("Postgres rate-limit row was not found.");
    return Number(rows[0].hit_count);
  });

  return toResult(count, expiresAt.getTime(), limit, now, "postgres");
}

async function checkUpstash(
  config: { url: string; token: string },
  key: string,
  limit: number,
  windowMs: number,
  now: number,
): Promise<RateLimitResult> {
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      "EVAL",
      RATE_LIMIT_SCRIPT,
      "1",
      key,
      String(windowMs),
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(UPSTASH_TIMEOUT_MS),
  });

  const payload = (await response.json()) as UpstashCommandResponse;
  if (!response.ok || payload.error) {
    throw new Error("Distributed rate-limit command failed.");
  }
  if (
    !Array.isArray(payload.result) ||
    payload.result.length < 2 ||
    !Number.isFinite(Number(payload.result[0])) ||
    !Number.isFinite(Number(payload.result[1]))
  ) {
    throw new Error("Distributed rate-limit response was invalid.");
  }

  const count = Number(payload.result[0]);
  const ttl = Number(payload.result[1]);
  const safeTtl = ttl > 0 ? ttl : windowMs;
  return toResult(count, now + safeTtl, limit, now, "upstash");
}

/**
 * Applies a fixed-window rate limit. Upstash is preferred when configured,
 * Neon Postgres provides the durable serverless backend, and a bounded
 * process-local fallback is reserved for development or non-paid operations.
 */
export async function checkRateLimit(
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  assertOptions(options);
  const now = options.now ?? Date.now();
  const key = anonymousKey(options.scope, options.identifier);
  const config = upstashConfig();

  if (config) {
    try {
      return await checkUpstash(
        config,
        key,
        options.limit,
        options.windowMs,
        now,
      );
    } catch {
      // Fail over without logging the identifier, Redis URL, token, or key.
      if (options.requireDistributed && !postgresConfigured()) {
        throw new RateLimitUnavailableError();
      }
    }
  }

  if (postgresConfigured()) {
    try {
      return await checkPostgres(
        options.scope,
        key,
        options.limit,
        options.windowMs,
        now,
      );
    } catch {
      if (options.requireDistributed) throw new RateLimitUnavailableError();
    }
  } else if (options.requireDistributed) {
    throw new RateLimitUnavailableError();
  }

  return checkMemory(key, options.limit, options.windowMs, now);
}

export function distributedRateLimitConfigured(): boolean {
  return upstashConfig() !== null || postgresConfigured();
}

/** Test-only state reset; it never exposes client identifiers or hashed keys. */
export function resetRateLimitStateForTests(): void {
  const state = memoryState();
  state.windows.clear();
  state.operations = 0;
}

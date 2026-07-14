import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authConfigured, createUserSession, verifyCredentials } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIdentifier, isSameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(256),
});

function error(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return error(403, "ORIGIN_NOT_ALLOWED", "Open sign-in from this Shortlist deployment.");
  if (!authConfigured()) return error(503, "AUTH_NOT_CONFIGURED", "The private workspace is not configured yet.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return error(415, "UNSUPPORTED_MEDIA_TYPE", "Sign-in requests must use application/json.");
  }

  const limit = await checkRateLimit({
    scope: "workspace-login",
    identifier: clientIdentifier(request),
    limit: 8,
    windowMs: 15 * 60 * 1_000,
  });
  if (!limit.allowed) return error(429, "RATE_LIMITED", "Too many sign-in attempts. Try again later.");

  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return error(400, "INVALID_LOGIN", "Enter a valid email and password.");

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    return error(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
  }

  const response = NextResponse.json(
    { ok: true, redirectTo: "/workspace" },
    { headers: { "Cache-Control": "no-store" } },
  );
  await createUserSession(user, response, request);
  return response;
}

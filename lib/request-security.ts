import type { NextRequest } from "next/server";

function configuredOrigin(): string | null {
  const configured = process.env.APP_URL?.trim();
  if (!configured) return null;
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
}

export function clientIdentifier(request: NextRequest): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "local"
  );
}

export function expectedOrigin(request: NextRequest): string {
  const configured = configuredOrigin();
  if (configured) return configured;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${protocol}://${host}` : new URL(request.url).origin;
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  const configured = configuredOrigin();
  if (configured) return origin === configured;
  return origin === expectedOrigin(request) || origin === new URL(request.url).origin;
}

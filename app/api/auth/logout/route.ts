import { NextRequest, NextResponse } from "next/server";

import { clearSessionCookies, revokeSession, validCsrf } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request) || !(await validCsrf(request))) {
    return NextResponse.json({ error: { code: "INVALID_CSRF", message: "Refresh and try again." } }, { status: 403 });
  }
  await revokeSession(request);
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  clearSessionCookies(response);
  return response;
}

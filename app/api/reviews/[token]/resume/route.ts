import { NextRequest, NextResponse } from "next/server";

import { verifyReviewToken } from "@/lib/reviews";
import { loadReviewPack, loadReviewResume } from "@/lib/review-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token: rawToken } = await params;
    const token = decodeURIComponent(rawToken);
    const payload = verifyReviewToken(token);
    const pack = await loadReviewPack(payload.id);
    if (
      !pack?.resume ||
      Math.floor(new Date(pack.expiresAt).getTime() / 1_000) !== payload.exp
    ) {
      return NextResponse.json({ error: "Resume unavailable." }, { status: 404 });
    }

    const result = await loadReviewResume(pack.resume.pathname);
    if (!result) {
      return NextResponse.json({ error: "Resume unavailable." }, { status: 404 });
    }

    return new NextResponse(result, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(pack.resume.fileName)}`,
        "Content-Type": pack.resume.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Review link is invalid or expired." }, { status: 410 });
  }
}

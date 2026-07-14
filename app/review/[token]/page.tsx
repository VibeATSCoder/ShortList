import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReviewerWorkspace } from "@/components/reviewer-workspace";
import { verifyReviewToken } from "@/lib/reviews";
import { listReviewFeedback, loadReviewPack } from "@/lib/review-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private candidate review · Shortlist",
  description: "A private, evidence-backed candidate review workspace.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  let reviewId: string;
  let expiresAtSeconds: number;
  try {
    const payload = verifyReviewToken(token);
    reviewId = payload.id;
    expiresAtSeconds = payload.exp;
  } catch {
    notFound();
  }
  const pack = await loadReviewPack(reviewId);
  if (
    !pack ||
    Math.floor(new Date(pack.expiresAt).getTime() / 1_000) !== expiresAtSeconds
  ) notFound();
  const feedback = await listReviewFeedback(pack.id);
  return <ReviewerWorkspace initialFeedback={feedback} pack={pack} token={token} />;
}

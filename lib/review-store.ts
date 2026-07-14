import { del, get, list, put } from "@vercel/blob";

import {
  reviewEventPath,
  reviewPackPath,
  type ReviewEvent,
  type ReviewFeedback,
  type ReviewPack,
} from "@/lib/reviews";

export function reviewStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL_OIDC_TOKEN);
}

async function readJson<T>(pathname: string): Promise<T | null> {
  const result = await get(pathname, { access: "private" });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  return (await new Response(result.stream).json()) as T;
}

export async function saveReviewPack(pack: ReviewPack): Promise<void> {
  await put(reviewPackPath(pack.id), JSON.stringify(pack), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/json; charset=utf-8",
  });
}

export async function loadReviewPack(reviewId: string): Promise<ReviewPack | null> {
  return readJson<ReviewPack>(reviewPackPath(reviewId));
}

export async function saveReviewEvent(event: ReviewEvent): Promise<void> {
  await put(reviewEventPath(event.reviewId, event.id), JSON.stringify(event), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/json; charset=utf-8",
  });
}

export async function listReviewEvents(reviewId: string): Promise<ReviewEvent[]> {
  const result = await list({ prefix: `review-packs/${reviewId}/events/`, limit: 100 });
  const events = await Promise.all(
    result.blobs.map((blob) => readJson<ReviewEvent>(blob.pathname)),
  );
  return events
    .filter((event): event is ReviewEvent => Boolean(event))
    .sort((a, b) => {
      const left = a.kind === "feedback" ? a.submittedAt : a.sentAt;
      const right = b.kind === "feedback" ? b.submittedAt : b.sentAt;
      return left.localeCompare(right);
    });
}

export async function listReviewFeedback(reviewId: string): Promise<ReviewFeedback[]> {
  return (await listReviewEvents(reviewId)).filter(
    (event): event is ReviewFeedback => event.kind === "feedback",
  );
}

export async function listAllReviewPacks(): Promise<ReviewPack[]> {
  const result = await list({ prefix: "review-packs/", limit: 500 });
  const packBlobs = result.blobs.filter((blob) => blob.pathname.endsWith("/request.json"));
  const packs = await Promise.all(
    packBlobs.map((blob) => readJson<ReviewPack>(blob.pathname)),
  );
  return packs.filter((pack): pack is ReviewPack => Boolean(pack));
}

export async function listActiveReviewPacks(): Promise<ReviewPack[]> {
  const now = Date.now();
  return (await listAllReviewPacks()).filter(
    (pack) => new Date(pack.expiresAt).getTime() > now,
  );
}

export async function deleteReviewPack(reviewId: string): Promise<number> {
  const result = await list({ prefix: `review-packs/${reviewId}/`, limit: 500 });
  if (!result.blobs.length) return 0;
  await del(result.blobs.map((blob) => blob.pathname));
  return result.blobs.length;
}

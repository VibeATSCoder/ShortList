import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { sendReviewReminder } from "@/lib/review-email";
import { createReviewToken, type ReminderEvent } from "@/lib/reviews";
import {
  deleteReviewPack,
  listAllReviewPacks,
  listReviewEvents,
  saveReviewEvent,
} from "@/lib/review-store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "");
  const now = Date.now();
  const allPacks = (await listAllReviewPacks()).slice(0, 100);
  const expired = allPacks.filter((pack) => new Date(pack.expiresAt).getTime() <= now);
  let objectsDeleted = 0;
  for (const pack of expired) objectsDeleted += await deleteReviewPack(pack.id);
  const packs = allPacks
    .filter((pack) => new Date(pack.expiresAt).getTime() > now)
    .slice(0, 50);
  let remindersSent = 0;
  let pending = 0;

  for (const pack of packs) {
    if (now - new Date(pack.createdAt).getTime() < 24 * 60 * 60 * 1_000) continue;
    const events = await listReviewEvents(pack.id);
    if (events.some((event) => event.kind === "feedback")) continue;
    const latestReminder = events
      .filter((event): event is ReminderEvent => event.kind === "reminder")
      .at(-1);
    if (latestReminder && now - new Date(latestReminder.sentAt).getTime() < 20 * 60 * 60 * 1_000) continue;

    pending += 1;
    const token = createReviewToken(pack.id, pack.expiresAt);
    const reviewUrl = `${origin}/review/${encodeURIComponent(token)}`;
    const delivery = await sendReviewReminder(pack, reviewUrl).catch(() => ({ configured: true, sent: 0 }));
    if (delivery.sent > 0) {
      await saveReviewEvent({
        kind: "reminder",
        id: randomUUID(),
        reviewId: pack.id,
        sentAt: new Date().toISOString(),
        recipientCount: delivery.sent,
      });
      remindersSent += delivery.sent;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: packs.length,
    expiredPacksDeleted: expired.length,
    objectsDeleted,
    pending,
    remindersSent,
  });
}

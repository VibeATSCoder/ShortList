import { beforeEach, describe, expect, it, vi } from "vitest";

const sendTransactionalEmail = vi.hoisted(() => vi.fn(async () => ({ messageId: "test-message" })));

vi.mock("@/lib/review-email", () => ({ sendTransactionalEmail }));

import { sendApplicationNotifications } from "@/lib/application-email";
import type { TransactionalEmail } from "@/lib/review-email";

describe("application notifications", () => {
  beforeEach(() => sendTransactionalEmail.mockClear());

  it("sends a separate candidate acknowledgement and deduplicated CV notifications", async () => {
    const result = await sendApplicationNotifications({
      candidateEmail: "candidate@example.com",
      candidateName: "Alex Morgan",
      internalRecipients: ["hr@example.com", "reviewer@example.com", "HR@example.com"],
      panelUrl: "https://ats.example.com/workspace",
      positionTitle: "AI Engineer",
      recommendation: "match",
      resume: { fileName: "alex.pdf", bytes: new Uint8Array([1, 2, 3]), contentType: "application/pdf" },
      score: 82,
    });

    expect(result).toEqual({ candidateAcknowledged: true, internalSent: 2, internalFailed: 0 });
    expect(sendTransactionalEmail).toHaveBeenCalledTimes(3);
    const calls = sendTransactionalEmail.mock.calls as unknown as Array<[TransactionalEmail]>;
    const messages = calls.map(([message]) => message);
    const candidateMessage = messages.find((message) => message.to === "candidate@example.com");
    expect(candidateMessage?.subject).toContain("We received your application");
    expect(candidateMessage?.attachments).toBeUndefined();
    expect(messages.filter((message) => message.attachments?.[0]?.filename === "alex.pdf")).toHaveLength(2);
  });
});

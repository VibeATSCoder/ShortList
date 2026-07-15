import { describe, expect, it } from "vitest";

import { planEntitlements } from "@/lib/plans";

describe("organization plans", () => {
  it("keeps the free plan intentionally bounded", () => {
    const free = planEntitlements("free");
    expect(free.positionLimit).toBe(1);
    expect(free.candidateLimitPerPosition).toBe(5);
    expect(free.emailSending).toBe(false);
    expect(free.reviewerDirectory).toBe(false);
    expect(free.automations).toBe(false);
  });

  it("enables team workflows on pro", () => {
    const pro = planEntitlements("pro");
    expect(pro.positionLimit).toBeGreaterThan(1);
    expect(pro.candidateLimitPerPosition).toBeGreaterThan(5);
    expect(pro.emailSending).toBe(true);
    expect(pro.reviewerDirectory).toBe(true);
    expect(pro.templates).toBe(true);
    expect(pro.automations).toBe(true);
    expect(pro.teamAccess).toBe(true);
    expect(pro.auditExport).toBe(true);
  });
});

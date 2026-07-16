import { describe, expect, it } from "vitest";

import { isPublicDemoAccountEmail, PUBLIC_DEMO_ACCOUNTS } from "@/lib/public-demo-accounts";

describe("public demo accounts", () => {
  it("publishes distinct Free and Pro credentials", () => {
    expect(PUBLIC_DEMO_ACCOUNTS.free.email).not.toBe(PUBLIC_DEMO_ACCOUNTS.pro.email);
    expect(PUBLIC_DEMO_ACCOUNTS.free.password).not.toBe(PUBLIC_DEMO_ACCOUNTS.pro.password);
    expect(PUBLIC_DEMO_ACCOUNTS.free.password.length).toBeGreaterThanOrEqual(14);
    expect(PUBLIC_DEMO_ACCOUNTS.pro.password.length).toBeGreaterThanOrEqual(14);
  });

  it("recognizes only canonical public demo emails", () => {
    expect(isPublicDemoAccountEmail("FREE@ats.mehdisharifi.com ")).toBe(true);
    expect(isPublicDemoAccountEmail("pro@ats.mehdisharifi.com")).toBe(true);
    expect(isPublicDemoAccountEmail("reviews@ats.mehdisharifi.com")).toBe(false);
  });
});

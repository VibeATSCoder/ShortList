import { describe, expect, it } from "vitest";

import { demoWorkspaceSnapshot } from "@/lib/workspace-demo";

describe("demo workspaces", () => {
  it("exposes a bounded Free sandbox", () => {
    const snapshot = demoWorkspaceSnapshot(undefined, "free");

    expect(snapshot.mode).toBe("demo");
    expect(snapshot.plan.tier).toBe("free");
    expect(snapshot.session.email).toBe("free-demo@ats.mehdisharifi.com");
    expect(snapshot.positions).toHaveLength(1);
    expect(snapshot.plan.positionLimit).toBe(1);
    expect(snapshot.team).toEqual([]);
    expect(snapshot.templates).toEqual([]);
    expect(snapshot.automations).toEqual([]);
    expect(snapshot.audit).toEqual([]);
    expect(snapshot.capabilities.smtp).toBe(false);
  });

  it("exposes the complete Pro sandbox without production capabilities", () => {
    const snapshot = demoWorkspaceSnapshot(undefined, "pro");

    expect(snapshot.plan.tier).toBe("pro");
    expect(snapshot.session.email).toBe("pro-demo@ats.mehdisharifi.com");
    expect(snapshot.positions.length).toBeGreaterThan(1);
    expect(snapshot.team.length).toBeGreaterThan(0);
    expect(snapshot.templates.length).toBeGreaterThan(0);
    expect(snapshot.automations.length).toBeGreaterThan(0);
    expect(snapshot.audit.length).toBeGreaterThan(0);
    expect(snapshot.capabilities).toEqual({ database: false, smtp: false, ai: false, privateFiles: false });
  });

  it("does not allow a Free demo URL to select a Pro-only position", () => {
    const snapshot = demoWorkspaceSnapshot("pos-automation-engineer", "free");
    expect(snapshot.activePosition.id).toBe("pos-solo-ai-builder");
  });
});

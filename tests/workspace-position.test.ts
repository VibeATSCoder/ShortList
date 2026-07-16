import { afterEach, describe, expect, it } from "vitest";

import { isProtectedPositionId } from "@/lib/workspace-repository";

const originalShowcase = process.env.SHOWCASE_POSITION_ID;
const originalShowcases = process.env.SHOWCASE_POSITION_IDS;
const originalPublic = process.env.PUBLIC_INTAKE_POSITION_ID;

afterEach(() => {
  if (originalShowcase === undefined) delete process.env.SHOWCASE_POSITION_ID;
  else process.env.SHOWCASE_POSITION_ID = originalShowcase;
  if (originalShowcases === undefined) delete process.env.SHOWCASE_POSITION_IDS;
  else process.env.SHOWCASE_POSITION_IDS = originalShowcases;
  if (originalPublic === undefined) delete process.env.PUBLIC_INTAKE_POSITION_ID;
  else process.env.PUBLIC_INTAKE_POSITION_ID = originalPublic;
});

describe("showcase position protection", () => {
  it("locks only the explicitly configured showcase position", () => {
    delete process.env.SHOWCASE_POSITION_IDS;
    process.env.SHOWCASE_POSITION_ID = "fbdf3581-ea2e-48e1-a1bc-2e1a6b6c6dfb";
    process.env.PUBLIC_INTAKE_POSITION_ID = "deb2e7b0-a02a-474f-a1be-a54786ccd517";

    expect(isProtectedPositionId("fbdf3581-ea2e-48e1-a1bc-2e1a6b6c6dfb")).toBe(true);
    expect(isProtectedPositionId("deb2e7b0-a02a-474f-a1be-a54786ccd517")).toBe(false);
    expect(isProtectedPositionId("fbb59104-ddc8-4e63-aa56-53551dcf6d0f")).toBe(false);
  });

  it("locks every position in the explicit showcase list", () => {
    process.env.SHOWCASE_POSITION_IDS = "fbdf3581-ea2e-48e1-a1bc-2e1a6b6c6dfb, fbb59104-ddc8-4e63-aa56-53551dcf6d0f";
    process.env.SHOWCASE_POSITION_ID = "fbdf3581-ea2e-48e1-a1bc-2e1a6b6c6dfb";

    expect(isProtectedPositionId("fbdf3581-ea2e-48e1-a1bc-2e1a6b6c6dfb")).toBe(true);
    expect(isProtectedPositionId("fbb59104-ddc8-4e63-aa56-53551dcf6d0f")).toBe(true);
    expect(isProtectedPositionId("deb2e7b0-a02a-474f-a1be-a54786ccd517")).toBe(false);
  });
});

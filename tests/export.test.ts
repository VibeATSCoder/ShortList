import { describe, expect, it } from "vitest";

import { __test__, candidatesToCsv } from "@/lib/export";
import { DEMO_CANDIDATES } from "@/lib/demo-data";

describe("CSV export", () => {
  it("escapes commas and quotes", () => {
    expect(__test__.escapeCsv('Builder, "fast"')).toBe('"Builder, ""fast"""');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(__test__.escapeCsv("=HYPERLINK(\"bad\")")).toBe(
      '"\'=HYPERLINK(""bad"")"',
    );
  });

  it("can export a blind shortlist without real candidate names", () => {
    const csv = candidatesToCsv(DEMO_CANDIDATES, true);
    expect(csv).toContain("Candidate 01");
    expect(csv).not.toContain("Mina Khosravi");
  });
});


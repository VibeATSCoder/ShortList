import { describe, expect, it } from "vitest";

import { screeningRequestSchema, redactTextPII } from "@/lib/assessment";
import { DEMO_CANDIDATES } from "@/lib/demo-data";
import { localizeDemoCandidate } from "@/lib/demo-data-fa";
import { candidatesToCsv } from "@/lib/export";
import {
  anonymousCandidateName,
  directionForLocale,
  formatNumber,
  getCopy,
  localizeApiError,
  normalizeSearch,
} from "@/lib/i18n";

describe("bilingual product contract", () => {
  it("provides complete Persian direction, labels, and number formatting", () => {
    expect(directionForLocale("fa")).toBe("rtl");
    expect(getCopy("fa").dashboard.candidateShortlist).toContain("داوطلبان");
    expect(formatNumber(123, "fa")).toBe("۱۲۳");
    expect(anonymousCandidateName(4, "fa")).toBe("داوطلب ۰۴");
  });

  it("normalizes Persian and Arabic keyboard variants for search", () => {
    expect(normalizeSearch("علي كريمي")).toBe(normalizeSearch("علی کریمی"));
  });

  it("localizes stable API codes without exposing provider text", () => {
    expect(localizeApiError("INVALID_PDF", "fa")).toContain("PDF");
    expect(localizeApiError("NOT_A_REAL_CODE", "fa")).toBe(
      getCopy("fa").apiErrors.UNKNOWN,
    );
  });

  it("translates demo analysis while preserving IDs and source evidence", () => {
    const source = DEMO_CANDIDATES[0];
    const localized = localizeDemoCandidate(source, "fa");
    expect(localized.id).toBe(source.id);
    expect(localized.score).toBe(source.score);
    expect(localized.summary).not.toBe(source.summary);
    expect(localized.rubric[0].evidence).toEqual(source.rubric[0].evidence);
  });

  it("creates an Excel-friendly Persian export", () => {
    const csv = candidatesToCsv([DEMO_CANDIDATES[0]], true, "fa");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("داوطلب ۰۱");
    expect(csv).toContain(getCopy("fa").export.aiRecommendation);
  });
});

describe("localized screening input", () => {
  const resume = {
    fileName: "resume.txt",
    mimeType: "text/plain" as const,
    dataUrl: `data:text/plain;base64,${Buffer.from("resume evidence").toString("base64")}`,
  };
  const job = {
    title: "Engineer",
    description: "A".repeat(80),
  };

  it("defaults older clients to English and accepts Persian explicitly", () => {
    expect(screeningRequestSchema.parse({ job, resume }).locale).toBe("en");
    expect(screeningRequestSchema.parse({ locale: "fa", job, resume }).locale).toBe("fa");
  });

  it("redacts phone numbers without destroying employment date ranges", () => {
    const redacted = redactTextPII("Worked 2016 - 2024. Call +98 912 123 4567.");
    expect(redacted).toContain("2016 - 2024");
    expect(redacted).toContain("[phone removed]");
  });
});

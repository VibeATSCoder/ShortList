import { describe, expect, it } from "vitest";

import {
  __test__,
  candidatesToCsv,
  sanitizeCandidateForBlindExport,
} from "@/lib/export";
import { DEMO_CANDIDATES } from "@/lib/demo-data";
import type { ScreeningResult } from "@/lib/types";

function candidateWithIdentityLeaks(): ScreeningResult {
  const candidate = structuredClone(DEMO_CANDIDATES[0]);
  const identity =
    "Mina Khosravi · mina@example.com · +98 912 123 4567 · https://mina.example/profile";

  return {
    ...candidate,
    id: "candidate-audit-7",
    fileName: "mina-khosravi-cv.pdf",
    profile: {
      ...candidate.profile,
      currentRole: `Founder — ${identity}`,
    },
    verdict: identity,
    summary: `Contact ${identity}`,
    rubric: candidate.rubric.map((item) => ({
      ...item,
      label: `${item.label} — Mina Khosravi`,
      rationale: identity,
      evidence: [identity, "Portfolio: www.mina.example or mina-portfolio.dev/work"],
    })),
    mustHaves: candidate.mustHaves.map((item) => ({
      ...item,
      requirement: `${item.requirement} — Mina Khosravi`,
      evidence: identity,
    })),
    strengths: [identity],
    gaps: [`Call ۰۹۱۲ ۱۲۳ ۴۵۶۷ about Mina Khosravi`],
    risks: [{ risk: identity, severity: "low", evidence: identity }],
    interviewQuestions: [{ question: identity, why: identity }],
    fairnessNote: identity,
  };
}

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

  it("sanitizes identity and contact details across every narrative field", () => {
    const candidate = candidateWithIdentityLeaks();
    const sanitized = sanitizeCandidateForBlindExport(candidate, "Candidate 07");
    const serialized = JSON.stringify(sanitized);

    expect(sanitized.fileName).toBe("identity-redacted.resume");
    expect(sanitized.profile.displayName).toBe("Candidate 07");
    expect(serialized).not.toMatch(/Mina Khosravi/iu);
    expect(serialized).not.toContain("mina@example.com");
    expect(serialized).not.toContain("+98 912 123 4567");
    expect(serialized).not.toContain("۰۹۱۲ ۱۲۳ ۴۵۶۷");
    expect(serialized).not.toContain("https://mina.example/profile");
    expect(serialized).not.toContain("www.mina.example");
    expect(serialized).not.toContain("mina-portfolio.dev/work");
    expect(serialized).toContain("[email removed]");
    expect(serialized).toContain("[phone removed]");
    expect(serialized).toContain("[link removed]");
  });

  it("preserves analytical fields and audit metadata without mutating input", () => {
    const candidate = candidateWithIdentityLeaks();
    const original = structuredClone(candidate);
    const sanitized = sanitizeCandidateForBlindExport(candidate, "Candidate 07");

    expect(sanitized.id).toBe(candidate.id);
    expect(sanitized.source).toBe(candidate.source);
    expect(sanitized.score).toBe(candidate.score);
    expect(sanitized.recommendation).toBe(candidate.recommendation);
    expect(sanitized.confidence).toBe(candidate.confidence);
    expect(sanitized.humanDecision).toBe(candidate.humanDecision);
    expect(sanitized.meta).toEqual(candidate.meta);
    expect(candidate).toEqual(original);
    expect(sanitized).not.toBe(candidate);
  });

  it("uses sanitized candidate text for blind CSV rows only", () => {
    const candidate = candidateWithIdentityLeaks();
    const blindCsv = candidatesToCsv([candidate], true);
    const identifiedCsv = candidatesToCsv([candidate], false);

    expect(blindCsv).toContain("Candidate 01");
    expect(blindCsv).not.toContain("Mina Khosravi");
    expect(blindCsv).not.toContain("mina@example.com");
    expect(blindCsv).not.toContain("+98 912 123 4567");
    expect(blindCsv).not.toContain("https://mina.example/profile");
    expect(identifiedCsv).toContain("Mina Khosravi");
    expect(identifiedCsv).toContain("mina@example.com");
  });
});

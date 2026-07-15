import { afterEach, describe, expect, it } from "vitest";

import { createAssessmentSeal, verifyAssessmentSeal } from "@/lib/assessment-seal";
import { DEMO_CANDIDATES, DEMO_JOB } from "@/lib/demo-data";

const originalSecret = process.env.ASSESSMENT_SEAL_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.ASSESSMENT_SEAL_SECRET;
  else process.env.ASSESSMENT_SEAL_SECRET = originalSecret;
});

describe("assessment seals", () => {
  it("survives validator trimming without allowing content changes", () => {
    process.env.ASSESSMENT_SEAL_SECRET = "test-only-assessment-seal-secret-123456789";
    const assessment = { ...DEMO_CANDIDATES[0], source: "live" as const };
    const seal = createAssessmentSeal(DEMO_JOB, assessment);
    expect(seal).toBeTruthy();

    const validatorNormalized = structuredClone(assessment);
    validatorNormalized.summary = `  ${validatorNormalized.summary}  `;
    validatorNormalized.profile.currentRole = `${validatorNormalized.profile.currentRole}\n`;
    validatorNormalized.rubric[0].evidence[0] = ` ${validatorNormalized.rubric[0].evidence[0]} `;
    expect(verifyAssessmentSeal(DEMO_JOB, validatorNormalized, seal!)).toBe(true);

    validatorNormalized.summary = "Different assessment content";
    expect(verifyAssessmentSeal(DEMO_JOB, validatorNormalized, seal!)).toBe(false);
  });
});

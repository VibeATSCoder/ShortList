import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";

import {
  aiAssessmentSchema,
  estimateDataUrlBytes,
  normalizeAssessment,
  recommendationForScore,
  redactTextPII,
  type AIAssessment,
} from "@/lib/assessment";

const assessment: AIAssessment = {
  profile: {
    displayName: "Test Candidate",
    currentRole: "Product Engineer",
    yearsExperience: 3,
  },
  confidence: "high",
  verdict: "Strong, evidence-backed fit.",
  summary: "The resume contains direct role evidence.",
  rubric: [
    {
      key: "core_skills",
      score: 99,
      rationale: "Relevant tools are demonstrated.",
      evidence: ["Built with TypeScript and Python"],
    },
    {
      key: "relevant_experience",
      score: 17,
      rationale: "Directly comparable work.",
      evidence: ["Three years in product engineering"],
    },
    {
      key: "demonstrated_impact",
      score: 18,
      rationale: "Outcomes are quantified.",
      evidence: ["Reduced processing time by 40%"],
    },
    {
      key: "ownership_delivery",
      score: 14,
      rationale: "Owned launch end to end.",
      evidence: ["Shipped the first release solo"],
    },
    {
      key: "role_context",
      score: 8,
      rationale: "Worked under similar constraints.",
      evidence: ["Turned founder briefs into weekly releases"],
    },
    {
      key: "communication",
      score: 4,
      rationale: "Evidence is clear.",
      evidence: ["Documented decisions and outcomes"],
    },
  ],
  mustHaves: [
    {
      requirement: "Solo product delivery",
      status: "met",
      evidence: "Shipped the first release solo.",
    },
  ],
  strengths: ["Full-stack delivery", "Measured outcomes"],
  gaps: ["No mobile example"],
  risks: [],
  interviewQuestions: [
    { question: "What did you ship first?", why: "Tests prioritization." },
    { question: "What failed?", why: "Tests operating depth." },
    { question: "What did you defer?", why: "Tests pragmatic judgment." },
  ],
  fairnessNote: "Only role-relevant evidence was considered.",
  parseQuality: {
    score: 94,
    contact: "parsed",
    experience: "parsed",
    skills: "parsed",
    dates: "partial",
    warnings: ["One date range is incomplete."],
  },
};

function validSchemaAssessment(): AIAssessment {
  return {
    ...assessment,
    rubric: assessment.rubric.map((item) => ({
      ...item,
      score: Math.min(item.score, 30),
    })),
  };
}

describe("aiAssessmentSchema rubric contract", () => {
  it("remains compatible with OpenAI Structured Outputs", () => {
    const format = zodTextFormat(aiAssessmentSchema, "candidate_assessment");
    const schema = format.schema as {
      properties?: { rubric?: { minItems?: number; maxItems?: number } };
    };

    expect(schema.properties?.rubric).toMatchObject({
      minItems: 6,
      maxItems: 6,
    });
  });

  it("accepts all six rubric dimensions exactly once", () => {
    expect(aiAssessmentSchema.safeParse(validSchemaAssessment()).success).toBe(
      true,
    );
  });

  it("rejects a duplicate dimension even when the array has six entries", () => {
    const duplicate = validSchemaAssessment();
    duplicate.rubric[5] = { ...duplicate.rubric[0] };

    expect(aiAssessmentSchema.safeParse(duplicate).success).toBe(false);
  });

  it("rejects an assessment with a missing dimension", () => {
    const missing = validSchemaAssessment();
    missing.rubric = missing.rubric.slice(0, -1);

    expect(aiAssessmentSchema.safeParse(missing).success).toBe(false);
  });
});

describe("recommendationForScore", () => {
  it.each([
    [100, "strong_match"],
    [85, "strong_match"],
    [84, "match"],
    [72, "match"],
    [71, "review"],
    [58, "review"],
    [57, "low_match"],
    [0, "low_match"],
  ] as const)("maps %i to %s", (score, expected) => {
    expect(recommendationForScore(score)).toBe(expected);
  });
});

describe("normalizeAssessment", () => {
  it("caps every dimension, recomputes the total, and derives the recommendation", () => {
    const result = normalizeAssessment(assessment, {
      id: "candidate-1",
      fileName: "candidate.pdf",
      model: "test-model",
      durationMs: 1200,
    });

    expect(result.rubric).toHaveLength(6);
    expect(result.rubric[0].score).toBe(30);
    expect(result.score).toBe(91);
    expect(result.recommendation).toBe("strong_match");
    expect(result.meta.promptVersion).toBe("screen-v2.1.0");
  });

  it("fills a missing rubric dimension conservatively", () => {
    const partial = { ...assessment, rubric: assessment.rubric.slice(0, 1) };
    const result = normalizeAssessment(partial, {
      id: "candidate-2",
      fileName: "candidate.txt",
      model: "test-model",
      durationMs: 500,
    });

    expect(result.score).toBe(30);
    expect(result.rubric[1].score).toBe(0);
    expect(result.rubric[1].evidence).toEqual([]);
  });
});

describe("input privacy helpers", () => {
  it("redacts contact details and links from text resumes", () => {
    const result = redactTextPII(
      "Reach me at test@example.com or +98 912 123 4567. https://example.com/me",
    );

    expect(result).not.toContain("test@example.com");
    expect(result).not.toContain("912 123 4567");
    expect(result).not.toContain("https://example.com");
    expect(result).toContain("[email removed]");
    expect(result).toContain("[phone removed]");
  });

  it("estimates base64 payload bytes", () => {
    const dataUrl = `data:text/plain;base64,${Buffer.from("hello").toString("base64")}`;
    expect(estimateDataUrlBytes(dataUrl)).toBe(5);
  });
});

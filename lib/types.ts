export const RUBRIC = [
  { key: "core_skills", label: "Core skills", maxScore: 30 },
  { key: "relevant_experience", label: "Relevant experience", maxScore: 20 },
  { key: "demonstrated_impact", label: "Demonstrated impact", maxScore: 20 },
  { key: "ownership_delivery", label: "Ownership & delivery", maxScore: 15 },
  { key: "role_context", label: "Role context", maxScore: 10 },
  { key: "communication", label: "Communication clarity", maxScore: 5 },
] as const;

export type RubricKey = (typeof RUBRIC)[number]["key"];
export type Recommendation =
  | "strong_match"
  | "match"
  | "review"
  | "low_match";
export type Confidence = "high" | "medium" | "low";
export type HumanDecision = "advance" | "hold" | "decline" | null;

export interface CandidateProfile {
  displayName: string;
  currentRole: string;
  yearsExperience: number;
}

export interface RubricScore {
  key: RubricKey;
  label: string;
  score: number;
  maxScore: number;
  rationale: string;
  evidence: string[];
}

export interface MustHaveCheck {
  requirement: string;
  status: "met" | "partial" | "missing" | "unclear";
  evidence: string;
}

export interface RiskFlag {
  risk: string;
  severity: "low" | "medium" | "high";
  evidence: string;
}

export interface InterviewQuestion {
  question: string;
  why: string;
}

export interface ScreeningMeta {
  model: string;
  promptVersion: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  requestId: string | null;
  assessedAt: string;
}

export interface ScreeningResult {
  id: string;
  fileName: string;
  source: "demo" | "live";
  profile: CandidateProfile;
  score: number;
  recommendation: Recommendation;
  confidence: Confidence;
  verdict: string;
  summary: string;
  rubric: RubricScore[];
  mustHaves: MustHaveCheck[];
  strengths: string[];
  gaps: string[];
  risks: RiskFlag[];
  interviewQuestions: InterviewQuestion[];
  fairnessNote: string;
  humanDecision: HumanDecision;
  meta: ScreeningMeta;
  parseQuality?: ResumeParseQuality;
}

export interface ResumeParseQuality {
  score: number;
  contact: "parsed" | "partial" | "missing";
  experience: "parsed" | "partial" | "missing";
  skills: "parsed" | "partial" | "missing";
  dates: "parsed" | "partial" | "missing";
  warnings: string[];
}

export interface JobProfile {
  title: string;
  description: string;
  criteria?: JobCriterion[];
}

export interface JobCriterion {
  kind: "must_have" | "nice_to_have" | "disqualifier";
  label: string;
}

export interface ScreeningResponse {
  result: ScreeningResult;
  promptVersion?: string;
  workspaceSeal?: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: Record<string, string[]>;
  };
}

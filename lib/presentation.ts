import type {
  HumanDecision,
  Recommendation,
  ScreeningResult,
} from "@/lib/types";

export const recommendationLabels: Record<Recommendation, string> = {
  strong_match: "Strong match",
  match: "Match",
  review: "Review",
  low_match: "Low match",
};

export const decisionLabels: Record<Exclude<HumanDecision, null>, string> = {
  advance: "Advance",
  hold: "Hold",
  decline: "Decline",
};

export function anonymousName(rank: number): string {
  return `Candidate ${String(rank).padStart(2, "0")}`;
}

export function candidateName(
  candidate: ScreeningResult,
  rank: number,
  blindMode: boolean,
): string {
  return blindMode ? anonymousName(rank) : candidate.profile.displayName;
}

export function candidateInitials(
  candidate: ScreeningResult,
  rank: number,
  blindMode: boolean,
): string {
  if (blindMode) return String(rank).padStart(2, "0");
  return candidate.profile.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDuration(durationMs: number): string {
  return durationMs >= 1_000
    ? `${(durationMs / 1_000).toFixed(1)}s`
    : `${durationMs}ms`;
}


import type {
  HumanDecision,
  Recommendation,
  ScreeningResult,
} from "@/lib/types";
import {
  anonymousCandidateName,
  formatDuration as formatLocalizedDuration,
  toPersianDigits,
  type Locale,
} from "@/lib/i18n";

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

export function anonymousName(rank: number, locale: Locale = "en"): string {
  return anonymousCandidateName(rank, locale);
}

export function candidateName(
  candidate: ScreeningResult,
  rank: number,
  blindMode: boolean,
  locale: Locale = "en",
): string {
  return blindMode ? anonymousName(rank, locale) : candidate.profile.displayName;
}

export function candidateInitials(
  candidate: ScreeningResult,
  rank: number,
  blindMode: boolean,
  locale: Locale = "en",
): string {
  if (blindMode) {
    const value = String(rank).padStart(2, "0");
    return locale === "fa" ? toPersianDigits(value) : value;
  }
  return candidate.profile.displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDuration(
  durationMs: number,
  locale: Locale = "en",
): string {
  return formatLocalizedDuration(durationMs, locale);
}

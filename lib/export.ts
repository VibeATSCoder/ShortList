import type { ScreeningResult } from "@/lib/types";
import {
  anonymousCandidateName,
  getCopy,
  type Locale,
} from "@/lib/i18n";

function escapeCsv(value: string | number): string {
  let normalized = String(value).replace(/\r?\n/g, " ");
  // Prevent spreadsheet software from executing exported cells as formulas.
  if (/^[=+\-@\t\r]/.test(normalized)) normalized = `'${normalized}`;
  return /[",]/.test(normalized)
    ? `"${normalized.replace(/"/g, '""')}"`
    : normalized;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redactBlindExportText(
  value: string,
  candidateDisplayName: string,
  anonymousName: string,
): string {
  const trimmedDisplayName = candidateDisplayName.trim();
  let sanitized = value;

  if (trimmedDisplayName) {
    sanitized = sanitized.replace(
      new RegExp(escapeRegExp(trimmedDisplayName), "giu"),
      () => anonymousName,
    );
  }

  return sanitized
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/giu, "[email removed]")
    .replace(
      /(?:\+|00)?[0-9\u0660-\u0669\u06F0-\u06F9][0-9\u0660-\u0669\u06F0-\u06F9\s().-]{7,}[0-9\u0660-\u0669\u06F0-\u06F9]/gu,
      (match) =>
        (match.match(/[0-9\u0660-\u0669\u06F0-\u06F9]/gu)?.length ?? 0) >= 10
          ? "[phone removed]"
          : match,
    )
    .replace(/(?:https?:\/\/|www\.)[^\s<>"']+/giu, "[link removed]")
    .replace(
      /\b(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:com|org|net|io|ai|dev|app|co|ir|me|info|biz|xyz|tech|site|online|cloud)(?:\/[^\s<>"']*)?/giu,
      "[link removed]",
    )
    .replace(/[\u202A-\u202E\u2066-\u2069]/gu, "");
}

/**
 * Returns an immutable, identity-safe assessment for blind exports.
 *
 * Assessment values and audit metadata remain unchanged. Only explicit identity
 * fields and free-text fields that can repeat resume PII are transformed.
 */
export function sanitizeCandidateForBlindExport(
  candidate: ScreeningResult,
  anonymousName = "Candidate",
): ScreeningResult {
  const sanitize = (value: string) =>
    redactBlindExportText(
      value,
      candidate.profile.displayName,
      anonymousName,
    );

  return {
    ...candidate,
    fileName: "identity-redacted.resume",
    profile: {
      ...candidate.profile,
      displayName: anonymousName,
      currentRole: sanitize(candidate.profile.currentRole),
    },
    verdict: sanitize(candidate.verdict),
    summary: sanitize(candidate.summary),
    rubric: candidate.rubric.map((item) => ({
      ...item,
      label: sanitize(item.label),
      rationale: sanitize(item.rationale),
      evidence: item.evidence.map(sanitize),
    })),
    mustHaves: candidate.mustHaves.map((item) => ({
      ...item,
      requirement: sanitize(item.requirement),
      evidence: sanitize(item.evidence),
    })),
    strengths: candidate.strengths.map(sanitize),
    gaps: candidate.gaps.map(sanitize),
    risks: candidate.risks.map((item) => ({
      ...item,
      risk: sanitize(item.risk),
      evidence: sanitize(item.evidence),
    })),
    interviewQuestions: candidate.interviewQuestions.map((item) => ({
      question: sanitize(item.question),
      why: sanitize(item.why),
    })),
    fairnessNote: sanitize(candidate.fairnessNote),
  };
}

export function candidateForBlindExport(
  candidate: ScreeningResult,
  rank: number,
  locale: Locale = "en",
): ScreeningResult {
  return sanitizeCandidateForBlindExport(
    candidate,
    anonymousCandidateName(rank, locale),
  );
}

export const __test__ = { escapeCsv, redactBlindExportText };

export function candidatesToCsv(
  candidates: ScreeningResult[],
  blindMode = false,
  locale: Locale = "en",
): string {
  const copy = getCopy(locale);
  const header = [
    copy.export.rank,
    copy.export.candidate,
    copy.export.score,
    copy.export.aiRecommendation,
    copy.export.confidence,
    copy.export.humanDecision,
    copy.export.currentRole,
    copy.export.yearsExperience,
    copy.export.topStrengths,
    copy.export.evidenceGaps,
    copy.export.model,
    copy.export.assessedAt,
  ];

  const rows = [...candidates]
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => {
      const exportedCandidate = blindMode
        ? candidateForBlindExport(candidate, index + 1, locale)
        : candidate;

      return [
        index + 1,
        exportedCandidate.profile.displayName,
        exportedCandidate.score,
        copy.recommendationLabels[exportedCandidate.recommendation],
        copy.confidenceLabels[exportedCandidate.confidence],
        exportedCandidate.humanDecision
          ? copy.decisionLabels[exportedCandidate.humanDecision]
          : copy.export.unreviewed,
        exportedCandidate.profile.currentRole,
        exportedCandidate.profile.yearsExperience,
        exportedCandidate.strengths.join(" | "),
        exportedCandidate.gaps.join(" | "),
        exportedCandidate.meta.model,
        exportedCandidate.meta.assessedAt,
      ];
    });

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
  return locale === "fa" ? `\uFEFF${csv}` : csv;
}

export function downloadTextFile(
  contents: string,
  fileName: string,
  mimeType: string,
) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

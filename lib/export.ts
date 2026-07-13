import type { ScreeningResult } from "@/lib/types";

function escapeCsv(value: string | number): string {
  let normalized = String(value).replace(/\r?\n/g, " ");
  // Prevent spreadsheet software from executing exported cells as formulas.
  if (/^[=+\-@\t\r]/.test(normalized)) normalized = `'${normalized}`;
  return /[",]/.test(normalized)
    ? `"${normalized.replace(/"/g, '""')}"`
    : normalized;
}

export const __test__ = { escapeCsv };

export function candidatesToCsv(
  candidates: ScreeningResult[],
  blindMode = false,
): string {
  const header = [
    "Rank",
    "Candidate",
    "Score",
    "AI recommendation",
    "Confidence",
    "Human decision",
    "Current role",
    "Years experience",
    "Top strengths",
    "Evidence gaps",
    "Model",
    "Assessed at",
  ];

  const rows = [...candidates]
    .sort((a, b) => b.score - a.score)
    .map((candidate, index) => [
      index + 1,
      blindMode ? `Candidate ${String(index + 1).padStart(2, "0")}` : candidate.profile.displayName,
      candidate.score,
      candidate.recommendation.replaceAll("_", " "),
      candidate.confidence,
      candidate.humanDecision ?? "unreviewed",
      candidate.profile.currentRole,
      candidate.profile.yearsExperience,
      candidate.strengths.join(" | "),
      candidate.gaps.join(" | "),
      candidate.meta.model,
      candidate.meta.assessedAt,
    ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
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

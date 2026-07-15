import type {
  Confidence,
  HumanDecision,
  MustHaveCheck,
  Recommendation,
  RiskFlag,
  RubricKey,
} from "@/lib/types";

export const LOCALES = ["en", "fa"] as const;
export type Locale = (typeof LOCALES)[number];
export type TextDirection = "ltr" | "rtl";

type Decision = Exclude<HumanDecision, null>;
type MustHaveStatus = MustHaveCheck["status"];
type Severity = RiskFlag["severity"];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "shortlist_locale";
export const LOCALE_STORAGE_KEY = "shortlist.locale";

export const localeTags: Record<Locale, string> = {
  en: "en-US",
  fa: "fa-IR",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function directionForLocale(locale: Locale): TextDirection {
  return locale === "fa" ? "rtl" : "ltr";
}

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(localeTags[locale], options).format(value);
}

export function formatDuration(durationMs: number, locale: Locale): string {
  if (durationMs >= 1_000) {
    const seconds = durationMs / 1_000;
    const formatted = formatNumber(seconds, locale, {
      minimumFractionDigits: seconds % 1 === 0 ? 0 : 1,
      maximumFractionDigits: 1,
      useGrouping: false,
    });
    return locale === "fa" ? `${formatted} ثانیه` : `${formatted}s`;
  }

  const formatted = formatNumber(Math.round(durationMs), locale, {
    maximumFractionDigits: 0,
    useGrouping: false,
  });
  return locale === "fa" ? `${formatted} میلی‌ثانیه` : `${formatted}ms`;
}

const digitMap: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

/**
 * Produces a comparison-safe search value across English, Persian, and Arabic
 * keyboard variants. It also removes bidi controls so uploaded text cannot
 * visually disguise a search match.
 */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "ه")
    .replace(/[ةۀ]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأٱ]/g, "ا")
    .replace(/[۰-۹٠-٩]/g, (digit) => digitMap[digit] ?? digit)
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[\u200C\u200D\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/ـ/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export interface UiCopy {
  localeName: string;
  localeSwitchLabel: string;
  languageShort: string;
  metadata: {
    title: string;
    description: string;
    openGraphTitle: string;
    openGraphDescription: string;
  };
  common: {
    brand: string;
    tagline: string;
    close: string;
    cancel: string;
    clear: string;
    all: string;
    open: string;
    model: string;
    prompt: string;
    retention: string;
    confidence: string;
    candidate: string;
    candidates: string;
    resumes: string;
    fitScore: (score: number) => string;
  };
  dashboard: {
    closeNavigation: string;
    openNavigation: string;
    primaryNavigation: string;
    workspace: string;
    workspaceName: string;
    overview: string;
    candidates: string;
    methodAndEvals: string;
    activeRole: string;
    screenedCount: (count: number) => string;
    zeroRetention: string;
    zeroRetentionDescription: string;
    builderRole: string;
    roles: string;
    liveAiReady: string;
    seededDemo: string;
    auditJson: string;
    screenResumes: string;
    activeShortlist: string;
    fictionalDemoData: string;
    heroTitleLead: string;
    heroTitleEmphasis: string;
    heroDescription: string;
    screenRealResume: string;
    exploreEvaluation: string;
    evaluationSummary: string;
    evidenceCoverage: string;
    blindByDefault: string;
    protectedSignalsIgnored: string;
    shortlistMetrics: string;
    inThisEvaluation: string;
    bestFit: string;
    outOfWeighted: string;
    recommended: string;
    aiSignalNotDecision: string;
    medianLatency: string;
    perResumeInRun: string;
    rankedEvidence: string;
    candidateShortlist: string;
    shortlistDescription: string;
    blindReviewOn: string;
    blindReviewOff: string;
    namesHidden: string;
    namesVisible: string;
    exportCsv: string;
    searchCandidates: string;
    searchPlaceholder: string;
    filterCandidates: string;
    filterStrong: string;
    filterMatch: string;
    filterReview: string;
    filterDecided: (count: number) => string;
    resetDemo: string;
    rank: string;
    fit: string;
    aiSignal: string;
    humanDecision: string;
    openCandidate: (name: string) => string;
    noCandidates: string;
    clearFilters: string;
    showingCandidates: (visible: number, total: number) => string;
    protectedAttributesExcluded: string;
    appStorageNone: string;
    sessionOnly: string;
    methodEyebrow: string;
    methodTitle: string;
    groundClaimsTitle: string;
    groundClaimsDescription: string;
    constrainModelTitle: string;
    constrainModelDescription: string;
    keepHumanAgencyTitle: string;
    keepHumanAgencyDescription: string;
    footerDescription: string;
    footerChallenge: string;
    decisionSaved: (decision: string) => string;
    assessmentsAdded: (count: number) => string;
    demoRestored: string;
    csvExported: (blind: boolean) => string;
    jsonExported: (blind: boolean) => string;
  };
  candidateDetail: {
    assessmentLabel: (name: string) => string;
    closeDetail: string;
    confidenceLabel: (confidence: string) => string;
    yearsExperience: (years: number) => string;
    aiPrefix: string;
    humanInLoop: string;
    yourDecision: string;
    decisionGroup: string;
    decisionNote: string;
    weightedEvidence: string;
    scoreBreakdown: string;
    noEvidence: string;
    criticalRequirements: string;
    mustHaveChecks: string;
    signal: string;
    strengths: string;
    uncertainty: string;
    evidenceGaps: string;
    validateDoNotAssume: string;
    riskFlags: string;
    closeEvidenceGaps: string;
    interviewPlan: string;
    fairnessGuardrail: string;
    fairnessApplied: string;
  };
  screeningModal: {
    newScreeningRun: string;
    title: string;
    description: string;
    closeDialog: string;
    defineTarget: string;
    defineTargetDescription: string;
    jobTitle: string;
    jobTitlePlaceholder: string;
    jobDescription: string;
    fixedRubric: string;
    skills: string;
    experience: string;
    impact: string;
    ownership: string;
    context: string;
    addCandidateEvidence: string;
    fileConstraints: string;
    dropResumes: string;
    chooseFiles: string;
    screening: string;
    done: string;
    failed: string;
    removeFile: (fileName: string) => string;
    emptyBatch: string;
    seededDemoMode: string;
    readyDescription: (model: string) => string;
    unconfiguredDescription: string;
    rawResumesNotPersisted: string;
    viewShortlist: string;
    screeningRemaining: (count: number) => string;
    screenCount: (count: number) => string;
    completedCount: (count: number) => string;
    fileReadError: string;
    maxBatchError: string;
    unsupportedFileError: (fileName: string) => string;
    fileTooLargeError: (fileName: string) => string;
    invalidResponseError: string;
    screeningFailedError: string;
    aiKeyError: string;
    jobTitleError: string;
    jobDescriptionError: string;
    resumeRequiredError: string;
  };
  errors: {
    safeFailure: string;
    appErrorTitle: string;
    appErrorDescription: string;
    resetView: string;
    notFoundEyebrow: string;
    notFoundTitle: string;
    notFoundDescription: string;
    returnHome: string;
  };
  export: {
    csvFileName: string;
    jsonFileName: string;
    rank: string;
    candidate: string;
    score: string;
    aiRecommendation: string;
    confidence: string;
    humanDecision: string;
    currentRole: string;
    yearsExperience: string;
    topStrengths: string;
    evidenceGaps: string;
    model: string;
    assessedAt: string;
    unreviewed: string;
  };
  apiErrors: {
    RATE_LIMITED: string;
    DAILY_LIMIT_REACHED: string;
    RATE_LIMIT_UNAVAILABLE: string;
    AI_NOT_CONFIGURED: string;
    ORIGIN_NOT_ALLOWED: string;
    REQUEST_TOO_LARGE: string;
    UNSUPPORTED_MEDIA_TYPE: string;
    INVALID_JSON: string;
    UNSUPPORTED_FILE_TYPE: string;
    INVALID_FILE_NAME: string;
    INVALID_FILE_ENCODING: string;
    FILE_TYPE_MISMATCH: string;
    FILE_TOO_LARGE: string;
    EMPTY_FILE: string;
    INVALID_PDF: string;
    INVALID_DOCX: string;
    INVALID_TEXT: string;
    TEXT_TOO_LONG: string;
    INVALID_REQUEST: string;
    EMPTY_MODEL_RESPONSE: string;
    AI_PROVIDER_ERROR: string;
    SCREENING_FAILED: string;
    UNKNOWN: string;
  };
  recommendationLabels: Record<Recommendation, string>;
  decisionLabels: Record<Decision, string>;
  confidenceLabels: Record<Confidence, string>;
  mustHaveStatusLabels: Record<MustHaveStatus, string>;
  severityLabels: Record<Severity, string>;
  rubricLabels: Record<RubricKey, string>;
}

const english: UiCopy = {
  localeName: "English",
  localeSwitchLabel: "Switch language to Persian",
  languageShort: "EN",
  metadata: {
    title: "Shortlist — evidence-backed resume screening",
    description:
      "Turn a job description and a batch of resumes into an explainable, human-reviewed shortlist.",
    openGraphTitle: "Shortlist — every score comes with proof",
    openGraphDescription:
      "Evidence-backed AI resume screening with blind review and human decisions.",
  },
  common: {
    brand: "Shortlist",
    tagline: "Evidence, not vibes.",
    close: "Close",
    cancel: "Cancel",
    clear: "Clear",
    all: "All",
    open: "Open",
    model: "Model",
    prompt: "Prompt",
    retention: "App storage",
    confidence: "confidence",
    candidate: "Candidate",
    candidates: "Candidates",
    resumes: "resumes",
    fitScore: (score) => `${formatNumber(score, "en")} out of 100 fit score`,
  },
  dashboard: {
    closeNavigation: "Close navigation",
    openNavigation: "Open navigation",
    primaryNavigation: "Primary navigation",
    workspace: "Workspace",
    workspaceName: "Solo builder lab",
    overview: "Overview",
    candidates: "Candidates",
    methodAndEvals: "Method & evals",
    activeRole: "Active role",
    screenedCount: (count) => `${formatNumber(count, "en")} screened`,
    zeroRetention: "Not stored by this app",
    zeroRetentionDescription:
      "Files are processed in memory. Provider handling follows the configured API account policy.",
    builderRole: "Solo AI Builder",
    roles: "Roles",
    liveAiReady: "Live AI ready",
    seededDemo: "Seeded demo",
    auditJson: "Audit JSON",
    screenResumes: "Screen resumes",
    activeShortlist: "Active shortlist · v2 evaluation",
    fictionalDemoData: "Fictional demo data",
    heroTitleLead: "Every score comes",
    heroTitleEmphasis: "with proof.",
    heroDescription:
      "Rank candidates against one explicit rubric, inspect the evidence, then make the decision yourself.",
    screenRealResume: "Screen a real resume",
    exploreEvaluation: "Explore the evaluation",
    evaluationSummary: "Evaluation summary",
    evidenceCoverage: "evidence coverage",
    blindByDefault: "Blind by default",
    protectedSignalsIgnored: "protected-trait policy applied",
    shortlistMetrics: "Shortlist metrics",
    inThisEvaluation: "in this evaluation",
    bestFit: "Best fit",
    outOfWeighted: "out of 100 weighted",
    recommended: "Recommended",
    aiSignalNotDecision: "AI signal, not a decision",
    medianLatency: "Average analysis time",
    perResumeInRun: "per resume in this run",
    rankedEvidence: "Ranked evidence",
    candidateShortlist: "Candidate shortlist",
    shortlistDescription:
      "AI recommendation and human decision are deliberately separate.",
    blindReviewOn: "Blind review on",
    blindReviewOff: "Blind review off",
    namesHidden: "Names hidden",
    namesVisible: "Names visible",
    exportCsv: "Export CSV",
    searchCandidates: "Search candidates",
    searchPlaceholder: "Search role or evidence…",
    filterCandidates: "Filter candidates",
    filterStrong: "Strong",
    filterMatch: "Match",
    filterReview: "Review",
    filterDecided: (count) => `Decided ${formatNumber(count, "en")}`,
    resetDemo: "Reset demo",
    rank: "Rank",
    fit: "Fit",
    aiSignal: "AI signal",
    humanDecision: "Human decision",
    openCandidate: (name) => `Open ${name}`,
    noCandidates: "No candidates match this view.",
    clearFilters: "Clear filters",
    showingCandidates: (visible, total) =>
      `Showing ${formatNumber(visible, "en")} of ${formatNumber(total, "en")} candidates`,
    protectedAttributesExcluded: "Protected-trait scoring policy applied",
    appStorageNone: "none",
    sessionOnly: "Decisions stay in this browser session",
    methodEyebrow: "Built for trust under a deadline",
    methodTitle: "Not a magic score. A reviewable system.",
    groundClaimsTitle: "Ground every claim",
    groundClaimsDescription:
      "Each rubric score points back to resume evidence. Missing evidence stays missing—nothing is guessed.",
    constrainModelTitle: "Constrain the model",
    constrainModelDescription:
      "Strict structured output, fixed weights, bounded input, prompt isolation, and normalized totals keep results predictable.",
    keepHumanAgencyTitle: "Keep agency human",
    keepHumanAgencyDescription:
      "Blind review, protected-signal exclusion, confidence labels, and a separate human decision prevent false automation.",
    footerDescription:
      "Decision support for hiring teams. Never an automatic hiring decision.",
    footerChallenge: "Solo-built for the 48-hour challenge · 2026",
    decisionSaved: (decision) => `Recorded for this session: ${decision}.`,
    assessmentsAdded: (count) =>
      `${formatNumber(count, "en")} live ${count === 1 ? "assessment" : "assessments"} added to the shortlist.`,
    demoRestored: "Seeded evaluation restored.",
    csvExported: (blind) =>
      `CSV exported${blind ? " with direct identifiers removed" : ""}.`,
    jsonExported: (blind) =>
      `Audit JSON exported${blind ? " with direct identifiers removed" : ""}.`,
  },
  candidateDetail: {
    assessmentLabel: (name) => `${name} assessment`,
    closeDetail: "Close candidate detail",
    confidenceLabel: (confidence) => `${confidence} confidence`,
    yearsExperience: (years) =>
      `${formatNumber(years, "en", { maximumFractionDigits: 1 })} years reported experience`,
    aiPrefix: "AI:",
    humanInLoop: "Human in the loop",
    yourDecision: "Your decision",
    decisionGroup: "Human decision",
    decisionNote:
      "AI suggests; you decide. Decisions never feed back into this candidate's score.",
    weightedEvidence: "Weighted evidence",
    scoreBreakdown: "Score breakdown",
    noEvidence: "No supporting resume evidence",
    criticalRequirements: "Critical requirements",
    mustHaveChecks: "Must-have checks",
    signal: "Signal",
    strengths: "Strengths",
    uncertainty: "Uncertainty",
    evidenceGaps: "Evidence gaps",
    validateDoNotAssume: "Validate, don't assume",
    riskFlags: "Risk flags",
    closeEvidenceGaps: "Close the evidence gaps",
    interviewPlan: "Interview plan",
    fairnessGuardrail: "Fairness guardrail",
    fairnessApplied: "Fairness guardrail applied",
  },
  screeningModal: {
    newScreeningRun: "New screening run",
    title: "Turn resumes into evidence.",
    description: "One rubric, up to five candidates, with no app-side file storage.",
    closeDialog: "Close screening dialog",
    defineTarget: "Define the target",
    defineTargetDescription:
      "The same explicit criteria are applied to every resume.",
    jobTitle: "Job title",
    jobTitlePlaceholder: "e.g. Solo AI Builder",
    jobDescription: "Job description",
    fixedRubric: "Fixed rubric",
    skills: "Skills",
    experience: "Experience",
    impact: "Impact",
    ownership: "Ownership",
    context: "Context",
    addCandidateEvidence: "Add candidate evidence",
    fileConstraints:
      "PDF, DOCX, TXT, or MD · 3 MB · text up to 120,000 characters · PDF up to 10 pages · five files max",
    dropResumes: "Drop resumes here",
    chooseFiles: "or click to choose files",
    screening: "Screening",
    done: "Done",
    failed: "Failed",
    removeFile: (fileName) => `Remove ${fileName}`,
    emptyBatch: "Your batch is empty.",
    seededDemoMode: "Seeded demo mode",
    readyDescription: (model) => `${model} · structured output · no app persistence`,
    unconfiguredDescription:
      "Add OPENAI_API_KEY to screen new resumes. The evaluation dashboard still works.",
    rawResumesNotPersisted: "This app does not persist raw resumes; provider policy still applies.",
    viewShortlist: "View shortlist",
    screeningRemaining: (count) => `Screening ${formatNumber(count, "en")}…`,
    screenCount: (count) =>
      count ? `Screen ${formatNumber(count, "en")}` : "Screen resumes",
    completedCount: (count) =>
      `${formatNumber(count, "en")} ${count === 1 ? "assessment" : "assessments"} added`,
    fileReadError: "Could not read this file.",
    maxBatchError: "A screening batch can contain up to five resumes.",
    unsupportedFileError: (fileName) =>
      `${fileName} is not a supported PDF, DOCX, TXT, or MD file.`,
    fileTooLargeError: (fileName) => `${fileName} is larger than the 3 MB limit.`,
    invalidResponseError: "The screening service returned an invalid response.",
    screeningFailedError: "Screening failed.",
    aiKeyError: "Live AI needs an OPENAI_API_KEY on the deployment.",
    jobTitleError: "Add a job title.",
    jobDescriptionError:
      "Add at least 80 characters of role context for a fair comparison.",
    resumeRequiredError: "Add at least one resume.",
  },
  errors: {
    safeFailure: "Safe failure",
    appErrorTitle: "The shortlist hit a snag.",
    appErrorDescription:
      "No resume data was stored. Reset this view and continue from the seeded evaluation.",
    resetView: "Reset view",
    notFoundEyebrow: "404 · no signal here",
    notFoundTitle: "This page did not make the shortlist.",
    notFoundDescription: "The product lives on one focused dashboard.",
    returnHome: "Return to Shortlist",
  },
  export: {
    csvFileName: "shortlist-candidates.csv",
    jsonFileName: "shortlist-audit.json",
    rank: "Rank",
    candidate: "Candidate",
    score: "Score",
    aiRecommendation: "AI recommendation",
    confidence: "Confidence",
    humanDecision: "Human decision",
    currentRole: "Current role",
    yearsExperience: "Years experience",
    topStrengths: "Top strengths",
    evidenceGaps: "Evidence gaps",
    model: "Model",
    assessedAt: "Assessed at",
    unreviewed: "unreviewed",
  },
  apiErrors: {
    RATE_LIMITED: "Too many screenings from this browser. Wait one minute and retry.",
    DAILY_LIMIT_REACHED: "This client has reached today’s screening allowance.",
    RATE_LIMIT_UNAVAILABLE:
      "Live screening is paused because the global spend guard is unavailable.",
    AI_NOT_CONFIGURED:
      "Live AI screening is unavailable because the OpenAI API key is missing, invalid, revoked, or lacks access. The deployment owner must replace OPENAI_API_KEY and redeploy.",
    ORIGIN_NOT_ALLOWED: "Open the screening workflow from this Shortlist deployment.",
    REQUEST_TOO_LARGE: "The request exceeds the deployment payload limit.",
    UNSUPPORTED_MEDIA_TYPE: "The screening request format is not supported.",
    INVALID_JSON: "The screening request could not be read.",
    UNSUPPORTED_FILE_TYPE: "Only PDF, DOCX, TXT, and Markdown resumes are supported.",
    INVALID_FILE_NAME: "The resume filename is invalid.",
    INVALID_FILE_ENCODING:
      "The uploaded file encoding does not match its declared type.",
    FILE_TYPE_MISMATCH: "The filename extension does not match the selected file type.",
    FILE_TOO_LARGE: "The resume exceeds the allowed file-size limit.",
    EMPTY_FILE: "The resume file is empty.",
    INVALID_PDF: "The PDF is malformed, encrypted, too long, or cannot be processed safely.",
    INVALID_DOCX: "The DOCX file is malformed or cannot be processed safely.",
    INVALID_TEXT: "Text resumes must be valid, non-empty UTF-8 text.",
    TEXT_TOO_LONG: "Text resumes must contain no more than 120,000 characters.",
    INVALID_REQUEST: "The screening request is invalid.",
    EMPTY_MODEL_RESPONSE:
      "The AI could not produce a complete structured assessment. Retry the resume.",
    AI_PROVIDER_ERROR:
      "The AI provider could not complete this assessment. Retry in a moment.",
    SCREENING_FAILED:
      "The assessment failed safely. No resume data was stored; retry in a moment.",
    UNKNOWN: "Something went wrong. Retry in a moment.",
  },
  recommendationLabels: {
    strong_match: "Strong match",
    match: "Match",
    review: "Review",
    low_match: "Low match",
  },
  decisionLabels: {
    advance: "Advance",
    hold: "Hold",
    decline: "Decline",
  },
  confidenceLabels: {
    high: "High",
    medium: "Medium",
    low: "Low",
  },
  mustHaveStatusLabels: {
    met: "Met",
    partial: "Partial",
    missing: "Missing",
    unclear: "Unclear",
  },
  severityLabels: {
    low: "Low",
    medium: "Medium",
    high: "High",
  },
  rubricLabels: {
    core_skills: "Core skills",
    relevant_experience: "Relevant experience",
    demonstrated_impact: "Demonstrated impact",
    ownership_delivery: "Ownership & delivery",
    role_context: "Role context",
    communication: "Communication clarity",
  },
};

const persian: UiCopy = {
  localeName: "فارسی",
  localeSwitchLabel: "تغییر زبان به انگلیسی",
  languageShort: "فا",
  metadata: {
    title: "شورت‌لیست — ارزیابی رزومه مبتنی بر شواهد",
    description:
      "شرح شغل و رزومه‌ها را به فهرستی توضیح‌پذیر و قابل بررسی توسط انسان تبدیل کنید.",
    openGraphTitle: "شورت‌لیست — هر امتیاز با مدرک همراه است",
    openGraphDescription:
      "ارزیابی رزومه با هوش مصنوعی، بررسی ناشناس و تصمیم نهایی انسانی.",
  },
  common: {
    brand: "شورت‌لیست",
    tagline: "شواهد، نه حدس.",
    close: "بستن",
    cancel: "انصراف",
    clear: "پاک کردن",
    all: "همه",
    open: "باز کردن",
    model: "مدل",
    prompt: "پرامپت",
    retention: "ذخیره‌سازی برنامه",
    confidence: "اطمینان",
    candidate: "داوطلب",
    candidates: "داوطلبان",
    resumes: "رزومه‌ها",
    fitScore: (score) => `امتیاز تطابق ${formatNumber(score, "fa")} از ۱۰۰`,
  },
  dashboard: {
    closeNavigation: "بستن منوی اصلی",
    openNavigation: "باز کردن منوی اصلی",
    primaryNavigation: "منوی اصلی",
    workspace: "فضای کاری",
    workspaceName: "آزمایشگاه سازنده مستقل",
    overview: "نمای کلی",
    candidates: "داوطلبان",
    methodAndEvals: "روش و ارزیابی‌ها",
    activeRole: "موقعیت فعال",
    screenedCount: (count) => `${formatNumber(count, "fa")} رزومه ارزیابی‌شده`,
    zeroRetention: "بدون ذخیره‌سازی در این برنامه",
    zeroRetentionDescription:
      "فایل‌ها در حافظه پردازش می‌شوند؛ نحوه نگه‌داری سرویس هوش مصنوعی تابع سیاست حساب API است.",
    builderRole: "سازنده مستقل محصولات هوش مصنوعی",
    roles: "موقعیت‌های شغلی",
    liveAiReady: "هوش مصنوعی آماده است",
    seededDemo: "دموی آماده",
    auditJson: "خروجی ممیزی JSON",
    screenResumes: "ارزیابی رزومه‌ها",
    activeShortlist: "فهرست فعال · ارزیابی نسخه ۲",
    fictionalDemoData: "داده‌های آزمایشی ساختگی",
    heroTitleLead: "هر امتیاز همراه است",
    heroTitleEmphasis: "با مدرک.",
    heroDescription:
      "داوطلبان را با یک معیار شفاف رتبه‌بندی کنید، شواهد را ببینید و تصمیم نهایی را خودتان بگیرید.",
    screenRealResume: "ارزیابی یک رزومه واقعی",
    exploreEvaluation: "مشاهده ارزیابی",
    evaluationSummary: "خلاصه ارزیابی",
    evidenceCoverage: "پوشش شواهد",
    blindByDefault: "ارزیابی ناشناس پیش‌فرض است",
    protectedSignalsIgnored: "سیاست عدم امتیازدهی به ویژگی‌های حساس",
    shortlistMetrics: "شاخص‌های فهرست منتخب",
    inThisEvaluation: "در این ارزیابی",
    bestFit: "بیشترین تطابق",
    outOfWeighted: "از ۱۰۰ امتیاز وزنی",
    recommended: "پیشنهادشده",
    aiSignalNotDecision: "پیشنهاد هوش مصنوعی، نه تصمیم نهایی",
    medianLatency: "میانگین زمان تحلیل",
    perResumeInRun: "برای هر رزومه در این اجرا",
    rankedEvidence: "شواهد رتبه‌بندی‌شده",
    candidateShortlist: "فهرست داوطلبان منتخب",
    shortlistDescription:
      "پیشنهاد هوش مصنوعی عمداً از تصمیم نهایی کارشناس جدا نگه داشته شده است.",
    blindReviewOn: "ارزیابی ناشناس روشن",
    blindReviewOff: "ارزیابی ناشناس خاموش",
    namesHidden: "نام‌ها پنهان هستند",
    namesVisible: "نام‌ها نمایش داده می‌شوند",
    exportCsv: "خروجی CSV",
    searchCandidates: "جست‌وجوی داوطلبان",
    searchPlaceholder: "جست‌وجوی نقش یا شواهد…",
    filterCandidates: "فیلتر داوطلبان",
    filterStrong: "عالی",
    filterMatch: "مناسب",
    filterReview: "نیازمند بررسی",
    filterDecided: (count) => `تصمیم‌گیری‌شده ${formatNumber(count, "fa")}`,
    resetDemo: "بازنشانی دمو",
    rank: "رتبه",
    fit: "تطابق",
    aiSignal: "پیشنهاد هوش مصنوعی",
    humanDecision: "تصمیم کارشناس",
    openCandidate: (name) => `باز کردن ارزیابی ${name}`,
    noCandidates: "هیچ داوطلبی با این فیلترها مطابقت ندارد.",
    clearFilters: "پاک کردن فیلترها",
    showingCandidates: (visible, total) =>
      `نمایش ${formatNumber(visible, "fa")} از ${formatNumber(total, "fa")} داوطلب`,
    protectedAttributesExcluded: "سیاست عدم امتیازدهی به ویژگی‌های حساس اعمال شد",
    appStorageNone: "بدون ذخیره‌سازی",
    sessionOnly: "تصمیم‌ها فقط در همین نشست مرورگر می‌مانند",
    methodEyebrow: "اعتمادپذیر، حتی زیر فشار زمان",
    methodTitle: "نه یک امتیاز جادویی؛ یک سامانه قابل بررسی.",
    groundClaimsTitle: "هر ادعا را مستند کنید",
    groundClaimsDescription:
      "هر امتیاز به شواهد رزومه متصل است. نبود شواهد همان نبود شواهد است؛ چیزی حدس زده نمی‌شود.",
    constrainModelTitle: "مدل را محدود کنید",
    constrainModelDescription:
      "خروجی ساختاریافته، وزن‌های ثابت، ورودی محدود، جداسازی پرامپت و جمع امتیاز کنترل‌شده، نتیجه را قابل پیش‌بینی می‌کنند.",
    keepHumanAgencyTitle: "اختیار را انسانی نگه دارید",
    keepHumanAgencyDescription:
      "ارزیابی ناشناس، حذف ویژگی‌های حساس، سطح اطمینان و تصمیم جداگانه کارشناس مانع خودکارسازی نادرست می‌شوند.",
    footerDescription:
      "ابزار پشتیبان تصمیم برای تیم‌های استخدام؛ هرگز تصمیم‌گیر خودکار استخدام نیست.",
    footerChallenge: "ساخته‌شده به‌صورت مستقل برای چالش ۴۸ ساعته · ۲۰۲۶",
    decisionSaved: (decision) => `برای این نشست ثبت شد: ${decision}.`,
    assessmentsAdded: (count) =>
      `${formatNumber(count, "fa")} ارزیابی زنده به فهرست اضافه شد.`,
    demoRestored: "ارزیابی آزمایشی بازنشانی شد.",
    csvExported: (blind) =>
      `فایل CSV${blind ? " با شناسه‌های مستقیم حذف‌شده" : ""} دریافت شد.`,
    jsonExported: (blind) =>
      `فایل ممیزی JSON${blind ? " با شناسه‌های مستقیم حذف‌شده" : ""} دریافت شد.`,
  },
  candidateDetail: {
    assessmentLabel: (name) => `ارزیابی ${name}`,
    closeDetail: "بستن جزئیات داوطلب",
    confidenceLabel: (confidence) => `اطمینان ${confidence}`,
    yearsExperience: (years) =>
      `${formatNumber(years, "fa", { maximumFractionDigits: 1 })} سال سابقه اعلام‌شده`,
    aiPrefix: "هوش مصنوعی:",
    humanInLoop: "نظارت انسانی",
    yourDecision: "تصمیم شما",
    decisionGroup: "تصمیم کارشناس",
    decisionNote:
      "هوش مصنوعی پیشنهاد می‌دهد و شما تصمیم می‌گیرید. تصمیم شما امتیاز این داوطلب را تغییر نمی‌دهد.",
    weightedEvidence: "شواهد وزنی",
    scoreBreakdown: "جزئیات امتیاز",
    noEvidence: "شاهد پشتیبان در رزومه یافت نشد",
    criticalRequirements: "الزامات کلیدی",
    mustHaveChecks: "بررسی الزامات ضروری",
    signal: "نقاط قوت",
    strengths: "توانمندی‌ها",
    uncertainty: "ابهام‌ها",
    evidenceGaps: "کمبود شواهد",
    validateDoNotAssume: "راستی‌آزمایی کنید، فرض نکنید",
    riskFlags: "موارد نیازمند توجه",
    closeEvidenceGaps: "کمبود شواهد را برطرف کنید",
    interviewPlan: "برنامه مصاحبه",
    fairnessGuardrail: "کنترل انصاف در ارزیابی",
    fairnessApplied: "کنترل انصاف اعمال شده است",
  },
  screeningModal: {
    newScreeningRun: "ارزیابی جدید",
    title: "رزومه را به شواهد قابل بررسی تبدیل کنید.",
    description: "یک معیار ثابت، حداکثر پنج داوطلب و بدون ذخیره فایل در این برنامه.",
    closeDialog: "بستن پنجره ارزیابی",
    defineTarget: "موقعیت هدف را تعریف کنید",
    defineTargetDescription: "معیارهای شفاف یکسان برای همه رزومه‌ها اعمال می‌شوند.",
    jobTitle: "عنوان شغلی",
    jobTitlePlaceholder: "مثلاً سازنده مستقل محصولات هوش مصنوعی",
    jobDescription: "شرح موقعیت شغلی",
    fixedRubric: "معیار ثابت",
    skills: "مهارت‌ها",
    experience: "تجربه",
    impact: "اثرگذاری",
    ownership: "مالکیت",
    context: "تناسب نقش",
    addCandidateEvidence: "رزومه داوطلبان را اضافه کنید",
    fileConstraints:
      "PDF، TXT یا MD · حداکثر ۳ مگابایت · متن تا ۱۲۰٬۰۰۰ نویسه · PDF تا ۱۰ صفحه · حداکثر پنج فایل",
    dropResumes: "رزومه‌ها را اینجا رها کنید",
    chooseFiles: "یا برای انتخاب فایل کلیک کنید",
    screening: "در حال ارزیابی",
    done: "انجام شد",
    failed: "ناموفق",
    removeFile: (fileName) => `حذف ${fileName}`,
    emptyBatch: "هنوز رزومه‌ای اضافه نشده است.",
    seededDemoMode: "حالت دموی آماده",
    readyDescription: (model) => `${model} · خروجی ساختاریافته · بدون ذخیره در برنامه`,
    unconfiguredDescription:
      "برای ارزیابی رزومه جدید، OPENAI_API_KEY را اضافه کنید. داشبورد آزمایشی همچنان قابل استفاده است.",
    rawResumesNotPersisted:
      "این برنامه فایل خام رزومه را ذخیره نمی‌کند؛ سیاست سرویس هوش مصنوعی همچنان اعمال می‌شود.",
    viewShortlist: "مشاهده فهرست منتخب",
    screeningRemaining: (count) =>
      `در حال ارزیابی ${formatNumber(count, "fa")} رزومه…`,
    screenCount: (count) =>
      count
        ? `ارزیابی ${formatNumber(count, "fa")} رزومه`
        : "ارزیابی رزومه‌ها",
    completedCount: (count) =>
      `${formatNumber(count, "fa")} ارزیابی اضافه شد`,
    fileReadError: "خواندن این فایل ممکن نبود.",
    maxBatchError: "در هر نوبت حداکثر پنج رزومه قابل ارزیابی است.",
    unsupportedFileError: (fileName) =>
      `فرمت فایل ${fileName} پشتیبانی نمی‌شود؛ از PDF، TXT یا MD استفاده کنید.`,
    fileTooLargeError: (fileName) =>
      `حجم فایل ${fileName} بیشتر از محدودیت ۳ مگابایت است.`,
    invalidResponseError: "پاسخ سرویس ارزیابی معتبر نبود.",
    screeningFailedError: "ارزیابی ناموفق بود.",
    aiKeyError: "برای ارزیابی زنده باید OPENAI_API_KEY روی استقرار تنظیم شود.",
    jobTitleError: "عنوان شغلی را وارد کنید.",
    jobDescriptionError:
      "برای مقایسه منصفانه، حداقل ۸۰ نویسه درباره موقعیت شغلی وارد کنید.",
    resumeRequiredError: "حداقل یک رزومه اضافه کنید.",
  },
  errors: {
    safeFailure: "خطای ایمن",
    appErrorTitle: "در نمایش فهرست مشکلی پیش آمد.",
    appErrorDescription:
      "هیچ داده رزومه‌ای ذخیره نشده است. نما را بازنشانی کنید و از ارزیابی آزمایشی ادامه دهید.",
    resetView: "بازنشانی نما",
    notFoundEyebrow: "۴۰۴ · اینجا چیزی نیست",
    notFoundTitle: "این صفحه در فهرست ما نیست.",
    notFoundDescription: "محصول در یک داشبورد متمرکز در دسترس است.",
    returnHome: "بازگشت به شورت‌لیست",
  },
  export: {
    csvFileName: "shortlist-candidates-fa.csv",
    jsonFileName: "shortlist-audit-fa.json",
    rank: "رتبه",
    candidate: "داوطلب",
    score: "امتیاز",
    aiRecommendation: "پیشنهاد هوش مصنوعی",
    confidence: "سطح اطمینان",
    humanDecision: "تصمیم کارشناس",
    currentRole: "نقش فعلی",
    yearsExperience: "سال‌های تجربه",
    topStrengths: "مهم‌ترین توانمندی‌ها",
    evidenceGaps: "کمبود شواهد",
    model: "مدل",
    assessedAt: "زمان ارزیابی",
    unreviewed: "بررسی‌نشده",
  },
  apiErrors: {
    RATE_LIMITED: "درخواست‌های ارزیابی این مرورگر بیش از حد است. یک دقیقه بعد دوباره تلاش کنید.",
    DAILY_LIMIT_REACHED: "سهمیه روزانه ارزیابی این کاربر به پایان رسیده است.",
    RATE_LIMIT_UNAVAILABLE:
      "ارزیابی زنده موقتاً متوقف است، چون محافظ سراسری هزینه در دسترس نیست.",
    AI_NOT_CONFIGURED:
      "ارزیابی زنده هوش مصنوعی روی این استقرار تنظیم نشده است؛ دموی آماده کاملاً در دسترس است.",
    ORIGIN_NOT_ALLOWED: "فرایند ارزیابی را از همین نسخه شورت‌لیست باز کنید.",
    REQUEST_TOO_LARGE: "حجم درخواست از محدودیت استقرار بیشتر است.",
    UNSUPPORTED_MEDIA_TYPE: "قالب درخواست ارزیابی پشتیبانی نمی‌شود.",
    INVALID_JSON: "خواندن درخواست ارزیابی ممکن نبود.",
    UNSUPPORTED_FILE_TYPE: "فقط رزومه‌های PDF، TXT و Markdown پشتیبانی می‌شوند.",
    INVALID_FILE_NAME: "نام فایل رزومه معتبر نیست.",
    INVALID_FILE_ENCODING: "کدگذاری فایل با نوع اعلام‌شده آن مطابقت ندارد.",
    FILE_TYPE_MISMATCH: "پسوند نام فایل با نوع انتخاب‌شده مطابقت ندارد.",
    FILE_TOO_LARGE: "حجم رزومه از محدودیت مجاز بیشتر است.",
    EMPTY_FILE: "فایل رزومه خالی است.",
    INVALID_PDF: "فایل PDF خراب، رمزگذاری‌شده، بیش از حد طولانی یا غیرقابل پردازش است.",
    INVALID_DOCX: "فایل DOCX خراب یا غیرقابل پردازش است.",
    INVALID_TEXT: "رزومه متنی باید UTF-8 معتبر و غیرخالی باشد.",
    TEXT_TOO_LONG: "رزومه متنی نباید بیش از ۱۲۰٬۰۰۰ نویسه داشته باشد.",
    INVALID_REQUEST: "درخواست ارزیابی معتبر نیست.",
    EMPTY_MODEL_RESPONSE:
      "هوش مصنوعی نتوانست ارزیابی ساختاریافته کاملی تولید کند. دوباره تلاش کنید.",
    AI_PROVIDER_ERROR:
      "سرویس هوش مصنوعی نتوانست ارزیابی را کامل کند. کمی بعد دوباره تلاش کنید.",
    SCREENING_FAILED:
      "ارزیابی به‌شکل ایمن متوقف شد و رزومه ذخیره نشد. دوباره تلاش کنید.",
    UNKNOWN: "مشکلی پیش آمد. کمی بعد دوباره تلاش کنید.",
  },
  recommendationLabels: {
    strong_match: "تطابق عالی",
    match: "تطابق خوب",
    review: "نیازمند بررسی",
    low_match: "تطابق پایین",
  },
  decisionLabels: {
    advance: "دعوت به مرحله بعد",
    hold: "در انتظار بررسی",
    decline: "رد",
  },
  confidenceLabels: {
    high: "بالا",
    medium: "متوسط",
    low: "پایین",
  },
  mustHaveStatusLabels: {
    met: "تأییدشده",
    partial: "نسبی",
    missing: "فاقد شواهد",
    unclear: "نامشخص",
  },
  severityLabels: {
    low: "کم",
    medium: "متوسط",
    high: "زیاد",
  },
  rubricLabels: {
    core_skills: "مهارت‌های اصلی",
    relevant_experience: "تجربه مرتبط",
    demonstrated_impact: "اثرگذاری اثبات‌شده",
    ownership_delivery: "مالکیت و تحویل",
    role_context: "تناسب با نقش",
    communication: "شفافیت ارتباطی",
  },
};

export const UI_COPY: Record<Locale, UiCopy> = {
  en: english,
  fa: persian,
};

export function getCopy(locale: Locale): UiCopy {
  return UI_COPY[locale];
}

export function anonymousCandidateName(rank: number, locale: Locale): string {
  const padded = String(rank).padStart(2, "0");
  return locale === "fa"
    ? `داوطلب ${toPersianDigits(padded)}`
    : `Candidate ${padded}`;
}

export function localizeApiError(code: string | undefined, locale: Locale): string {
  const messages = UI_COPY[locale].apiErrors;
  return code && code in messages
    ? messages[code as keyof typeof messages]
    : messages.UNKNOWN;
}

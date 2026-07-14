import { DEMO_CANDIDATES, DEMO_JOB } from "@/lib/demo-data";
import type {
  AuditEventSummary,
  AutomationRuleSummary,
  EmailTemplateSummary,
  PipelineStage,
  PositionSummary,
  TeamMember,
  WorkspaceCandidate,
  WorkspaceSnapshot,
} from "@/lib/workspace-types";

const NOW = "2026-07-14T09:30:00.000Z";

export const DEMO_POSITIONS: PositionSummary[] = [
  {
    id: "pos-solo-ai-builder",
    title: "Solo AI Builder / Full-Stack AI Engineer",
    department: "Product & Engineering",
    location: "Tehran · Hybrid",
    employmentType: "Full-time",
    description: DEMO_JOB.description,
    status: "open",
    defaultLocale: "en",
    candidateCount: 4,
    updatedAt: NOW,
  },
  {
    id: "pos-ai-product-designer",
    title: "AI Product Designer",
    department: "Product",
    location: "Remote",
    employmentType: "Contract",
    description: "Design clear, accessible AI product experiences, translate ambiguous workflows into testable prototypes, and partner with engineering to ship bilingual interfaces.",
    status: "draft",
    defaultLocale: "fa",
    candidateCount: 0,
    updatedAt: "2026-07-13T13:12:00.000Z",
  },
  {
    id: "pos-automation-engineer",
    title: "Automation Engineer",
    department: "Operations",
    location: "Tehran",
    employmentType: "Full-time",
    description: "Build reliable API automations, operational workflows, monitoring, and human approval paths across internal systems while documenting failure and recovery behavior.",
    status: "paused",
    defaultLocale: "en",
    candidateCount: 7,
    updatedAt: "2026-07-11T08:45:00.000Z",
  },
];

export const DEMO_STAGES: PipelineStage[] = [
  { id: "stage-applied", key: "applied", name: { en: "Applied", fa: "دریافت‌شده" }, kind: "applied", order: 1, terminal: false },
  { id: "stage-screen", key: "screen", name: { en: "AI screen", fa: "غربال هوشمند" }, kind: "screening", order: 2, terminal: false },
  { id: "stage-review", key: "review", name: { en: "Team review", fa: "بررسی تیم" }, kind: "screening", order: 3, terminal: false },
  { id: "stage-interview", key: "interview", name: { en: "Interview", fa: "مصاحبه" }, kind: "interview", order: 4, terminal: false },
  { id: "stage-offer", key: "offer", name: { en: "Offer", fa: "پیشنهاد" }, kind: "offer", order: 5, terminal: false },
];

const candidateStageIds = ["stage-interview", "stage-review", "stage-screen", "stage-applied"];
const parseScores = [96, 91, 84, 72];

export const DEMO_WORKSPACE_CANDIDATES: WorkspaceCandidate[] = DEMO_CANDIDATES.map(
  (candidate, index) => ({
    applicationId: `app-${candidate.id}`,
    applicationVersion: 1,
    candidateId: candidate.id,
    displayName: candidate.profile.displayName,
    currentRole: candidate.profile.currentRole,
    email: index < 2 ? [`alex@example.test`, `samira@example.test`][index] : null,
    source: ["Referral", "LinkedIn", "Career page", "Direct"][index] ?? "Direct",
    stageId: candidateStageIds[index] ?? "stage-applied",
    stageKey: (DEMO_STAGES.find((stage) => stage.id === candidateStageIds[index]) ?? DEMO_STAGES[0]).key,
    score: candidate.score,
    recommendation: candidate.recommendation,
    confidence: candidate.confidence,
    appliedAt: new Date(Date.parse(NOW) - index * 86_400_000).toISOString(),
    lastActivityAt: new Date(Date.parse(NOW) - index * 3_600_000).toISOString(),
    parseQuality: {
      score: parseScores[index] ?? 70,
      contact: index < 2 ? "parsed" : "partial",
      experience: "parsed",
      skills: "parsed",
      dates: index === 3 ? "partial" : "parsed",
      warnings: index === 3 ? ["One employment date range needs review."] : [],
    },
    assessment: candidate,
  }),
);

export const DEMO_TEAM: TeamMember[] = [
  { id: "user-owner", name: "Mehdi Sharifi", email: "reviews@ats.mehdisharifi.com", role: "owner", positionAccess: "all", identityAccess: true, status: "active", lastActiveAt: NOW },
  { id: "user-hm", name: "Hiring Manager", email: "mrtensor8@gmail.com", role: "hiring_manager", positionAccess: "assigned", identityAccess: true, status: "active", lastActiveAt: "2026-07-14T08:18:00.000Z" },
  { id: "user-reviewer", name: "Technical Reviewer", email: "lexapro8585@gmail.com", role: "interviewer", positionAccess: "assigned", identityAccess: false, status: "invited", lastActiveAt: null },
];

export const DEMO_TEMPLATES: EmailTemplateSummary[] = [
  {
    id: "tpl-review-en", key: "team_review", name: "Team review request", locale: "en", version: 2, status: "active",
    subject: "Review requested · {{candidate_name}} · {{position_title}}",
    body: "Hi {{reviewer_name}},\n\nPlease review the evidence pack for {{candidate_name}}. Focus on the role criteria and record your independent recommendation before {{review_deadline}}.\n\n{{review_url}}",
    allowedVariables: ["candidate_name", "position_title", "reviewer_name", "review_deadline", "review_url"],
  },
  {
    id: "tpl-interview-en", key: "interview_invite", name: "Interview invitation", locale: "en", version: 1, status: "active",
    subject: "Next step for {{position_title}}",
    body: "Hi {{candidate_name}},\n\nThank you for your time. We would like to invite you to a structured interview for {{position_title}}. Please use the link below to choose a suitable time.\n\n{{scheduling_url}}\n\nBest,\n{{sender_name}}",
    allowedVariables: ["candidate_name", "position_title", "scheduling_url", "sender_name"],
  },
  {
    id: "tpl-interview-fa", key: "interview_invite", name: "دعوت به مصاحبه", locale: "fa", version: 1, status: "active",
    subject: "مرحله بعدی برای موقعیت {{position_title}}",
    body: "سلام {{candidate_name}}،\n\nاز زمانی که برای فرایند استخدام گذاشتید سپاسگزاریم. مایل هستیم شما را به مصاحبه ساختاریافته برای موقعیت {{position_title}} دعوت کنیم.\n\n{{scheduling_url}}\n\nبا احترام،\n{{sender_name}}",
    allowedVariables: ["candidate_name", "position_title", "scheduling_url", "sender_name"],
  },
  {
    id: "tpl-hold-fa", key: "hold_update", name: "به‌روزرسانی وضعیت", locale: "fa", version: 1, status: "draft",
    subject: "به‌روزرسانی درخواست {{position_title}}",
    body: "سلام {{candidate_name}}،\n\nبررسی درخواست شما همچنان ادامه دارد. تا {{next_update_date}} نتیجه بعدی را با شما در میان می‌گذاریم.\n\nبا احترام،\n{{sender_name}}",
    allowedVariables: ["candidate_name", "position_title", "next_update_date", "sender_name"],
  },
];

export const DEMO_AUTOMATIONS: AutomationRuleSummary[] = [
  { id: "auto-review-reminder", name: "Review reminder after 24 hours", trigger: "Review request overdue · 24h", action: "Email assigned reviewers", enabled: true, requiresApproval: false, lastRunAt: "2026-07-14T06:00:00.000Z", lastRunStatus: "success" },
  { id: "auto-interview-draft", name: "Prepare interview invitation", trigger: "Candidate enters Interview", action: "Create email draft", enabled: true, requiresApproval: true, lastRunAt: "2026-07-13T10:40:00.000Z", lastRunStatus: "success" },
  { id: "auto-hr-summary", name: "Daily hiring summary", trigger: "Every weekday · 17:00", action: "Email HR notification address", enabled: false, requiresApproval: false, lastRunAt: null, lastRunStatus: "never" },
];

export const DEMO_AUDIT: AuditEventSummary[] = [
  { id: "audit-1", actor: "Mehdi Sharifi", action: "moved candidate", target: "Alex Morgan → Interview", occurredAt: NOW, source: "ui" },
  { id: "audit-2", actor: "Shortlist automation", action: "prepared email draft", target: "Interview invitation · v1", occurredAt: "2026-07-14T09:30:01.000Z", source: "automation" },
  { id: "audit-3", actor: "Hiring Manager", action: "submitted scorecard", target: "Anonymous candidate 02", occurredAt: "2026-07-14T08:18:00.000Z", source: "ui" },
  { id: "audit-4", actor: "Mehdi Sharifi", action: "activated template", target: "Team review request · v2", occurredAt: "2026-07-13T16:04:00.000Z", source: "ui" },
  { id: "audit-5", actor: "Review reminder", action: "sent email", target: "1 allowed recipient", occurredAt: "2026-07-13T06:00:00.000Z", source: "cron" },
];

export function demoWorkspaceSnapshot(positionId?: string): WorkspaceSnapshot {
  const activePosition = DEMO_POSITIONS.find((position) => position.id === positionId) ?? DEMO_POSITIONS[0];
  const hasCandidates = activePosition.id === DEMO_POSITIONS[0].id;
  return {
    mode: "demo",
    generatedAt: NOW,
    organization: { id: "org-demo", name: "Shortlist Studio" },
    session: {
      userId: "user-owner", organizationId: "org-demo", name: "Mehdi Sharifi", email: "reviews@ats.mehdisharifi.com", role: "owner", expiresAt: "2027-07-14T09:30:00.000Z",
    },
    positions: DEMO_POSITIONS,
    activePosition,
    stages: DEMO_STAGES,
    candidates: hasCandidates ? DEMO_WORKSPACE_CANDIDATES : [],
    team: DEMO_TEAM,
    templates: DEMO_TEMPLATES,
    automations: DEMO_AUTOMATIONS,
    audit: DEMO_AUDIT,
    capabilities: { database: false, smtp: false, ai: false, privateFiles: false },
  };
}

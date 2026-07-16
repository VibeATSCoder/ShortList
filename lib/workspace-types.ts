import type { Locale } from "@/lib/i18n";
import type { Confidence, Recommendation, ScreeningResult } from "@/lib/types";
import type { PlanEntitlements, PlanTier } from "@/lib/plans";

export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "recruiter",
  "hiring_manager",
  "interviewer",
  "viewer",
] as const;

export const POSITION_STATUSES = [
  "draft",
  "open",
  "paused",
  "closed",
  "archived",
] as const;

export const STAGE_KINDS = [
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
export type PositionStatus = (typeof POSITION_STATUSES)[number];
export type StageKind = (typeof STAGE_KINDS)[number];

export interface WorkspaceSession {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  planTier: PlanTier;
  expiresAt: string;
}

export interface PositionSummary {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  status: PositionStatus;
  defaultLocale: Locale;
  candidateCount: number;
  updatedAt: string;
  protected: boolean;
}

export interface PipelineStage {
  id: string;
  key: string;
  name: Record<Locale, string>;
  kind: StageKind;
  order: number;
  terminal: boolean;
}

export interface ParseQuality {
  score: number;
  contact: "parsed" | "partial" | "missing";
  experience: "parsed" | "partial" | "missing";
  skills: "parsed" | "partial" | "missing";
  dates: "parsed" | "partial" | "missing";
  warnings: string[];
}

export interface WorkspaceCandidate {
  applicationId: string;
  applicationVersion: number;
  candidateId: string;
  displayName: string;
  currentRole: string;
  email: string | null;
  source: string;
  stageId: string;
  stageKey: string;
  score: number | null;
  recommendation: Recommendation | null;
  confidence: Confidence | null;
  appliedAt: string;
  lastActivityAt: string;
  parseQuality: ParseQuality;
  assessment: ScreeningResult | null;
  resume: {
    fileName: string;
    contentType: string;
    url: string;
  } | null;
  protected: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: OrganizationRole;
  positionAccess: "all" | "assigned";
  identityAccess: boolean;
  status: "active" | "invited" | "suspended";
  lastActiveAt: string | null;
}

export interface EmailTemplateSummary {
  id: string;
  key: string;
  name: string;
  locale: Locale;
  subject: string;
  body: string;
  version: number;
  status: "draft" | "active" | "retired";
  allowedVariables: string[];
}

export interface AutomationRuleSummary {
  id: string;
  name: string;
  trigger: string;
  action: string;
  enabled: boolean;
  requiresApproval: boolean;
  lastRunAt: string | null;
  lastRunStatus: "success" | "failed" | "never";
}

export interface AuditEventSummary {
  id: string;
  actor: string;
  action: string;
  target: string;
  occurredAt: string;
  source: "ui" | "api" | "automation" | "cron";
}

export interface WorkspaceSnapshot {
  mode: "demo" | "database";
  generatedAt: string;
  organization: { id: string; name: string };
  session: WorkspaceSession;
  plan: PlanEntitlements;
  positions: PositionSummary[];
  activePosition: PositionSummary;
  stages: PipelineStage[];
  candidates: WorkspaceCandidate[];
  team: TeamMember[];
  templates: EmailTemplateSummary[];
  automations: AutomationRuleSummary[];
  audit: AuditEventSummary[];
  capabilities: {
    database: boolean;
    smtp: boolean;
    ai: boolean;
    privateFiles: boolean;
  };
}

export interface StageTransitionCommand {
  applicationId: string;
  toStageId: string;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
}

export interface CandidateEmailCommand {
  applicationId: string;
  templateId: string;
  locale: Locale;
  subject: string;
  body: string;
  approved: true;
  idempotencyKey: string;
}

export const PLAN_TIERS = ["free", "pro"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export interface PlanEntitlements {
  tier: PlanTier;
  positionLimit: number;
  candidateLimitPerPosition: number;
  reviewerDirectory: boolean;
  emailSending: boolean;
  templates: boolean;
  automations: boolean;
  teamAccess: boolean;
  auditExport: boolean;
}

const plans: Record<PlanTier, PlanEntitlements> = {
  free: {
    tier: "free",
    positionLimit: 1,
    candidateLimitPerPosition: 5,
    reviewerDirectory: false,
    emailSending: false,
    templates: false,
    automations: false,
    teamAccess: false,
    auditExport: false,
  },
  pro: {
    tier: "pro",
    positionLimit: 25,
    candidateLimitPerPosition: 500,
    reviewerDirectory: true,
    emailSending: true,
    templates: true,
    automations: true,
    teamAccess: true,
    auditExport: true,
  },
};

export function planEntitlements(tier: PlanTier): PlanEntitlements {
  return plans[tier];
}

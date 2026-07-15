-- Product tiers are owned by organizations, not individual browser sessions.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(40) NOT NULL DEFAULT 'pro';

ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_plan_tier;
ALTER TABLE organizations
  ADD CONSTRAINT chk_organizations_plan_tier CHECK (plan_tier IN ('free', 'pro'));

CREATE INDEX IF NOT EXISTS ix_organizations_plan_tier ON organizations (plan_tier);

INSERT INTO schema_migrations (version) VALUES ('003_organization_plans') ON CONFLICT DO NOTHING;

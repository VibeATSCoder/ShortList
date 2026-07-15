-- MySQL/cPanel equivalent of organization product tiers.
ALTER TABLE organizations ADD COLUMN plan_tier VARCHAR(40) NOT NULL DEFAULT 'pro';
CREATE INDEX ix_organizations_plan_tier ON organizations (plan_tier);

-- Shortlist ATS · Neon PostgreSQL foundation
-- Generated from the canonical relational model. Safe to run repeatedly.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) NOT NULL PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organizations (
  id UUID NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  default_locale VARCHAR(40) NOT NULL DEFAULT 'en',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_organizations_slug UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS users (
  id UUID NOT NULL PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  locale VARCHAR(40) NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role VARCHAR(40) NOT NULL,
  identity_access SMALLINT NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_membership UNIQUE (organization_id, user_id),
  CONSTRAINT fk_membership_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_token_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  user_agent_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  idle_expires_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_sessions_token_hash UNIQUE (token_hash),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_sessions_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_sessions_membership FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS positions (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  title VARCHAR(180) NOT NULL,
  department VARCHAR(140) NOT NULL DEFAULT '',
  location VARCHAR(180) NOT NULL DEFAULT '',
  employment_type VARCHAR(80) NOT NULL DEFAULT '',
  description TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  default_locale VARCHAR(40) NOT NULL DEFAULT 'en',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_positions_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_positions_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_positions_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_positions_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS position_memberships (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  position_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role_override VARCHAR(40) NULL,
  identity_access SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_position_membership UNIQUE (position_id, user_id),
  CONSTRAINT fk_position_membership_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_position_membership_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_position_membership_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_position_membership_member FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  position_id UUID NOT NULL,
  stage_key VARCHAR(64) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_fa VARCHAR(100) NOT NULL,
  kind VARCHAR(40) NOT NULL,
  sort_order INTEGER NOT NULL,
  is_terminal SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_stage_key UNIQUE (position_id, stage_key),
  CONSTRAINT uq_stage_order UNIQUE (position_id, sort_order),
  CONSTRAINT uq_stages_org_position_id UNIQUE (organization_id, position_id, id),
  CONSTRAINT fk_stages_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_stages_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id)
);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  display_name VARCHAR(180) NOT NULL,
  "current_role" VARCHAR(180) NOT NULL DEFAULT '',
  email VARCHAR(254) NULL,
  phone VARCHAR(64) NULL,
  parse_quality_json TEXT NULL,
  identity_ciphertext TEXT NULL,
  identity_key_version INTEGER NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_candidates_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_candidates_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS resume_assets (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  byte_size INTEGER NOT NULL,
  sha256 CHAR(64) NOT NULL,
  encryption_key_version INTEGER NOT NULL,
  state VARCHAR(40) NOT NULL DEFAULT 'active',
  retention_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL,
  CONSTRAINT uq_resume_storage_key UNIQUE (storage_key),
  CONSTRAINT uq_resume_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_resume_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_resume_candidate FOREIGN KEY (organization_id, candidate_id)
    REFERENCES candidates(organization_id, id)
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  position_id UUID NOT NULL,
  candidate_id UUID NOT NULL,
  current_stage_id UUID NOT NULL,
  latest_assessment_id UUID NULL,
  source VARCHAR(100) NOT NULL DEFAULT 'Direct',
  state VARCHAR(40) NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_application UNIQUE (position_id, candidate_id),
  CONSTRAINT uq_applications_org_id UNIQUE (organization_id, id),
  CONSTRAINT uq_applications_org_position_id UNIQUE (organization_id, position_id, id),
  CONSTRAINT fk_applications_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_applications_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_applications_candidate FOREIGN KEY (organization_id, candidate_id)
    REFERENCES candidates(organization_id, id),
  CONSTRAINT fk_applications_stage FOREIGN KEY (organization_id, position_id, current_stage_id)
    REFERENCES pipeline_stages(organization_id, position_id, id)
);

CREATE TABLE IF NOT EXISTS assessment_snapshots (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  position_id UUID NOT NULL,
  application_id UUID NOT NULL,
  resume_asset_id UUID NULL,
  rubric_version VARCHAR(80) NOT NULL,
  prompt_version VARCHAR(80) NOT NULL,
  model VARCHAR(100) NOT NULL,
  locale VARCHAR(40) NOT NULL,
  job_hash CHAR(64) NOT NULL,
  rubric_hash CHAR(64) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  recommendation VARCHAR(40) NOT NULL,
  confidence VARCHAR(40) NOT NULL,
  assessment_json TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_assessments_org_id UNIQUE (organization_id, id),
  CONSTRAINT uq_assessments_org_application_id UNIQUE (organization_id, application_id, id),
  CONSTRAINT fk_assessment_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_assessment_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_assessment_application FOREIGN KEY (organization_id, position_id, application_id)
    REFERENCES applications(organization_id, position_id, id),
  CONSTRAINT fk_assessment_resume FOREIGN KEY (organization_id, resume_asset_id)
    REFERENCES resume_assets(organization_id, id),
  CONSTRAINT fk_assessment_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_assessment_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS application_stage_transitions (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  position_id UUID NOT NULL,
  application_id UUID NOT NULL,
  from_stage_id UUID NULL,
  to_stage_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  reason VARCHAR(500) NOT NULL,
  source VARCHAR(40) NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL,
  expected_version INTEGER NOT NULL,
  resulting_version INTEGER NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_transition_idempotency UNIQUE (organization_id, idempotency_key),
  CONSTRAINT fk_transition_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_transition_application FOREIGN KEY (organization_id, position_id, application_id)
    REFERENCES applications(organization_id, position_id, id),
  CONSTRAINT fk_transition_from FOREIGN KEY (organization_id, position_id, from_stage_id)
    REFERENCES pipeline_stages(organization_id, position_id, id),
  CONSTRAINT fk_transition_to FOREIGN KEY (organization_id, position_id, to_stage_id)
    REFERENCES pipeline_stages(organization_id, position_id, id),
  CONSTRAINT fk_transition_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  CONSTRAINT fk_transition_actor_member FOREIGN KEY (organization_id, actor_id)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS candidate_notes (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  application_id UUID NOT NULL,
  author_id UUID NOT NULL,
  body TEXT NOT NULL,
  visibility VARCHAR(40) NOT NULL DEFAULT 'team',
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_notes_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_notes_application FOREIGN KEY (organization_id, application_id)
    REFERENCES applications(organization_id, id),
  CONSTRAINT fk_notes_author FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT fk_notes_author_member FOREIGN KEY (organization_id, author_id)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  template_key VARCHAR(80) NOT NULL,
  name VARCHAR(140) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_template_key UNIQUE (organization_id, template_key),
  CONSTRAINT uq_templates_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_templates_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_templates_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_templates_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS email_template_versions (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  template_id UUID NOT NULL,
  locale VARCHAR(40) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  allowed_variables_json TEXT NOT NULL,
  version INTEGER NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_template_version UNIQUE (template_id, locale, version),
  CONSTRAINT uq_template_versions_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_template_versions_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_template_versions_template FOREIGN KEY (organization_id, template_id)
    REFERENCES email_templates(organization_id, id),
  CONSTRAINT fk_template_versions_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_template_versions_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  position_id UUID NULL,
  name VARCHAR(160) NOT NULL,
  trigger_type VARCHAR(80) NOT NULL,
  trigger_label VARCHAR(180) NOT NULL,
  action_type VARCHAR(80) NOT NULL,
  action_label VARCHAR(180) NOT NULL,
  conditions_json TEXT NOT NULL,
  action_config_json TEXT NOT NULL,
  enabled SMALLINT NOT NULL DEFAULT 0,
  requires_approval SMALLINT NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  last_run_at TIMESTAMPTZ NULL,
  last_run_status VARCHAR(40) NOT NULL DEFAULT 'never',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_automations_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_automations_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_automations_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_automations_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  application_id UUID NULL,
  template_version_id UUID NULL,
  recipient VARCHAR(254) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  requires_approval SMALLINT NOT NULL DEFAULT 1,
  approved_by UUID NULL,
  approved_at TIMESTAMPTZ NULL,
  idempotency_key VARCHAR(180) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL,
  lease_until TIMESTAMPTZ NULL,
  lease_token CHAR(64) NULL,
  last_error_code VARCHAR(80) NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_outbox_idempotency UNIQUE (organization_id, idempotency_key),
  CONSTRAINT uq_outbox_org_id UNIQUE (organization_id, id),
  CONSTRAINT fk_outbox_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_outbox_application FOREIGN KEY (organization_id, application_id)
    REFERENCES applications(organization_id, id),
  CONSTRAINT fk_outbox_template FOREIGN KEY (organization_id, template_version_id)
    REFERENCES email_template_versions(organization_id, id),
  CONSTRAINT fk_outbox_approver FOREIGN KEY (approved_by) REFERENCES users(id),
  CONSTRAINT fk_outbox_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_outbox_approver_member FOREIGN KEY (organization_id, approved_by)
    REFERENCES organization_memberships(organization_id, user_id),
  CONSTRAINT fk_outbox_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS email_deliveries (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  outbox_id UUID NOT NULL,
  provider VARCHAR(80) NOT NULL,
  provider_message_id VARCHAR(255) NULL,
  status VARCHAR(40) NOT NULL,
  response_code VARCHAR(80) NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_delivery_provider_message UNIQUE (provider, provider_message_id),
  CONSTRAINT fk_deliveries_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_deliveries_outbox FOREIGN KEY (organization_id, outbox_id)
    REFERENCES email_outbox(organization_id, id)
);

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  application_id UUID NOT NULL,
  assessment_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  blind_mode SMALLINT NOT NULL DEFAULT 1,
  note TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_review_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_review_application FOREIGN KEY (organization_id, application_id)
    REFERENCES applications(organization_id, id),
  CONSTRAINT fk_review_assessment FOREIGN KEY (organization_id, application_id, assessment_id)
    REFERENCES assessment_snapshots(organization_id, application_id, id),
  CONSTRAINT fk_review_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_review_requester_member FOREIGN KEY (organization_id, requested_by)
    REFERENCES organization_memberships(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS review_grants (
  id UUID NOT NULL PRIMARY KEY,
  review_request_id UUID NOT NULL,
  recipient_email VARCHAR(254) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  scopes_json TEXT NOT NULL,
  opened_at TIMESTAMPTZ NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_review_token_hash UNIQUE (token_hash),
  CONSTRAINT uq_review_recipient UNIQUE (review_request_id, recipient_email),
  CONSTRAINT fk_review_grant_request FOREIGN KEY (review_request_id) REFERENCES review_requests(id)
);

CREATE TABLE IF NOT EXISTS review_feedback (
  id UUID NOT NULL PRIMARY KEY,
  review_request_id UUID NOT NULL,
  grant_id UUID NOT NULL,
  decision VARCHAR(40) NOT NULL,
  comment TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_review_feedback_grant UNIQUE (grant_id),
  CONSTRAINT fk_feedback_request FOREIGN KEY (review_request_id) REFERENCES review_requests(id),
  CONSTRAINT fk_feedback_grant FOREIGN KEY (grant_id) REFERENCES review_grants(id)
);

CREATE TABLE IF NOT EXISTS work_queue (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  job_type VARCHAR(80) NOT NULL,
  payload_json TEXT NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'queued',
  idempotency_key VARCHAR(180) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL,
  lease_until TIMESTAMPTZ NULL,
  last_error_code VARCHAR(80) NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT uq_work_idempotency UNIQUE (organization_id, idempotency_key),
  CONSTRAINT fk_work_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS rate_limit_windows (
  scope VARCHAR(80) NOT NULL,
  subject_hash CHAR(64) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, subject_hash, window_start)
);

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  actor_type VARCHAR(40) NOT NULL,
  actor_id UUID NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  target_label VARCHAR(255) NOT NULL DEFAULT '',
  position_id UUID NULL,
  application_id UUID NULL,
  request_id VARCHAR(100) NULL,
  source VARCHAR(40) NOT NULL,
  metadata_json TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT fk_audit_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  CONSTRAINT fk_audit_actor_member FOREIGN KEY (organization_id, actor_id)
    REFERENCES organization_memberships(organization_id, user_id),
  CONSTRAINT fk_audit_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_audit_application FOREIGN KEY (organization_id, application_id)
    REFERENCES applications(organization_id, id)
);

INSERT INTO schema_migrations (version) VALUES ('001_initial') ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS ix_membership_user ON organization_memberships (user_id);
CREATE INDEX IF NOT EXISTS ix_sessions_cleanup ON sessions (expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS ix_sessions_user ON sessions (user_id, revoked_at);
CREATE INDEX IF NOT EXISTS ix_positions_org_status ON positions (organization_id, status, updated_at);
CREATE INDEX IF NOT EXISTS ix_position_membership_org ON position_memberships (organization_id, user_id);
CREATE INDEX IF NOT EXISTS ix_stages_org ON pipeline_stages (organization_id, position_id);
CREATE INDEX IF NOT EXISTS ix_candidates_org_name ON candidates (organization_id, display_name);
CREATE INDEX IF NOT EXISTS ix_candidates_org_email ON candidates (organization_id, email);
CREATE INDEX IF NOT EXISTS ix_resume_retention ON resume_assets (state, retention_until);
CREATE INDEX IF NOT EXISTS ix_resume_candidate ON resume_assets (candidate_id);
CREATE INDEX IF NOT EXISTS ix_applications_pipeline ON applications (position_id, current_stage_id, state);
CREATE INDEX IF NOT EXISTS ix_applications_org_updated ON applications (organization_id, updated_at);
CREATE INDEX IF NOT EXISTS ix_assessment_application ON assessment_snapshots (application_id, created_at);
CREATE INDEX IF NOT EXISTS ix_assessment_ranking ON assessment_snapshots (position_id, score);
CREATE INDEX IF NOT EXISTS ix_transition_application ON application_stage_transitions (application_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_notes_application ON candidate_notes (application_id, created_at);
CREATE INDEX IF NOT EXISTS ix_template_active ON email_template_versions (template_id, locale, status);
CREATE INDEX IF NOT EXISTS ix_automations_trigger ON automation_rules (organization_id, enabled, trigger_type);
CREATE INDEX IF NOT EXISTS ix_outbox_claim ON email_outbox (status, available_at, lease_until);
CREATE INDEX IF NOT EXISTS ix_deliveries_outbox ON email_deliveries (outbox_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_review_expiry ON review_requests (expires_at, revoked_at);
CREATE INDEX IF NOT EXISTS ix_work_claim ON work_queue (status, available_at, lease_until);
CREATE INDEX IF NOT EXISTS ix_rate_cleanup ON rate_limit_windows (expires_at);
CREATE INDEX IF NOT EXISTS ix_audit_org_time ON audit_events (organization_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_audit_position_time ON audit_events (position_id, occurred_at);
CREATE INDEX IF NOT EXISTS ix_audit_application_time ON audit_events (application_id, occurred_at);

-- Shortlist ATS · cPanel MySQL/MariaDB foundation
-- MySQL 8.0+ or MariaDB 10.6+. Run once through phpMyAdmin after the database
-- and users have been created with cPanel's Database Wizard.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(64) NOT NULL PRIMARY KEY,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  default_locale ENUM('en','fa') NOT NULL DEFAULT 'en',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_organizations_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(254) NOT NULL,
  name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('invited','active','suspended') NOT NULL DEFAULT 'active',
  locale ENUM('en','fa') NOT NULL DEFAULT 'en',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_memberships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner','admin','recruiter','hiring_manager','interviewer','viewer') NOT NULL,
  identity_access TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('invited','active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_membership (organization_id, user_id),
  KEY ix_membership_user (user_id),
  CONSTRAINT fk_membership_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  organization_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  csrf_token_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  user_agent_hash CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  idle_expires_at DATETIME(3) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  UNIQUE KEY uq_sessions_token_hash (token_hash),
  KEY ix_sessions_cleanup (expires_at, revoked_at),
  KEY ix_sessions_user (user_id, revoked_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_sessions_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_sessions_membership FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_memberships(organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS positions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  department VARCHAR(140) NOT NULL DEFAULT '',
  location VARCHAR(180) NOT NULL DEFAULT '',
  employment_type VARCHAR(80) NOT NULL DEFAULT '',
  description MEDIUMTEXT NOT NULL,
  status ENUM('draft','open','paused','closed','archived') NOT NULL DEFAULT 'draft',
  default_locale ENUM('en','fa') NOT NULL DEFAULT 'en',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tehran',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_positions_org_id (organization_id, id),
  KEY ix_positions_org_status (organization_id, status, updated_at),
  CONSTRAINT fk_positions_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_positions_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_positions_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS position_memberships (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  position_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role_override ENUM('recruiter','hiring_manager','interviewer','viewer') NULL,
  identity_access TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_position_membership (position_id, user_id),
  KEY ix_position_membership_org (organization_id, user_id),
  CONSTRAINT fk_position_membership_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_position_membership_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_position_membership_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_position_membership_member FOREIGN KEY (organization_id, user_id)
    REFERENCES organization_memberships(organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  position_id CHAR(36) NOT NULL,
  stage_key VARCHAR(64) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  name_fa VARCHAR(100) NOT NULL,
  kind ENUM('applied','screening','interview','offer','hired','rejected') NOT NULL,
  sort_order SMALLINT UNSIGNED NOT NULL,
  is_terminal TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL,
  archived_at DATETIME(3) NULL,
  UNIQUE KEY uq_stage_key (position_id, stage_key),
  UNIQUE KEY uq_stage_order (position_id, sort_order),
  UNIQUE KEY uq_stages_org_position_id (organization_id, position_id, id),
  KEY ix_stages_org (organization_id, position_id),
  CONSTRAINT fk_stages_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_stages_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidates (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  display_name VARCHAR(180) NOT NULL,
  current_role VARCHAR(180) NOT NULL DEFAULT '',
  email VARCHAR(254) NULL,
  phone VARCHAR(64) NULL,
  parse_quality_json LONGTEXT NULL,
  identity_ciphertext LONGTEXT NULL,
  identity_key_version SMALLINT UNSIGNED NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_candidates_org_id (organization_id, id),
  KEY ix_candidates_org_name (organization_id, display_name),
  KEY ix_candidates_org_email (organization_id, email),
  CONSTRAINT fk_candidates_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS resume_assets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  candidate_id CHAR(36) NOT NULL,
  storage_key VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  byte_size INT UNSIGNED NOT NULL,
  sha256 CHAR(64) NOT NULL,
  encryption_key_version SMALLINT UNSIGNED NOT NULL,
  state ENUM('active','quarantined','deleted') NOT NULL DEFAULT 'active',
  retention_until DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  deleted_at DATETIME(3) NULL,
  UNIQUE KEY uq_resume_storage_key (storage_key),
  UNIQUE KEY uq_resume_org_id (organization_id, id),
  KEY ix_resume_retention (state, retention_until),
  KEY ix_resume_candidate (candidate_id),
  CONSTRAINT fk_resume_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_resume_candidate FOREIGN KEY (organization_id, candidate_id)
    REFERENCES candidates(organization_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  position_id CHAR(36) NOT NULL,
  candidate_id CHAR(36) NOT NULL,
  current_stage_id CHAR(36) NOT NULL,
  latest_assessment_id CHAR(36) NULL,
  source VARCHAR(100) NOT NULL DEFAULT 'Direct',
  state ENUM('active','hired','rejected','withdrawn','archived') NOT NULL DEFAULT 'active',
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_application (position_id, candidate_id),
  UNIQUE KEY uq_applications_org_id (organization_id, id),
  UNIQUE KEY uq_applications_org_position_id (organization_id, position_id, id),
  KEY ix_applications_pipeline (position_id, current_stage_id, state),
  KEY ix_applications_org_updated (organization_id, updated_at),
  CONSTRAINT fk_applications_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_applications_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_applications_candidate FOREIGN KEY (organization_id, candidate_id)
    REFERENCES candidates(organization_id, id),
  CONSTRAINT fk_applications_stage FOREIGN KEY (organization_id, position_id, current_stage_id)
    REFERENCES pipeline_stages(organization_id, position_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assessment_snapshots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  position_id CHAR(36) NOT NULL,
  application_id CHAR(36) NOT NULL,
  resume_asset_id CHAR(36) NULL,
  rubric_version VARCHAR(80) NOT NULL,
  prompt_version VARCHAR(80) NOT NULL,
  model VARCHAR(100) NOT NULL,
  locale ENUM('en','fa') NOT NULL,
  job_hash CHAR(64) NOT NULL,
  rubric_hash CHAR(64) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  recommendation ENUM('strong_match','match','review','low_match') NOT NULL,
  confidence ENUM('high','medium','low') NOT NULL,
  assessment_json LONGTEXT NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_assessments_org_id (organization_id, id),
  UNIQUE KEY uq_assessments_org_application_id (organization_id, application_id, id),
  KEY ix_assessment_application (application_id, created_at),
  KEY ix_assessment_ranking (position_id, score),
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_stage_transitions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  position_id CHAR(36) NOT NULL,
  application_id CHAR(36) NOT NULL,
  from_stage_id CHAR(36) NULL,
  to_stage_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  source ENUM('human','import','automation') NOT NULL,
  idempotency_key VARCHAR(160) NOT NULL,
  expected_version INT UNSIGNED NOT NULL,
  resulting_version INT UNSIGNED NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_transition_idempotency (organization_id, idempotency_key),
  KEY ix_transition_application (application_id, occurred_at),
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS candidate_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  application_id CHAR(36) NOT NULL,
  author_id CHAR(36) NOT NULL,
  body TEXT NOT NULL,
  visibility ENUM('team','private') NOT NULL DEFAULT 'team',
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_notes_application (application_id, created_at),
  CONSTRAINT fk_notes_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_notes_application FOREIGN KEY (organization_id, application_id)
    REFERENCES applications(organization_id, id),
  CONSTRAINT fk_notes_author FOREIGN KEY (author_id) REFERENCES users(id),
  CONSTRAINT fk_notes_author_member FOREIGN KEY (organization_id, author_id)
    REFERENCES organization_memberships(organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_templates (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  template_key VARCHAR(80) NOT NULL,
  name VARCHAR(140) NOT NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_template_key (organization_id, template_key),
  UNIQUE KEY uq_templates_org_id (organization_id, id),
  CONSTRAINT fk_templates_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_templates_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_templates_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_template_versions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  template_id CHAR(36) NOT NULL,
  locale ENUM('en','fa') NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html MEDIUMTEXT NOT NULL,
  body_text MEDIUMTEXT NOT NULL,
  allowed_variables_json TEXT NOT NULL,
  version INT UNSIGNED NOT NULL,
  status ENUM('draft','active','retired') NOT NULL DEFAULT 'draft',
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_template_version (template_id, locale, version),
  UNIQUE KEY uq_template_versions_org_id (organization_id, id),
  KEY ix_template_active (template_id, locale, status),
  CONSTRAINT fk_template_versions_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_template_versions_template FOREIGN KEY (organization_id, template_id)
    REFERENCES email_templates(organization_id, id),
  CONSTRAINT fk_template_versions_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_template_versions_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS automation_rules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  position_id CHAR(36) NULL,
  name VARCHAR(160) NOT NULL,
  trigger_type VARCHAR(80) NOT NULL,
  trigger_label VARCHAR(180) NOT NULL,
  action_type VARCHAR(80) NOT NULL,
  action_label VARCHAR(180) NOT NULL,
  conditions_json LONGTEXT NOT NULL,
  action_config_json LONGTEXT NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  requires_approval TINYINT(1) NOT NULL DEFAULT 1,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  last_run_at DATETIME(3) NULL,
  last_run_status ENUM('success','failed','never') NOT NULL DEFAULT 'never',
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  KEY ix_automations_trigger (organization_id, enabled, trigger_type),
  CONSTRAINT fk_automations_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_automations_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_automations_creator FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_automations_creator_member FOREIGN KEY (organization_id, created_by)
    REFERENCES organization_memberships(organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_outbox (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  application_id CHAR(36) NULL,
  template_version_id CHAR(36) NULL,
  recipient VARCHAR(254) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_text MEDIUMTEXT NOT NULL,
  body_html MEDIUMTEXT NULL,
  status ENUM('draft','queued','sending','sent','failed','canceled','dead') NOT NULL DEFAULT 'draft',
  requires_approval TINYINT(1) NOT NULL DEFAULT 1,
  approved_by CHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  idempotency_key VARCHAR(180) NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  available_at DATETIME(3) NOT NULL,
  lease_until DATETIME(3) NULL,
  lease_token CHAR(64) NULL,
  last_error_code VARCHAR(80) NULL,
  created_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_outbox_idempotency (organization_id, idempotency_key),
  UNIQUE KEY uq_outbox_org_id (organization_id, id),
  KEY ix_outbox_claim (status, available_at, lease_until),
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_deliveries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  outbox_id CHAR(36) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  provider_message_id VARCHAR(255) NULL,
  status ENUM('sent','delivered','bounced','suppressed','failed') NOT NULL,
  response_code VARCHAR(80) NULL,
  occurred_at DATETIME(3) NOT NULL,
  KEY ix_deliveries_outbox (outbox_id, occurred_at),
  UNIQUE KEY uq_delivery_provider_message (provider, provider_message_id),
  CONSTRAINT fk_deliveries_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_deliveries_outbox FOREIGN KEY (organization_id, outbox_id)
    REFERENCES email_outbox(organization_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_requests (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  application_id CHAR(36) NOT NULL,
  assessment_id CHAR(36) NOT NULL,
  requested_by CHAR(36) NOT NULL,
  blind_mode TINYINT(1) NOT NULL DEFAULT 1,
  note TEXT NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  KEY ix_review_expiry (expires_at, revoked_at),
  CONSTRAINT fk_review_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_review_application FOREIGN KEY (organization_id, application_id)
    REFERENCES applications(organization_id, id),
  CONSTRAINT fk_review_assessment FOREIGN KEY (organization_id, application_id, assessment_id)
    REFERENCES assessment_snapshots(organization_id, application_id, id),
  CONSTRAINT fk_review_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_review_requester_member FOREIGN KEY (organization_id, requested_by)
    REFERENCES organization_memberships(organization_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_grants (
  id CHAR(36) NOT NULL PRIMARY KEY,
  review_request_id CHAR(36) NOT NULL,
  recipient_email VARCHAR(254) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  scopes_json TEXT NOT NULL,
  opened_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_review_token_hash (token_hash),
  UNIQUE KEY uq_review_recipient (review_request_id, recipient_email),
  CONSTRAINT fk_review_grant_request FOREIGN KEY (review_request_id) REFERENCES review_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS review_feedback (
  id CHAR(36) NOT NULL PRIMARY KEY,
  review_request_id CHAR(36) NOT NULL,
  grant_id CHAR(36) NOT NULL,
  decision ENUM('advance','hold','decline') NOT NULL,
  comment TEXT NOT NULL,
  submitted_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_review_feedback_grant (grant_id),
  CONSTRAINT fk_feedback_request FOREIGN KEY (review_request_id) REFERENCES review_requests(id),
  CONSTRAINT fk_feedback_grant FOREIGN KEY (grant_id) REFERENCES review_grants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_queue (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  job_type VARCHAR(80) NOT NULL,
  payload_json LONGTEXT NOT NULL,
  status ENUM('queued','running','succeeded','failed','dead','canceled') NOT NULL DEFAULT 'queued',
  idempotency_key VARCHAR(180) NOT NULL,
  attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  available_at DATETIME(3) NOT NULL,
  lease_until DATETIME(3) NULL,
  last_error_code VARCHAR(80) NULL,
  created_at DATETIME(3) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  UNIQUE KEY uq_work_idempotency (organization_id, idempotency_key),
  KEY ix_work_claim (status, available_at, lease_until),
  CONSTRAINT fk_work_org FOREIGN KEY (organization_id) REFERENCES organizations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limit_windows (
  scope VARCHAR(80) NOT NULL,
  subject_hash CHAR(64) NOT NULL,
  window_start DATETIME(3) NOT NULL,
  hit_count INT UNSIGNED NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  PRIMARY KEY (scope, subject_hash, window_start),
  KEY ix_rate_cleanup (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  actor_type ENUM('user','external_reviewer','system') NOT NULL,
  actor_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  target_type VARCHAR(80) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  target_label VARCHAR(255) NOT NULL DEFAULT '',
  position_id CHAR(36) NULL,
  application_id CHAR(36) NULL,
  request_id VARCHAR(100) NULL,
  source ENUM('ui','api','automation','cron') NOT NULL,
  metadata_json LONGTEXT NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  KEY ix_audit_org_time (organization_id, occurred_at),
  KEY ix_audit_position_time (position_id, occurred_at),
  KEY ix_audit_application_time (application_id, occurred_at),
  CONSTRAINT fk_audit_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  CONSTRAINT fk_audit_actor_member FOREIGN KEY (organization_id, actor_id)
    REFERENCES organization_memberships(organization_id, user_id),
  CONSTRAINT fk_audit_position FOREIGN KEY (organization_id, position_id)
    REFERENCES positions(organization_id, id),
  CONSTRAINT fk_audit_application FOREIGN KEY (organization_id, application_id)
    REFERENCES applications(organization_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO schema_migrations (version) VALUES ('001_initial');

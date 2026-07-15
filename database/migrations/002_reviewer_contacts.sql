-- MySQL/cPanel equivalent of the organization-scoped reviewer directory.
CREATE TABLE IF NOT EXISTS reviewer_contacts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  added_by CHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  normalized_email VARCHAR(254) GENERATED ALWAYS AS (LOWER(email)) STORED,
  CONSTRAINT uq_reviewer_contacts_org_email UNIQUE (organization_id, normalized_email),
  CONSTRAINT fk_reviewer_contacts_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_reviewer_contacts_added_by FOREIGN KEY (added_by) REFERENCES users(id),
  CONSTRAINT fk_reviewer_contacts_member FOREIGN KEY (organization_id, added_by)
    REFERENCES organization_memberships(organization_id, user_id),
  INDEX ix_reviewer_contacts_org_status (organization_id, status, name, email)
);

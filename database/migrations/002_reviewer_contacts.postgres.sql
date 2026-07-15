-- Organization-scoped reviewer directory for controlled review sharing.
CREATE TABLE IF NOT EXISTS reviewer_contacts (
  id UUID NOT NULL PRIMARY KEY,
  organization_id UUID NOT NULL,
  name VARCHAR(160) NOT NULL DEFAULT '',
  email VARCHAR(254) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  added_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reviewer_contacts_org FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_reviewer_contacts_added_by FOREIGN KEY (added_by) REFERENCES users(id),
  CONSTRAINT fk_reviewer_contacts_member FOREIGN KEY (organization_id, added_by)
    REFERENCES organization_memberships(organization_id, user_id),
  CONSTRAINT chk_reviewer_contacts_status CHECK (status IN ('active', 'archived'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reviewer_contacts_org_email
  ON reviewer_contacts (organization_id, LOWER(email));
CREATE INDEX IF NOT EXISTS ix_reviewer_contacts_org_status
  ON reviewer_contacts (organization_id, status, name, email);

INSERT INTO schema_migrations (version) VALUES ('002_reviewer_contacts') ON CONFLICT DO NOTHING;

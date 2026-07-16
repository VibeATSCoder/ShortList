import { get, put, del } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const sourcePositionId = process.env.SHOWCASE_POSITION_ID || process.env.PUBLIC_INTAKE_POSITION_ID;
const showcaseEmail = process.env.SHOWCASE_CANDIDATE_EMAIL?.trim().toLowerCase();
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.");
if (!sourcePositionId || !showcaseEmail) throw new Error("SHOWCASE_POSITION_ID and SHOWCASE_CANDIDATE_EMAIL are required.");
if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) throw new Error("Private Blob credentials are required.");

const client = new Client({ connectionString });
await client.connect();

const sourceResult = await client.query(
  `SELECT p.title, p.department, p.location, p.employment_type, p.description,
          p.default_locale, p.timezone, s.stage_key,
          c.display_name, c.current_role, c.email, c.phone, c.parse_quality_json,
          c.identity_ciphertext, c.identity_key_version,
          a.source,
          x.rubric_version, x.prompt_version, x.model, x.locale, x.job_hash,
          x.rubric_hash, x.score, x.recommendation, x.confidence, x.assessment_json,
          r.storage_key, r.original_name, r.content_type, r.byte_size, r.sha256,
          r.encryption_key_version
     FROM positions p
     JOIN applications a ON a.position_id = p.id AND a.state <> 'archived'
     JOIN pipeline_stages s ON s.id = a.current_stage_id
     JOIN candidates c ON c.id = a.candidate_id AND c.organization_id = a.organization_id
     JOIN assessment_snapshots x ON x.id = a.latest_assessment_id
     JOIN resume_assets r ON r.id = x.resume_asset_id AND r.state = 'active'
    WHERE p.id = $1::uuid AND LOWER(c.email) = $2
    ORDER BY x.created_at DESC
    LIMIT 1`,
  [sourcePositionId, showcaseEmail],
);
const source = sourceResult.rows[0];
if (!source) throw new Error("The protected Pro showcase candidate, assessment, and resume could not be resolved.");

const targetResult = await client.query(
  `SELECT o.id AS organization_id, u.id AS owner_id, p.id AS position_id
     FROM users u
     JOIN organization_memberships m
       ON m.user_id = u.id AND m.role = 'owner' AND m.status = 'active'
     JOIN organizations o ON o.id = m.organization_id AND o.plan_tier = 'free'
     JOIN positions p ON p.organization_id = o.id AND p.status <> 'archived'
    WHERE LOWER(u.email) = 'free@ats.mehdisharifi.com'
    ORDER BY p.updated_at DESC
    LIMIT 1`,
);
const target = targetResult.rows[0];
if (!target) throw new Error("The Free demo organization and position could not be resolved.");

const existingCandidate = await client.query(
  `SELECT c.id AS candidate_id, a.id AS application_id, r.id AS resume_asset_id,
          r.storage_key
     FROM candidates c
     LEFT JOIN applications a
       ON a.organization_id = c.organization_id AND a.candidate_id = c.id
      AND a.position_id = $2::uuid
     LEFT JOIN assessment_snapshots x ON x.id = a.latest_assessment_id
     LEFT JOIN resume_assets r ON r.id = x.resume_asset_id AND r.state = 'active'
    WHERE c.organization_id = $1::uuid AND LOWER(c.email) = $3
    ORDER BY a.updated_at DESC NULLS LAST
    LIMIT 1`,
  [target.organization_id, target.position_id, showcaseEmail],
);
const existing = existingCandidate.rows[0];
const candidateId = existing?.candidate_id ?? randomUUID();
const applicationId = existing?.application_id ?? randomUUID();
const resumeAssetId = existing?.resume_asset_id ?? randomUUID();
const assessmentId = randomUUID();
const targetStorageKey = existing?.storage_key ?? `workspace-resumes/${target.organization_id}/${resumeAssetId}`;
let copiedBlob = false;

if (!existing?.resume_asset_id) {
  const sourceBlob = await get(source.storage_key, { access: "private" });
  if (!sourceBlob || sourceBlob.statusCode !== 200 || !sourceBlob.stream) throw new Error("The Pro showcase resume Blob is unavailable.");
  const bytes = Buffer.from(await new Response(sourceBlob.stream).arrayBuffer());
  await put(targetStorageKey, bytes, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: source.content_type,
  });
  copiedBlob = true;
}

try {
  await client.query("BEGIN");
  await client.query(
    `UPDATE positions
        SET title = $1, department = $2, location = $3, employment_type = $4,
            description = $5, default_locale = $6, timezone = $7,
            status = 'open', version = version + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8::uuid AND organization_id = $9::uuid`,
    [source.title, source.department, source.location, source.employment_type, source.description,
      source.default_locale, source.timezone, target.position_id, target.organization_id],
  );

  if (!existing?.candidate_id) {
    await client.query(
      `INSERT INTO candidates
        (id, organization_id, display_name, "current_role", email, phone,
         parse_quality_json, identity_ciphertext, identity_key_version,
         created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9,
               CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [candidateId, target.organization_id, source.display_name, source.current_role,
        source.email, source.phone, source.parse_quality_json, source.identity_ciphertext,
        source.identity_key_version],
    );
  } else {
    await client.query(
      `UPDATE candidates SET display_name = $1, "current_role" = $2, email = $3,
              phone = $4, parse_quality_json = $5, updated_at = CURRENT_TIMESTAMP
        WHERE id = $6::uuid AND organization_id = $7::uuid`,
      [source.display_name, source.current_role, source.email, source.phone,
        source.parse_quality_json, candidateId, target.organization_id],
    );
  }

  if (!existing?.resume_asset_id) {
    await client.query(
      `INSERT INTO resume_assets
        (id, organization_id, candidate_id, storage_key, original_name,
         content_type, byte_size, sha256, encryption_key_version, state,
         retention_until, created_at, deleted_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9,
               'active', CURRENT_TIMESTAMP + INTERVAL '365 days', CURRENT_TIMESTAMP, NULL)`,
      [resumeAssetId, target.organization_id, candidateId, targetStorageKey,
        source.original_name, source.content_type, source.byte_size, source.sha256,
        source.encryption_key_version],
    );
  }

  const stage = await client.query(
    `SELECT id FROM pipeline_stages
      WHERE organization_id = $1::uuid AND position_id = $2::uuid
        AND stage_key = $3 AND archived_at IS NULL
      LIMIT 1`,
    [target.organization_id, target.position_id, source.stage_key],
  );
  const fallbackStage = stage.rows[0] ?? (await client.query(
    `SELECT id FROM pipeline_stages
      WHERE organization_id = $1::uuid AND position_id = $2::uuid
        AND stage_key = 'applied' AND archived_at IS NULL
      LIMIT 1`,
    [target.organization_id, target.position_id],
  )).rows[0];
  if (!fallbackStage) throw new Error("The Free showcase pipeline stage is unavailable.");

  if (!existing?.application_id) {
    await client.query(
      `INSERT INTO applications
        (id, organization_id, position_id, candidate_id, current_stage_id,
         latest_assessment_id, source, state, version, created_at, updated_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid,
               NULL, $6, 'active', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [applicationId, target.organization_id, target.position_id, candidateId,
        fallbackStage.id, source.source],
    );
  } else {
    await client.query(
      `UPDATE applications SET current_stage_id = $1::uuid, state = 'active',
              version = version + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2::uuid AND organization_id = $3::uuid`,
      [fallbackStage.id, applicationId, target.organization_id],
    );
  }

  await client.query(
    `INSERT INTO assessment_snapshots
      (id, organization_id, position_id, application_id, resume_asset_id,
       rubric_version, prompt_version, model, locale, job_hash, rubric_hash,
       score, recommendation, confidence, assessment_json, created_by, created_at)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $6, $7, $8,
             $9, $10, $11, $12, $13, $14, $15, $16::uuid, CURRENT_TIMESTAMP)`,
    [assessmentId, target.organization_id, target.position_id, applicationId,
      resumeAssetId, source.rubric_version, source.prompt_version, source.model,
      source.locale, source.job_hash, source.rubric_hash, source.score,
      source.recommendation, source.confidence, source.assessment_json, target.owner_id],
  );
  await client.query(
    `UPDATE applications SET latest_assessment_id = $1::uuid, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2::uuid AND organization_id = $3::uuid`,
    [assessmentId, applicationId, target.organization_id],
  );
  await client.query(
    `INSERT INTO audit_events
      (id, organization_id, actor_type, actor_id, action, target_type, target_id,
       target_label, position_id, application_id, source, metadata_json, occurred_at)
     VALUES (gen_random_uuid(), $1::uuid, 'system', NULL, 'showcase.mirrored',
             'application', $2::text, 'Protected Mehdi Sharifi showcase', $3::uuid,
             $2::uuid, 'api', $4, CURRENT_TIMESTAMP)`,
    [target.organization_id, applicationId, target.position_id,
      JSON.stringify({ sourcePositionId, resumeCopied: copiedBlob })],
  );
  await client.query("COMMIT");
  console.log(JSON.stringify({
    ok: true,
    freePositionId: target.position_id,
    candidateId,
    applicationId,
    assessmentId,
    resumeAssetId,
    score: Number(source.score),
  }));
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  if (copiedBlob) await del(targetStorageKey).catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

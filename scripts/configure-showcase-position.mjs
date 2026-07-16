import { Client } from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
let positionId = process.env.PUBLIC_INTAKE_POSITION_ID;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.");

const description = "Own AI products from an ambiguous idea to a reliable production release. Architect practical agentic systems using LLMs, RAG, MCP, deterministic workflows, autonomous agents, and automation; build the backend APIs, data stores, vector retrieval, monitoring, and usable web, bot, or internal interface needed to make the product operational. Strong evidence includes Python, FastAPI or Django, PostgreSQL, Redis, vector databases, Docker, Kubernetes, CI/CD, observability, n8n-style automation, enterprise AI assistants, and applied AI research translated into working systems. Use managed services, low-code tools, or custom code pragmatically based on speed and product needs. This is an AI-heavy full-stack role: React, Next.js, and TypeScript are useful but are not hard gates when equivalent user-facing delivery and fast stack adaptation are demonstrated. Production deployments, enterprise scope, maintainable architecture, improved operational workflows, research results, and customer-facing automation all count as impact. For NDA-bound work, credible architecture, responsibilities, and shipped scope are accepted when confidential metrics cannot be disclosed. Independent ownership is valued, while high-agency consulting and cross-functional delivery also qualify.";

const client = new Client({ connectionString });
await client.connect();
if (process.argv.includes("--list")) {
  const positions = await client.query(
    `SELECT p.id, p.title, o.name AS organization, o.plan_tier,
            COUNT(a.id)::int AS active_candidates, p.updated_at
       FROM positions p
       JOIN organizations o ON o.id = p.organization_id
       LEFT JOIN applications a ON a.position_id = p.id AND a.state <> 'archived'
      WHERE p.status = 'open'
      GROUP BY p.id, o.name, o.plan_tier
      ORDER BY p.updated_at DESC`,
  );
  console.log(JSON.stringify(positions.rows));
  await client.end();
  process.exit(0);
}
if (process.argv.includes("--candidate-status")) {
  const email = process.env.SHOWCASE_CANDIDATE_EMAIL?.trim().toLowerCase();
  if (!email) throw new Error("SHOWCASE_CANDIDATE_EMAIL is required.");
  const candidates = await client.query(
    `SELECT a.id AS application_id, a.position_id, a.state,
            x.score, x.confidence, x.assessment_json,
            (r.id IS NOT NULL) AS resume_stored
       FROM candidates c
       JOIN applications a ON a.candidate_id = c.id AND a.organization_id = c.organization_id
       LEFT JOIN assessment_snapshots x ON x.id = a.latest_assessment_id
       LEFT JOIN resume_assets r ON r.id = x.resume_asset_id AND r.state = 'active'
      WHERE LOWER(c.email) = $1
      ORDER BY a.updated_at DESC`,
    [email],
  );
  console.log(JSON.stringify(candidates.rows.map((row) => {
    const assessment = row.assessment_json ? JSON.parse(row.assessment_json) : null;
    return {
      applicationId: row.application_id,
      positionId: row.position_id,
      state: row.state,
      score: Number(row.score),
      confidence: row.confidence,
      resumeStored: row.resume_stored,
      verdict: assessment?.verdict,
      rubric: assessment?.rubric?.map((item) => ({ key: item.key, score: item.score, maxScore: item.maxScore })),
      gaps: assessment?.gaps,
      risks: assessment?.risks,
    };
  })));
  await client.end();
  process.exit(0);
}
if (process.argv.includes("--prepare-rescreen")) {
  if (process.env.ALLOW_SHOWCASE_RESCREEN !== "1") throw new Error("ALLOW_SHOWCASE_RESCREEN=1 is required.");
  const email = process.env.SHOWCASE_CANDIDATE_EMAIL?.trim().toLowerCase();
  const targetPositionId = process.env.PUBLIC_INTAKE_POSITION_ID;
  if (!email || !targetPositionId) throw new Error("Showcase email and target position are required.");
  try {
    await client.query("BEGIN");
    const application = await client.query(
      `UPDATE applications a
          SET state = 'archived', version = version + 1, updated_at = CURRENT_TIMESTAMP
         FROM candidates c
        WHERE a.candidate_id = c.id AND a.organization_id = c.organization_id
          AND LOWER(c.email) = $1 AND a.position_id = $2::uuid
          AND a.state <> 'archived'
        RETURNING a.id, a.organization_id, a.position_id`,
      [email, targetPositionId],
    );
    if (application.rowCount !== 1) throw new Error("Expected one active showcase application; re-screen preparation aborted.");
    const row = application.rows[0];
    await client.query(
      `INSERT INTO audit_events
        (id, organization_id, actor_type, actor_id, action, target_type, target_id,
         target_label, position_id, application_id, source, metadata_json, occurred_at)
       VALUES (gen_random_uuid(), $1::uuid, 'system', NULL, 'application.showcase_rescreen_prepared',
               'application', $2::text, 'Protected showcase candidate', $3::uuid,
               $2::uuid, 'api', '{}', CURRENT_TIMESTAMP)`,
      [row.organization_id, row.id, row.position_id],
    );
    await client.query("COMMIT");
    console.log(JSON.stringify({ ok: true, applicationId: row.id }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await client.end();
  }
  process.exit(0);
}
try {
  await client.query("BEGIN");
  if (!positionId) {
    const appUrl = process.env.APP_URL || "https://ats.mehdisharifi.com";
    const response = await fetch(`${appUrl.replace(/\/$/, "")}/api/public-intake`);
    if (!response.ok) throw new Error("The live public intake configuration could not be read.");
    const payload = await response.json();
    const matches = await client.query(
      `SELECT id FROM positions
        WHERE status = 'open' AND title = $1 AND description = $2`,
      [payload.job?.title, payload.job?.description],
    );
    if (matches.rowCount !== 1) throw new Error("The live public intake position could not be uniquely resolved.");
    positionId = matches.rows[0].id;
  }
  const position = await client.query(
    `UPDATE positions
        SET description = $1, department = 'Agentic AI Product Engineering',
            employment_type = 'Full-time', version = version + 1,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = $2::uuid AND status = 'open'
      RETURNING id, organization_id, title`,
    [description, positionId],
  );
  if (position.rowCount !== 1) throw new Error("Expected exactly one open Solo AI Builder position; update aborted.");
  const row = position.rows[0];
  await client.query(
    `INSERT INTO audit_events
      (id, organization_id, actor_type, actor_id, action, target_type, target_id,
       target_label, position_id, application_id, source, metadata_json, occurred_at)
     VALUES (gen_random_uuid(), $1, 'system', NULL, 'position.showcase_calibrated',
             'position', $2::text, $3, $2::uuid, NULL, 'api', $4, CURRENT_TIMESTAMP)`,
    [row.organization_id, row.id, row.title, JSON.stringify({ rationale: "Role criteria aligned to production Agentic AI and pragmatic full-stack delivery evidence." })],
  );
  await client.query("COMMIT");
  console.log(JSON.stringify({ ok: true, positionId: row.id, title: row.title }));
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

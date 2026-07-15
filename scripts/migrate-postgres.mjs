import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { Client } from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.");

const client = new Client({ connectionString });

await client.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) NOT NULL PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const directory = resolve("database/migrations");
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".postgres.sql"))
    .sort((left, right) => left.localeCompare(right));
  let applied = 0;

  for (const file of files) {
    const version = basename(file, ".postgres.sql");
    const existing = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version = $1 LIMIT 1",
      [version],
    );
    if (existing.rowCount) continue;

    const migration = await readFile(resolve(directory, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(migration);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
        [version],
      );
      await client.query("COMMIT");
      applied += 1;
      console.log(`Applied ${version}.`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    }
  }

  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS table_count FROM information_schema.tables WHERE table_schema = 'public'",
  );
  console.log(`Neon migrations complete (${applied} applied, ${rows[0].table_count} public tables).`);
} catch (error) {
  throw error;
} finally {
  await client.end();
}

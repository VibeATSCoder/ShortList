import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Client } from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.");

const migration = await readFile(
  resolve("database/migrations/001_initial.postgres.sql"),
  "utf8",
);
const client = new Client({ connectionString });

await client.connect();
try {
  await client.query("BEGIN");
  await client.query(migration);
  await client.query("COMMIT");
  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS table_count FROM information_schema.tables WHERE table_schema = 'public'",
  );
  console.log(`Neon migration complete (${rows[0].table_count} public tables).`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}

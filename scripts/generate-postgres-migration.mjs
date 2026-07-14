import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = resolve("database/migrations/001_initial.sql");
const targetPath = resolve("database/migrations/001_initial.postgres.sql");
const source = await readFile(sourcePath, "utf8");
const indexes = [];
let currentTable = "";

const lines = source.replaceAll("\r\n", "\n").split("\n");
const converted = [];
for (let line of lines) {
  const table = line.match(/^CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/i);
  if (table) currentTable = table[1];

  if (/^SET\s/i.test(line)) continue;
  if (/^--/.test(line)) continue;

  const index = line.match(/^\s*KEY\s+([a-z0-9_]+)\s*\((.+)\),?$/i);
  if (index) {
    indexes.push(`CREATE INDEX IF NOT EXISTS ${index[1]} ON ${currentTable} (${index[2]});`);
    continue;
  }

  line = line
    .replace(/CHAR\(36\)/gi, "UUID")
    .replace(/\bcurrent_role\b/gi, '"current_role"')
    .replace(/DATETIME\(3\)/gi, "TIMESTAMPTZ")
    .replace(/MEDIUMTEXT|LONGTEXT/gi, "TEXT")
    .replace(/TINYINT\(1\)/gi, "SMALLINT")
    .replace(/SMALLINT\s+UNSIGNED/gi, "INTEGER")
    .replace(/INT\s+UNSIGNED/gi, "INTEGER")
    .replace(/ENUM\([^)]*\)/gi, "VARCHAR(40)")
    .replace(/CURRENT_TIMESTAMP\(3\)/gi, "CURRENT_TIMESTAMP")
    .replace(/\s+ON UPDATE CURRENT_TIMESTAMP/gi, "")
    .replace(/^\s*UNIQUE KEY\s+([a-z0-9_]+)\s*/i, "  CONSTRAINT $1 UNIQUE ")
    .replace(/\) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;/i, ");")
    .replace(/^INSERT IGNORE INTO\s+(.+);$/i, "INSERT INTO $1 ON CONFLICT DO NOTHING;");

  converted.push(line);
}

let output = converted.join("\n").replace(/,\n\);/g, "\n);");
output = [
  "-- Shortlist ATS · Neon PostgreSQL foundation",
  "-- Generated from the canonical relational model. Safe to run repeatedly.",
  "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
  "",
  output.trim(),
  "",
  ...indexes,
  "",
].join("\n");

await writeFile(targetPath, output, "utf8");
console.log(`Generated ${targetPath}`);

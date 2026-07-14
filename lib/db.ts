import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { ExecuteValues } from "mysql2";

declare global {
  var __shortlistPostgresPool: Pool | undefined;
}

type QueryValues = ExecuteValues;
type QueryTuple<T> = [T, undefined];

export interface DatabaseConnection {
  execute<T = ResultSetHeader>(sql: string, values?: QueryValues): Promise<QueryTuple<T>>;
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function postgresSql(source: string): string {
  let sql = source
    .replace(/\bcurrent_role\b/gi, '"current_role"')
    .replace(/UUID\(\)/gi, "gen_random_uuid()")
    .replace(/UTC_TIMESTAMP\(3\)/gi, "CURRENT_TIMESTAMP")
    .replace(
      /DATE_ADD\(CURRENT_TIMESTAMP,\s*INTERVAL\s+\?\s+SECOND\)/gi,
      "(CURRENT_TIMESTAMP + (? * INTERVAL '1 second'))",
    )
    .replace(
      /DATE_ADD\(CURRENT_TIMESTAMP,\s*INTERVAL\s+\?\s+HOUR\)/gi,
      "(CURRENT_TIMESTAMP + (? * INTERVAL '1 hour'))",
    )
    .replace(
      /DATE_SUB\(CURRENT_TIMESTAMP,\s*INTERVAL\s+5\s+MINUTE\)/gi,
      "(CURRENT_TIMESTAMP - INTERVAL '5 minutes')",
    )
    .replace(
      /ON DUPLICATE KEY UPDATE\s+hit_count\s*=\s*hit_count\s*\+\s*1,\s*expires_at\s*=\s*VALUES\(expires_at\)/gi,
      "ON CONFLICT (scope, subject_hash, window_start) DO UPDATE SET hit_count = rate_limit_windows.hit_count + 1, expires_at = EXCLUDED.expires_at",
    )
    .replace(
      /ON DUPLICATE KEY UPDATE\s+id\s*=\s*email_outbox\.id/gi,
      "ON CONFLICT (organization_id, idempotency_key) DO NOTHING",
    );

  let parameter = 0;
  sql = sql.replace(/\?/g, () => `$${++parameter}`);
  return sql;
}

function resultValue<T>(rows: QueryResultRow[], rowCount: number | null, command: string): T {
  if (command === "SELECT" || rows.length > 0) return rows as T;
  return { affectedRows: rowCount ?? 0 } as T;
}

function executor(client: Pick<Pool, "query"> | Pick<PoolClient, "query">): DatabaseConnection {
  return {
    async execute<T = ResultSetHeader>(sql: string, values: QueryValues = []): Promise<QueryTuple<T>> {
      const result = await client.query(postgresSql(sql), values as unknown[]);
      return [resultValue<T>(result.rows, result.rowCount, result.command), undefined];
    },
  };
}

export function databaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function databasePool(): Pool {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_NOT_CONFIGURED");

  if (!globalThis.__shortlistPostgresPool) {
    globalThis.__shortlistPostgresPool = new Pool({
      connectionString,
      max: boundedInteger(process.env.DB_POOL_SIZE, 4, 1, 8),
      connectionTimeoutMillis: 8_000,
      idleTimeoutMillis: 20_000,
      keepAlive: true,
      allowExitOnIdle: true,
    });
  }

  return globalThis.__shortlistPostgresPool;
}

export async function queryRows<T extends RowDataPacket>(
  sql: string,
  values: QueryValues = [],
): Promise<T[]> {
  const result = await databasePool().query(postgresSql(sql), values as unknown[]);
  return result.rows as T[];
}

export async function execute(
  sql: string,
  values: QueryValues = [],
): Promise<ResultSetHeader> {
  const result = await databasePool().query(postgresSql(sql), values as unknown[]);
  return { affectedRows: result.rowCount ?? 0 } as ResultSetHeader;
}

export async function withTransaction<T>(
  operation: (connection: DatabaseConnection) => Promise<T>,
): Promise<T> {
  const client = await databasePool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(executor(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function databaseHealth(): Promise<
  { configured: false } | { configured: true; connected: boolean; latencyMs: number }
> {
  if (!databaseConfigured()) return { configured: false };
  const startedAt = Date.now();
  try {
    await databasePool().query("SELECT 1");
    return { configured: true, connected: true, latencyMs: Date.now() - startedAt };
  } catch {
    return { configured: true, connected: false, latencyMs: Date.now() - startedAt };
  }
}

import "server-only";

import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import type { ExecuteValues } from "mysql2";

declare global {
  var __shortlistMysqlPool: Pool | undefined;
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

export function databaseConfigured(): boolean {
  return Boolean(
    process.env.DB_HOST &&
      process.env.DB_NAME &&
      process.env.DB_USER &&
      process.env.DB_PASSWORD,
  );
}

export function databasePool(): Pool {
  if (!databaseConfigured()) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  if (!globalThis.__shortlistMysqlPool) {
    const port = boundedInteger(process.env.DB_PORT, 3306, 1, 65_535);
    const connectionLimit = boundedInteger(process.env.DB_POOL_SIZE, 4, 1, 8);
    globalThis.__shortlistMysqlPool = mysql.createPool({
      host: process.env.DB_HOST,
      port,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: "utf8mb4",
      timezone: "Z",
      connectionLimit,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10_000,
      waitForConnections: true,
      queueLimit: 24,
      connectTimeout: 8_000,
      decimalNumbers: true,
      ...(process.env.DB_SSL === "true"
        ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
        : {}),
    });
  }

  return globalThis.__shortlistMysqlPool;
}

export async function queryRows<T extends RowDataPacket>(
  sql: string,
  values: ExecuteValues = [],
): Promise<T[]> {
  const [rows] = await databasePool().execute<T[]>(sql, values);
  return rows;
}

export async function execute(
  sql: string,
  values: ExecuteValues = [],
): Promise<ResultSetHeader> {
  const [result] = await databasePool().execute<ResultSetHeader>(sql, values);
  return result;
}

export async function withTransaction<T>(
  operation: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await databasePool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally {
    connection.release();
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

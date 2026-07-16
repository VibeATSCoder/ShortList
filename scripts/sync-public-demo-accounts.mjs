import { hash } from "bcryptjs";
import { Client } from "pg";

const accounts = [
  { email: "free@ats.mehdisharifi.com", password: "TryShortlistFree2026!", tier: "free" },
  { email: "pro@ats.mehdisharifi.com", password: "TryShortlistPro2026!", tier: "pro" },
];

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required.");

const client = new Client({ connectionString });
await client.connect();
await client.query("BEGIN");

try {
  for (const account of accounts) {
    const result = await client.query(
      `SELECT u.id AS user_id, m.organization_id
         FROM users u
         JOIN organization_memberships m ON m.user_id = u.id AND m.status = 'active'
        WHERE u.email = $1
        LIMIT 1`,
      [account.email],
    );
    const row = result.rows[0];
    if (!row) throw new Error(`Demo account is not bootstrapped: ${account.email}`);

    await client.query(
      "UPDATE users SET password_hash = $1, status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [await hash(account.password, 12), row.user_id],
    );
    await client.query(
      "UPDATE organizations SET plan_tier = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [account.tier, row.organization_id],
    );
    await client.query(
      "UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND revoked_at IS NULL",
      [row.user_id],
    );
  }

  await client.query("COMMIT");
  console.log("Public Free and Pro demo credentials synchronized; previous sessions revoked.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

# Shortlist ATS: production deployment on cPanel

This runbook deploys the current Next.js 16 application to
`https://ats.mehdisharifi.com` behind Cloudflare, with cPanel MySQL,
phpMyAdmin for controlled SQL imports, cPanel SMTP, private filesystem review
storage, and cPanel Cron.

It is intentionally strict. Stop when a gate fails; do not work around a
runtime, certificate, DNS, or backup failure with weaker settings.

## 1. Known values and secret-handling rule

These non-secret values came from the deployment owner:

| Setting | Value |
| --- | --- |
| Public application URL | `https://ats.mehdisharifi.com` |
| Owner name | `Mehdi Sharifi` |
| Sender/login mailbox | `reviews@ats.mehdisharifi.com` |
| Supplied SMTP hostname | `ats.mehdisharifi.com` |
| SMTP port and mode | `465`, implicit TLS (`SMTP_SECURE=true`) |
| Allowed reviewers | `mrtensor8@gmail.com`, `lexapro8585@gmail.com` |
| Application timezone | `Asia/Tehran` |

No database name, database username, database password, SMTP password, API
key, or application secret was supplied. This document therefore never
invents one and never places one in a command, Git-tracked file, screenshot,
or example value. Create secrets in their owning control panel and enter them
only in cPanel's protected environment-variable UI or an interactive hidden
prompt.

Do not commit `.env`, `.env.local`, a database dump, a cPanel archive, or a
terminal transcript containing credentials. Do not prefix any secret with
`NEXT_PUBLIC_`.

## 2. Stop/go hosting gate

Confirm all of the following before changing DNS:

- cPanel exposes **Setup Node.js App**, **Node.js Selector**, or
  **Application Manager** for this account.
- The selected Node version is at least `20.9.0`. Node 22 or 24 is preferred.
- The application can use `app.js` as its startup file.
- The web server's Node integration supports a Next.js standalone server.
  The current origin reports LiteSpeed, so use its CloudLinux Node.js Selector
  integration rather than trying to run `next dev` or a permanent shell
  process.
- SSH or cPanel Terminal, Cron Jobs, environment variables, and directories
  outside `public_html` are available.
- The account can make outbound HTTPS connections to OpenAI and an outbound
  TLS connection to the selected SMTP hostname on port 465. Upstash is only
  needed if you deliberately choose it instead of the built-in MySQL limiter.
- MySQL 8.0+ or MariaDB 10.6+ is available.
- The account has enough MySQL connections for the configured pool. Start
  with four connections and confirm the provider's account limit before
  increasing it.
- A provider-managed account backup is enabled and a manual database restore
  has been tested.

In cPanel Terminal, record the non-secret output:

```bash
node --version
npm --version
mysql --version
uname -m
command -v node npm curl flock
```

If the panel offers only Node 18, stop: Next.js 16 does not support that
runtime. If the panel cannot start a standalone `server.js`/`app.js`, keep the
application on a managed Node platform or move it to a Node-capable VPS. A PHP
gateway is not a deployment substitute for this repository; it would require
rewriting the App Router pages, route handlers, auth, OpenAI orchestration,
file delivery, and email workflow.

## 3. Diagnose and repair DNS before SMTP

### 3.1 Observed state on 2026-07-14

The public records currently show:

- `ats.mehdisharifi.com` is orange-clouded through Cloudflare.
- HTTPS reaches a LiteSpeed origin, but `/` and `/api/health` return `404`.
  DNS exists; the Node application is not yet registered to the virtual host.
- The MX target is
  `_dc-mx.06eb72530dae.ats.mehdisharifi.com`, which currently resolves to
  `193.36.85.51`. Treat that address as an observation, not as authority;
  verify the real mail/origin IP in cPanel before using it.
- The SPF record literally contains `ip4:CPANEL_SERVER_IP`. That placeholder
  causes SPF evaluation to fail and must be replaced with cPanel's exact
  suggested record.
- The DKIM record literally contains `p=...`. An ellipsis is not a public key;
  replace the entire record with the full key shown by cPanel Email
  Deliverability.
- `_dmarc.ats.mehdisharifi.com` is present with `p=none`, which is suitable
  for initial monitoring after SPF and DKIM are fixed.
- `mail.ats.mehdisharifi.com` does not exist.
- `mail.mehdisharifi.com` is orange-clouded. A normal Cloudflare proxy does
  not proxy cPanel SMTP on port 465, so it is not a safe SMTP endpoint in its
  current state.

### 3.2 The supplied SMTP hostname conflicts with the web proxy

The supplied `SMTP_HOST=ats.mehdisharifi.com` cannot be used while that name is
orange-clouded: it resolves to Cloudflare rather than directly to cPanel, and
port 465 will not reach the cPanel mail server.

Do not grey-cloud the production web hostname just to make SMTP work. The
preferred fix is a dedicated, DNS-only mail hostname whose TLS certificate
matches its name:

`mail.ats.mehdisharifi.com`

If cPanel's **Email Accounts > Connect Devices** page provides a different
server hostname with a valid certificate, use that exact hostname instead.
Never disable certificate verification and never use an IP address as
`SMTP_HOST`.

### 3.3 Cloudflare record plan

Replace every uppercase placeholder below with the exact value shown by
cPanel. Do not publish the literal placeholder.

| Type | Name | Value | Proxy | Purpose |
| --- | --- | --- | --- | --- |
| `A` | `ats` | `CPANEL_WEB_ORIGIN_IPV4` | Proxied after origin validation | Web application |
| `AAAA` | `ats` | Real web-origin IPv6 only | Proxied; otherwise omit | Web application |
| `A` | `mail.ats` | `CPANEL_MAIL_ORIGIN_IPV4` | **DNS only** | SMTP/IMAP hostname |
| `AAAA` | `mail.ats` | Real mail-origin IPv6 only | **DNS only**; otherwise omit | SMTP/IMAP hostname |
| `MX` | `ats` | `mail.ats.mehdisharifi.com` priority `10` | DNS records are not proxied | Mail delivery |
| `TXT` | `ats` | Exact SPF value from cPanel Email Deliverability | DNS only | SPF |
| `TXT` | `default._domainkey.ats` | Complete DKIM value from cPanel | DNS only | DKIM |
| `TXT` | `_dmarc.ats` | `v=DMARC1; p=none; rua=mailto:reviews@ats.mehdisharifi.com` | DNS only | Initial DMARC monitoring |

Use cPanel's generated SPF and DKIM values even if they differ from the table.
Do not append a second SPF record; a domain must have one SPF policy. Merge
legitimate senders into that one policy if necessary.

Recommended order:

1. Temporarily set `ats` to **DNS only**.
2. Create/confirm the `ats.mehdisharifi.com` domain in cPanel.
3. Run cPanel AutoSSL and verify a valid certificate at the origin.
4. Create the dedicated DNS-only mail hostname and ensure the mail certificate
   includes it.
5. Repair SPF and DKIM from **cPanel > Email Deliverability**.
6. Verify SMTP TLS using the final DNS-only hostname.
7. Set Cloudflare SSL/TLS mode to **Full (strict)**.
8. Turn only the web hostname `ats` back to **Proxied**. Keep mail and every
   MX target DNS-only.

Verify from a machine outside the hosting account:

```bash
dig +short A ats.mehdisharifi.com
dig +short A mail.ats.mehdisharifi.com
dig +short MX ats.mehdisharifi.com
dig +short TXT ats.mehdisharifi.com
dig +short TXT default._domainkey.ats.mehdisharifi.com
dig +short TXT _dmarc.ats.mehdisharifi.com
openssl s_client -connect mail.ats.mehdisharifi.com:465 \
  -servername mail.ats.mehdisharifi.com -verify_return_error </dev/null
```

The SMTP certificate verification must end successfully. If it does not, stop
and repair DNS/AutoSSL; do not set `rejectUnauthorized=false`.

After several days of aligned SPF/DKIM results, move DMARC gradually from
`p=none` to `p=quarantine` and finally `p=reject`. Do not enforce DMARC before
validating all legitimate senders.

### 3.4 Create and verify the mailbox

After cPanel recognizes `ats.mehdisharifi.com` as a domain:

1. Open **cPanel > Email Accounts**.
2. Create `reviews@ats.mehdisharifi.com` with a generated password and a
   deliberate quota.
3. Store its password in a password manager; do not reuse the cPanel, database,
   owner-login, or application-secret password.
4. Open **Connect Devices** for that mailbox and record the certificate-valid
   outgoing server hostname. That value, not an assumed hostname, is the final
   authority for `SMTP_HOST`.
5. In **Email Routing**, use **Local Mail Exchanger** only if this cPanel server
   really receives mail for the domain. If mail is hosted elsewhere, keep the
   provider's MX/routing and use the provider's authenticated SMTP settings.
6. Send and receive one manual message through webmail before testing the Node
   application.

## 4. Cloudflare web settings

Use these settings for `ats.mehdisharifi.com`:

- SSL/TLS: **Full (strict)**.
- Always Use HTTPS: enabled after the origin certificate succeeds.
- Do not cache `/api/*`, `/login*`, `/workspace*`, or `/review/*`.
- Static assets under `/_next/static/*` may be cached; Next.js gives them
  content-hashed immutable names.
- Disable Rocket Loader for this hostname.
- Preserve request bodies and the `Origin`, `Host`, and forwarding headers.
- If the hosting provider supports it, restrict origin web traffic to
  Cloudflare addresses and configure the origin to restore the real client IP.
- Confirm that the Cloudflare and origin request timeouts exceed the current
  75-second OpenAI timeout plus application overhead. The safer future design
  is a queued screening worker; the current screening route is synchronous.

Do not cache authenticated HTML or JSON even when Cloudflare offers an
"everything" cache rule.

## 5. Create the cPanel database correctly

phpMyAdmin is not the place to create the database or its users. cPanel needs
to map those resources to the hosting account so backup and restore work.

### 5.1 Database Wizard

In **cPanel > Database Wizard**:

1. Create a database with a short suffix such as `shortlist`.
2. Record the final cPanel-prefixed name, for example
   `<CPANEL_PREFIX>_shortlist`. The actual prefix is account-specific.
3. Create a migration user, for example
   `<CPANEL_PREFIX>_shortlist_migrator`, with a generated password. Give it all
   privileges on this database only.
4. Create a runtime user, for example
   `<CPANEL_PREFIX>_shortlist_app`, with a separate generated password.
5. In **Manage My Databases**, grant the runtime user only the privileges the
   application needs: `SELECT`, `INSERT`, `UPDATE`, and `DELETE`. Do not grant
   access to other account databases.

If the hosting plan cannot create a separate migration user, the cPanel
database owner may import the migration through phpMyAdmin, but the Node
application must still use the least-privileged runtime user.

For a database on the same cPanel server use:

```text
DB_HOST=localhost
DB_PORT=3306
DB_SSL=false
DB_POOL_SIZE=4
```

Use `DB_SSL=true` only for a remote database with a certificate chain trusted
by Node. The current client deliberately rejects an untrusted certificate.

### 5.2 Import the versioned migration with phpMyAdmin

phpMyAdmin is appropriate here only as the SQL import/inspection interface:

1. Open **cPanel > phpMyAdmin**.
2. Select the cPanel-created Shortlist database in the left sidebar.
3. Open **Import**.
4. Import `database/migrations/001_initial.sql` as UTF-8.
5. Do not add a `USE` statement and do not select another database.
6. Confirm that the import completes without an error.
7. Open the SQL tab and run:

```sql
SELECT version, applied_at
FROM schema_migrations
ORDER BY applied_at;
```

The result must contain `001_initial`. If a new, empty database import fails
before that row is written, do not manually patch individual tables. Capture
the error, delete/recreate the empty database through cPanel, correct the
compatibility problem, and import again.

Before every future migration:

1. Take a database backup.
2. Import only the next numbered, reviewed migration.
3. Verify its `schema_migrations` row.
4. Deploy code that is backward-compatible with the previous schema.

Never run schema migration automatically from Passenger startup; multiple app
processes can start concurrently.

## 6. Bootstrap the owner once

The repository's `scripts/bootstrap-admin.mjs` creates the first organization,
owner membership, default position, stages, templates, and automation rules.
It aborts if the email already exists and requires a password of at least 14
characters.

Run it from the private standalone release directory after importing
`001_initial.sql`. The cPanel artifact includes this one administrative script
at `scripts/bootstrap-admin.mjs` together with the traced runtime dependencies.

Set non-secret values normally, but read both passwords interactively so they
do not enter shell history:

```bash
cd /home/CPANEL_USER/apps/shortlist/current

export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME='<CPANEL_PREFIX>_shortlist'
export DB_USER='<CPANEL_PREFIX>_shortlist_app'
export DB_SSL=false
export BOOTSTRAP_ADMIN_EMAIL='reviews@ats.mehdisharifi.com'
export BOOTSTRAP_ADMIN_NAME='Mehdi Sharifi'
export BOOTSTRAP_ORGANIZATION_NAME='Shortlist Studio'

read -r -s -p 'Runtime DB password: ' DB_PASSWORD; printf '\n'
export DB_PASSWORD
read -r -s -p 'New Shortlist owner password: ' BOOTSTRAP_ADMIN_PASSWORD; printf '\n'
export BOOTSTRAP_ADMIN_PASSWORD

node scripts/bootstrap-admin.mjs

unset DB_PASSWORD BOOTSTRAP_ADMIN_PASSWORD
```

Replace `CPANEL_USER`, the database name, and the database username before
running this block. Never type the angle-bracket placeholders as literal
values. After success, sign in once and store the owner password in a password
manager. Do not keep `BOOTSTRAP_ADMIN_PASSWORD` in Application Manager.

## 7. Prepare private directories

Keep code and candidate material outside `public_html`:

```bash
install -d -m 700 /home/CPANEL_USER/apps/shortlist/releases
install -d -m 700 /home/CPANEL_USER/apps/shortlist/shared/reviews
install -d -m 700 /home/CPANEL_USER/apps/shortlist/shared/uploads
install -d -m 700 /home/CPANEL_USER/apps/shortlist/shared/logs
install -d -m 700 /home/CPANEL_USER/private/shortlist
```

Set:

```text
REVIEW_STORAGE_DIR=/home/CPANEL_USER/apps/shortlist/shared/reviews
FILE_ENCRYPTION_KEY=<EXACTLY_32_RANDOM_BYTES_ENCODED_AS_BASE64>
FILE_ENCRYPTION_KEY_VERSION=1
```

The current filesystem review store creates directories as `0700` and files
as `0600`, rejects traversal, and encrypts every filesystem review JSON/event
and attached résumé with AES-256-GCM. The storage path is authenticated as AAD,
which also prevents an encrypted object from being silently moved to another
logical review path. The filesystem provider refuses to enable unless the key
decodes to exactly 32 bytes. Generate it with `openssl rand -base64 32` and
store it only in the cPanel environment. Backups remain sensitive, and changing
the key/version requires a controlled decrypt/re-encrypt migration.

`PRIVATE_UPLOAD_DIR` is reserved for future long-lived canonical résumé
storage. The sealed workspace intake currently processes the résumé ephemerally
and persists only the assessment snapshot and optional candidate email.

## 8. Build the Linux standalone artifact

`next.config.ts` enables `output: "standalone"`. The packaging script:

- runs `next build`;
- copies the standalone server;
- copies `public` and `.next/static`;
- copies the database migrations and this runbook;
- copies the secret-free cPanel environment template and owner bootstrap script;
- generates Passenger/LiteSpeed startup file `app.js`;
- writes `release.json`;
- creates `dist-cpanel`.

Build on Linux with the same Node major and architecture as cPanel. Do not
upload a `dist-cpanel` artifact built on Windows because native optional
packages may target the wrong operating system.

From a clean Linux checkout with no `.env.local`:

```bash
node --version
npm ci
npm run lint
npm run typecheck
npm test
npm audit --omit=dev --audit-level=high

export DEPLOYMENT_ID="$(git rev-parse --short=12 HEAD)"
npm run package:cpanel
tar -C dist-cpanel -czf "shortlist-${DEPLOYMENT_ID}.tar.gz" .
sha256sum "shortlist-${DEPLOYMENT_ID}.tar.gz" \
  > "shortlist-${DEPLOYMENT_ID}.tar.gz.sha256"
```

The package's `app.js` deliberately does only this:

```js
"use strict";
process.env.NODE_ENV = "production";
require("./server.js");
```

Do not replace it with `next dev`, `npm start`, PM2, a hard-coded port, or a
PHP proxy. Application Manager/LiteSpeed owns process startup and socket
binding.

## 9. Install an immutable release

Upload the archive and checksum to a private staging directory under the
cPanel home directory. Then:

```bash
export DEPLOYMENT_ID='REPLACE_WITH_THE_BUILT_GIT_SHA'
export APP_HOME='/home/CPANEL_USER/apps/shortlist'
export RELEASE_DIR="$APP_HOME/releases/$DEPLOYMENT_ID"

cd /home/CPANEL_USER/private/shortlist
sha256sum -c "shortlist-${DEPLOYMENT_ID}.tar.gz.sha256"
install -d -m 700 "$RELEASE_DIR"
tar -xzf "shortlist-${DEPLOYMENT_ID}.tar.gz" -C "$RELEASE_DIR"
install -d -m 700 "$RELEASE_DIR/tmp"

test -f "$RELEASE_DIR/app.js"
test -f "$RELEASE_DIR/server.js"
test -d "$RELEASE_DIR/.next/static"
test -f "$RELEASE_DIR/database/migrations/001_initial.sql"
```

Replace both placeholders before execution. Inspect `release.json` and retain
the archive checksum with the release record.

For the first release:

```bash
ln -s "$RELEASE_DIR" "$APP_HOME/current"
```

For subsequent releases, switch the symlink atomically:

```bash
ln -s "$RELEASE_DIR" "$APP_HOME/current.next"
mv -Tf "$APP_HOME/current.next" "$APP_HOME/current"
touch "$APP_HOME/current/tmp/restart.txt"
```

If the hosting provider's Node selector refuses a symlink application root,
stop and confirm its supported release procedure. Do not overwrite a working
release in place. A safe provider-specific alternative must retain a complete
previous directory for rollback.

## 10. Register the Node application

In cPanel's Node.js application interface use:

| Field | Value |
| --- | --- |
| Node version | Highest supported version `>=20.9.0`, preferably 22 or 24 |
| Mode | `Production` |
| Application root | `apps/shortlist/current` |
| Application URL/domain | `ats.mehdisharifi.com` |
| Base URI | `/` |
| Startup file | `app.js` |

Do not set a fixed `PORT`; Passenger/LiteSpeed supplies the socket. If the UI
has an npm install button, do not let it replace the traced dependencies in
the standalone artifact. Restart by using the panel's restart action or:

```bash
touch /home/CPANEL_USER/apps/shortlist/current/tmp/restart.txt
```

Read application stderr from the path shown by the Node selector. On many
LiteSpeed/CloudLinux installations it is `stderr.log` under the application
root. Logs must never include passwords, API keys, raw session tokens, raw
review tokens, or resume text.

## 11. Configure runtime environment variables

Add these in Application Manager/Node.js Selector. Replace every
`OPERATOR_SUPPLIED_*` value in the UI; never store the resulting list in Git.

```text
NODE_ENV=production
APP_URL=https://ats.mehdisharifi.com
DEPLOYMENT_ID=<the deployed Git SHA>

DB_HOST=localhost
DB_PORT=3306
DB_NAME=<cPanel-prefixed database name>
DB_USER=<cPanel-prefixed runtime user>
DB_PASSWORD=<OPERATOR_SUPPLIED_IN_CPANEL_ONLY>
DB_POOL_SIZE=4
DB_SSL=false

SESSION_SECRET=<OPERATOR_GENERATED_32_OR_MORE_RANDOM_BYTES>
ASSESSMENT_SEAL_SECRET=<OPERATOR_GENERATED_32_OR_MORE_RANDOM_BYTES>
REVIEW_LINK_SECRET=<OPERATOR_GENERATED_32_OR_MORE_RANDOM_BYTES>
CRON_SECRET=<OPERATOR_GENERATED_RANDOM_SECRET>
RATE_LIMIT_KEY_SALT=<OPERATOR_GENERATED_32_OR_MORE_RANDOM_BYTES>
SAFETY_IDENTIFIER_SALT=<OPERATOR_GENERATED_32_OR_MORE_RANDOM_BYTES>

REVIEW_STORAGE_DIR=/home/CPANEL_USER/apps/shortlist/shared/reviews
FILE_ENCRYPTION_KEY=<EXACTLY_32_RANDOM_BYTES_ENCODED_AS_BASE64>
FILE_ENCRYPTION_KEY_VERSION=1

OPENAI_API_KEY=<OPERATOR_SUPPLIED_IN_CPANEL_ONLY>
OPENAI_MODEL=gpt-5.6
# Optional alternative to the built-in MySQL limiter:
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

SMTP_HOST=mail.ats.mehdisharifi.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=reviews@ats.mehdisharifi.com
SMTP_PASSWORD=<OPERATOR_SUPPLIED_IN_CPANEL_ONLY>
EMAIL_FROM=Shortlist ATS <reviews@ats.mehdisharifi.com>
EMAIL_REPLY_TO=reviews@ats.mehdisharifi.com
HR_NOTIFICATION_EMAIL=mrtensor8@gmail.com
REVIEW_ALLOWED_RECIPIENTS=mrtensor8@gmail.com,lexapro8585@gmail.com
```

If cPanel's certificate-valid mail server hostname differs from
`mail.ats.mehdisharifi.com`, use that exact hostname for `SMTP_HOST`. The
supplied `ats.mehdisharifi.com` value is acceptable only if it resolves
directly to the mail server; it must not be used while orange-clouded.

Generate independent secrets. Do not reuse the SMTP password, database
password, OpenAI key, or one application secret for another purpose. Preserve
`REVIEW_LINK_SECRET` across ordinary deployments or every outstanding review
link becomes invalid. Rotate a compromised secret deliberately with a
documented revocation plan.

`BLOB_READ_WRITE_TOKEN` and `VERCEL_OIDC_TOKEN` should be absent on cPanel so
the application chooses the filesystem review store.

Live screening intentionally fails closed unless the OpenAI key and a durable
rate limiter are available. On cPanel, the configured MySQL database uses the
`rate_limit_windows` table atomically, so Upstash can stay blank. Upstash
remains the preferred limiter for the separate serverless/Vercel deployment.

After saving environment variables, restart the application.

## 12. Configure the implemented reminder cron

The current cPanel-ready scheduled endpoint is:

```text
GET /api/cron/review-reminders
Authorization: Bearer <CRON_SECRET>
```

It sends reminders, records reminder events, and removes expired filesystem
review packs. The generic `work_queue` and `email_outbox` tables do not yet
have a standalone cron worker in this repository; do not claim that background
AI screening or general outbox retries are running.

Avoid putting `CRON_SECRET` directly in the visible cron command. Create a
private file `/home/CPANEL_USER/private/shortlist/cron.env`, mode `0600`, with
the real secret entered interactively by the operator:

```text
CRON_SECRET=<OPERATOR_SUPPLIED_VALUE>
```

Create `/home/CPANEL_USER/private/shortlist/run-review-reminders.sh`, mode
`0700`:

```bash
#!/bin/sh
set -eu
. /home/CPANEL_USER/private/shortlist/cron.env
/usr/bin/curl --fail --silent --show-error --max-time 120 \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  https://ats.mehdisharifi.com/api/cron/review-reminders
```

Replace `CPANEL_USER` in both files. In **cPanel > Cron Jobs**, add one daily
job matching the existing Vercel schedule:

```cron
0 5 * * * /usr/bin/flock -n /home/CPANEL_USER/private/shortlist/review-reminders.lock /home/CPANEL_USER/private/shortlist/run-review-reminders.sh >> /home/CPANEL_USER/apps/shortlist/shared/logs/review-reminders.log 2>&1
```

cPanel Cron uses the server timezone. The reminder logic uses UTC timestamps
and elapsed hours, so the exact local wall-clock time is not semantically
important. `flock` prevents overlap. Keep the log private, rotate it, and alert
on non-zero exit status.

## 13. Production verification

### 13.1 DNS and TLS

- `ats.mehdisharifi.com` resolves through Cloudflare after cutover.
- The selected SMTP hostname resolves directly to cPanel, not to Cloudflare.
- Browser TLS and SMTP TLS both validate without warnings.
- SPF contains no placeholder, DKIM contains the complete public key, and
  DMARC is visible.

### 13.2 HTTP and security headers

```bash
curl --fail --silent --show-error \
  https://ats.mehdisharifi.com/api/health

curl --silent --show-error --head \
  https://ats.mehdisharifi.com/
```

Expected health properties after complete configuration:

- `ok: true`
- `database.configured: true`
- `database.connected: true`
- `collaboration.recruiterWorkspace: true`
- `collaboration.cpanelEmail: true`
- `collaboration.reviewLinks: true`
- `collaboration.reviewStorage: "encrypted-filesystem"`
- `collaboration.dailyReminders: true`
- `rateLimit: "distributed"`
- `aiConfigured: true`

Confirm these response headers:

- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy`
- no `X-Powered-By`

### 13.3 Functional smoke test

1. Open `/` in a private browser window and test English and Persian/RTL.
2. Confirm the fictional seeded dashboard works without real candidate data.
3. Sign in at `/login` as `reviews@ats.mehdisharifi.com`.
4. Confirm `/workspace` loads the cPanel MySQL workspace rather than the
   read-only demo.
5. Move a fictional application and refresh; the change must persist.
6. Send one test email only to an address in
   `REVIEW_ALLOWED_RECIPIENTS`; confirm cPanel accepts it and the outbox/audit
   record is updated.
7. Create a fictional review without a resume first, open the signed link in a
   separate private session, submit feedback, and confirm it persists.
8. If the filesystem and retention policy have been accepted, repeat once
   with a small fictional attachment and verify authenticated download.
9. Screen only a fictional resume; confirm evidence, model metadata, and the
   rate-limit headers.
10. Run the reminder script manually and require a successful JSON response.
11. Review Node, LiteSpeed, Cloudflare, mail, and cron logs for errors and
    verify no secrets or candidate text were logged.

Do not use a real resume for initial smoke tests.

## 14. Backups and restore test

Use at least two independent layers:

1. Provider-managed cPanel account backups with database, mail, home files,
   and an off-server destination.
2. A manual pre-migration database dump and private review-storage backup.

Before a migration or release that changes persistence:

```bash
mysqldump --single-transaction --routines --triggers \
  -u '<CPANEL_PREFIX>_shortlist_migrator' -p \
  '<CPANEL_PREFIX>_shortlist' \
  > '/home/CPANEL_USER/private/shortlist/predeploy-UTC_TIMESTAMP.sql'
```

`-p` deliberately prompts interactively; do not append a password to the
command. Restrict the resulting dump to mode `0600`, encrypt it before moving
it off-server, and delete it according to the approved retention schedule.

Back up `/home/CPANEL_USER/apps/shortlist/shared/reviews` consistently with
the database. Review files contain candidate data even when filenames are
randomized. Never place their archive under `public_html`.

At least quarterly, restore a database dump and review-storage archive into a
separate non-production account, run `/api/health`, sign in, and open a
fictional review. A backup that has not passed a restore test is not a recovery
plan.

phpMyAdmin can import a selected `.sql` backup into a cPanel-created database.
A full cPanel-account restore may require the hosting provider/WHM, so document
the provider's restore request and expected recovery time before launch.

## 15. Rollback

Keep the current release and at least two previous release directories. Record
the Git SHA, artifact checksum, migration versions, deployment time, and smoke
result for every release.

If a new release fails before accepting production writes:

```bash
export APP_HOME='/home/CPANEL_USER/apps/shortlist'
export PREVIOUS_RELEASE='/home/CPANEL_USER/apps/shortlist/releases/PREVIOUS_GIT_SHA'

ln -s "$PREVIOUS_RELEASE" "$APP_HOME/current.rollback"
mv -Tf "$APP_HOME/current.rollback" "$APP_HOME/current"
touch "$APP_HOME/current/tmp/restart.txt"
```

Then rerun health and functional smoke checks.

Database rules:

- Prefer additive, backward-compatible migrations.
- Do not automatically run destructive down-migrations during code rollback.
- If the previous release is compatible with the expanded schema, roll code
  back without changing data.
- Restore the database only for confirmed corruption or an incompatible,
  destructive migration, after choosing and documenting the recovery point.
- Restore private files from the same recovery window as the database.

If DNS cutover itself fails, set the `ats` record back to its last known-good
web target. Never change the DNS-only mail records as part of a web code
rollback unless the mail configuration itself caused the incident.

## 16. Final launch checklist

- [ ] Node `>=20.9.0` and standalone `app.js` start successfully.
- [ ] Database and users were created in Database Wizard, not phpMyAdmin.
- [ ] `001_initial` is recorded in `schema_migrations`.
- [ ] Owner bootstrap succeeded once; bootstrap password was unset.
- [ ] No password or secret is present in Git, artifact, docs, or shell
      history.
- [ ] `ats` is proxied; SMTP/MX hostnames are DNS-only.
- [ ] SPF and DKIM placeholders are gone.
- [ ] Browser and SMTP certificates validate.
- [ ] Cloudflare uses Full (strict) and bypasses dynamic/private routes.
- [ ] Runtime database user is least-privileged.
- [ ] Review storage is outside `public_html` with accepted retention.
- [ ] OpenAI is configured and the MySQL-backed production limiter passes its
      health/screening check; Upstash is optional on cPanel.
- [ ] SMTP test reached an allowlisted address and produced an audit record.
- [ ] Reminder cron passed manually and is scheduled with `flock`.
- [ ] Health, login, workspace persistence, review, and bilingual smoke tests
      passed.
- [ ] Backups exist off-server and a restore procedure has been tested.
- [ ] Previous release SHA and rollback command are recorded.

## 17. Primary operational references

- [Next.js 16 runtime requirements](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js self-hosting guide](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [cPanel Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/)
- [cPanel Node.js application deployment and restart](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
- [LiteSpeed CloudLinux Node.js and Next.js integration](https://docs.litespeedtech.com/lsws/cp/cpanel/cloudlinux/)
- [cPanel MySQL database management](https://docs.cpanel.net/cpanel/databases/mysql-databases/)
- [cPanel Cron Jobs](https://docs.cpanel.net/cpanel/advanced/cron-jobs/)
- [cPanel Backup Wizard](https://docs.cpanel.net/cpanel/files/backup-wizard/)
- [Cloudflare proxy status and DNS-only mail records](https://developers.cloudflare.com/dns/proxy-status/)
- [Cloudflare proxy-supported network ports](https://developers.cloudflare.com/fundamentals/reference/network-ports/)
- [Cloudflare Full (strict) TLS guidance](https://developers.cloudflare.com/ssl/get-started/)
- [Cloudflare cache bypass settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)

# Application package

Replace the elapsed time, repository URL, and video URL immediately before submitting. The live product URL is final.

## Ready-to-send message

I built **Shortlist** solo in **[EXACT_ELAPSED_TIME]**.

It turns a job description and up to five PDF, DOCX, TXT, or Markdown resumes into an evidence-backed ranking. Every weighted score points back to resume evidence, parse quality remains separate from job fit, missing evidence stays missing, protected characteristics are excluded, and the final advance/hold/decline decision remains separate and human. The full interface and analytical output work in both English and Persian, including real RTL layout—not a translated landing page wrapped around an English product.

The first thing I deployed was the walking skeleton: a branded bilingual shell, `/api/health`, one fictional seeded assessment, and the production secret contract. Then I completed one upload → model → validated report path before adding batch concurrency, deterministic ranking, blind review, exports, failure handling, security controls, accessibility, tests, and visual polish.

I used **Next.js 16 + React 19 + TypeScript 6**, **OpenAI Responses API with strict Zod output**, the configurable **`gpt-5.6`** model alias, **Vercel** for the frictionless portfolio, and a **cPanel standalone Node/MySQL release** for the private recruiter product. The public reviewer still gets a complete seeded experience without an account. The authenticated `/workspace` adds position-based pipelines, opaque sessions, CSRF protection, capability-based roles, cryptographically sealed AI intake, bilingual email templates, human-confirmed SMTP, controlled automations, and append-only audit history.

- Live product: **https://shortlist-ai-proof.vercel.app**
- Source: **[GITHUB_URL]**
- 90-second demo: **[VIDEO_URL]**
- 48-hour plan: **[PLAN_URL]**

## Direct answer: “What tools do you use?”

- **Codex and LLM-assisted development** for planning, implementation, test generation, review, and fast iteration.
- **Next.js 16 App Router, React 19, and TypeScript 6** for one typed full-stack repository and one deployment.
- **OpenAI Responses API** with a strict Zod schema, `screen-v2.1.0`, `gpt-5.6` by default, and an environment override for model evaluation and pinning.
- **Zod and `pdf-lib`** for request/output contracts plus file, encryption, and page-budget validation.
- **Atomic MySQL rate windows on cPanel or Upstash Redis REST on serverless** as a fail-closed distributed spend guard, with bounded memory only for development/no-key demo behavior.
- **MySQL/MariaDB, `mysql2`, bcrypt, opaque hashed sessions, RBAC, tenant-safe composite constraints, and transactional idempotency** for the private workspace.
- **Self-hosted Manrope and Vazirmatn, Framer Motion, custom CSS, and Lucide** for a clean bilingual/RTL interface with reduced-motion support.
- **Vercel** for the public reviewer URL and **Next.js standalone + Passenger/LiteSpeed** for cPanel.
- **Vitest, TypeScript, ESLint, production builds, dependency audit, and browser QA** for evidence that the product works beyond the happy-path screenshot.
- **Nodemailer + cPanel SMTP** for allowlisted review invitations and human-approved candidate messages with outbox leases and stable message IDs.

## Direct answer: “What is the first thing you deploy?”

In hour one I deploy the smallest real vertical slice: the branded shell in English and Persian, a health endpoint proving the backend and environment contract, one fictional job, and one seeded evidence-backed assessment. That gives me a useful public URL immediately and validates the delivery path. Every later feature is an incremental production change; there is no hour-47 big-bang deploy.

## What the implementation proves

- One complete product path: choose language → define job → upload → validate → model → strict schema → normalize → rank → inspect evidence → make a human decision → export.
- One production HR path: sign in → choose a position/job ad → screen a résumé → verify its short-lived HMAC seal → persist an immutable assessment → move the candidate with optimistic concurrency → prepare/send a human-approved email → inspect the audit event.
- Production-aware limits: five files per batch, 3 MiB per raw file, 120,000 characters for text, ten PDF pages, and a 4.4 MB JSON ceiling beneath Vercel's 4.5 MB body limit.
- Defense in depth: same-origin/content-type checks, canonical Base64, extension/MIME/signature matching, malformed/encrypted PDF rejection, strict UTF-8, prompt-injection boundary, HMAC-anonymized rate keys, safe logs, request IDs, and security headers.
- Predictable operations: 8 screenings/minute and 60/day per client, a globally consistent MySQL or Upstash limiter for live production AI, a 75-second provider timeout, no implicit model retry, and a 90-second request budget.
- Honest privacy language: public screening and sealed workspace intake do not persist the résumé and set `store: false`; explicit review sharing is the separate opt-in persistence boundary. Provider retention still follows the configured OpenAI account policy.
- Accessibility and RTL as product features: semantic language/direction, localized demo and exports, keyboard focus management, inert dialog backgrounds, visible focus, 44 px touch targets, and verified responsive layouts.
- A 46-test suite covering the strict six-key rubric, scores, normalization, redaction, blind exports and spreadsheet safety, PDF/DOCX/text validation, fail-closed distributed limits, Persian text/search, and localized error contracts.

## 90-second demo script

**0–10s — Outcome**

“This is Shortlist. It turns resumes into an evidence-backed ranking, but it never makes the hiring decision.”

**10–22s — Bilingual, zero-friction first paint**

“The public link opens on fictional data—no sign-up and no candidate PII. I can switch to فارسی and the entire product, demo analysis, numbers, exports, and layout become right-to-left.” Switch to Persian, then back to English if the reviewer does not read Persian.

**22–40s — Explainability**

Open candidate one. “This 93 is not a vibe: it is six explicit weighted categories. Every category has a rationale and resume excerpt. Missing evidence earns no invented credit.”

**40–53s — Human agency and fairness**

Click **Advance**. “The model recommendation and my decision are separate. Blind review hides identity, protected attributes are excluded from the scoring policy, confidence is visible, and interview questions target the remaining uncertainty.”

**53–68s — Live full-stack path**

Open **Screen resumes**. “A reviewer can add a job and up to five PDF, DOCX, TXT, or Markdown resumes. The browser uses concurrency two; the server revalidates the body, type, signature, size, and PDF pages, enforces minute and daily limits, treats the résumé as untrusted data, and calls the Responses API with a strict bilingual schema.”

**68–82s — Recruiter workspace**

Open `/workspace`. “The private cPanel mode is position-based. A live result must match a short-lived server seal before MySQL accepts it, stage changes are versioned and audited, blind identity access is server-enforced, and email always requires a human-approved template action.”

**82–90s — Builder signal**

“I built the product, API, bilingual design, auth, database model, SMTP workflow, encrypted review storage, security controls, 49 tests, standalone deployment package, and runbook solo. The first deploy was useful; every production layer was added behind a clear boundary.”

## Recording checklist

- Use a clean browser window at 1440 × 900 and briefly demonstrate the 390 px mobile view if editing allows.
- Start with blind review enabled and show both English and Persian once.
- Configure live AI and use a fictional sample resume; never record or commit real candidate PII.
- Keep a backup take using only the deterministic seeded demo in case provider access is unavailable.
- Close notifications and hide unrelated tabs, bookmarks, account names, and developer secrets.
- Record one continuous take under 90 seconds; add captions or a transcript.
- Verify the product, source, and video links in a private/incognito session.

## Before submitting

- [ ] `https://shortlist-ai-proof.vercel.app` opens without authentication and shows the seeded evaluation.
- [ ] English/Persian switching, RTL, mobile drawer, dialogs, keyboard focus, and exports work on production.
- [ ] `OPENAI_API_KEY` is configured as a Vercel server secret; `OPENAI_MODEL` is intentionally selected.
- [ ] `/api/health` reports a durable rate limiter: MySQL on cPanel or Upstash on Vercel.
- [ ] One fictional PDF of 10 pages or fewer and 3 MiB or less completes successfully in production.
- [ ] `/api/health` reports `gpt-5.6`, `screen-v2.1.0`, the correct limits, and `aiConfigured: true`.
- [ ] On cPanel, `/workspace` login, sealed intake, stage persistence, encrypted review storage, one allowlisted SMTP test, backup, and rollback smoke checks pass.
- [ ] `npm run quality` and `npm audit --omit=dev` pass on the exact deployed commit.
- [ ] Source repository is public and README links are correct.
- [ ] Demo video is accessible without requesting permission.
- [ ] Exact elapsed build time replaces the placeholder.
- [ ] No real resume, secret, `.env.local`, provider response, or private identifier exists in Git history.

## Final honesty check

Do not claim “zero retention.” The accurate statement is: **screening does not persist the résumé; explicit review sharing and authenticated workspace records are deliberate application-owned persistence boundaries, and OpenAI processing/abuse-monitoring retention follows the deployment account's data-control policy.** This precision is a stronger senior-engineering signal than an absolute privacy claim the architecture cannot guarantee.

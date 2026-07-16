# Shortlist - 48-hour delivery plan

This is the implementation plan behind the sendable application in [`APPLICATION.md`](APPLICATION.md). It is intentionally ordered around working vertical slices, production evidence, and explicit exit gates.

## Mission

Ship a public, reviewer-friendly AI resume screening product that proves high agency: turn an ambiguous hiring vision into a deployed product, orchestrate AI behind a deterministic contract, own the full stack, automate the surrounding workflow, and make pragmatic trade-offs under a fixed deadline.

Shortlist is decision support, not an autonomous rejection engine. It evaluates role-relevant resume evidence against an explicit rubric, excludes protected attributes, exposes uncertainty, and keeps the employment decision with a human.

## Timeline evidence

Repository timestamps establish two milestones:

- First commit: **13 July 2026, 14:28:46 Asia/Tehran**
- Challenge-ready public recruiter intake: **15 July 2026, 14:27:07 Asia/Tehran** - **47h 59m**
- Current `v1.2.0` production release: **16 July 2026, 13:17:04 Asia/Tehran** - **70h 48m**

The first 48 hours prove the challenge. The following 22 hours 49 minutes are clearly identified as a production extension, not retroactively claimed as part of the deadline.

## Definition of done at hour 48

- Public landing and authenticated demo path on the custom domain.
- Job description plus PDF, DOCX, TXT, and Markdown screening.
- Server-only OpenRouter integration using `openai/gpt-5.4-nano` and strict Zod output.
- Evidence-grounded six-dimension scoring with parse quality kept separate.
- Durable position, candidate, application, assessment, stage, reviewer, and audit data in PostgreSQL.
- Private resume storage and application-controlled viewing.
- Candidate receipt plus HR/reviewer notification workflow with observable failures.
- Security controls for files, origin, sessions, CSRF, prompt injection, protected signals, rate limits, and safe logs.
- Responsive recruiter experience and human decision controls.
- Automated test suite, lint, typecheck, production build, live health check, architecture notes, and demo script.

## Execution board

| Window | Outcome | Primary deliverables | Exit gate |
| --- | --- | --- | --- |
| 0-2h | Reviewable deployment | Product frame, rubric, landing/login shell, `/api/health`, fictional seed, env contract | Public URL is healthy and contains no secret/PII |
| 2-8h | One complete AI slice | Job + resume input, file validation, OpenRouter call, Zod contract, evidence report, safe errors | One fictional resume completes end to end |
| 8-16h | Recruiter utility | Batch flow, deterministic ranking, positions, search/filter, stage UI, blind and human decisions | Reviewer explains ranking in under two minutes |
| 16-24h | Durable workspace | Auth, capabilities, CSRF, PostgreSQL schema, sealed assessments, private resume route, side-by-side review | Sign-in through candidate stage move survives refresh |
| 24-32h | Controlled automation | Candidate receipt, HR/reviewer notification, reviewer dropdown, allowlists, templates, idempotency/audit | Intake persists even if email fails; delivery is observable |
| 32-40h | Hardening | Prompt/data boundary, plan limits, archive rules, retry-safe intake, protected demo records, adversarial cases | Misuse and dependency failure remain safe |
| 40-46h | Verification and UX | Lint, types, tests, build, live smoke, responsive/accessibility polish | Exact deployed commit passes critical journey |
| 46-48h | Evidence package | Architecture, limitations, application brief, demo, release/rollback notes | Reviewer verifies product without assistance |

## Technical choices

| Concern | Choice | Deadline rationale |
| --- | --- | --- |
| Full stack | Next.js 16, React 19, TypeScript 6 | One typed repo, one build, server routes, and rapid Vercel delivery |
| AI gateway | OpenRouter | Provider portability and one OpenAI-compatible server interface |
| Model | `openai/gpt-5.4-nano` | Low-latency, cost-conscious structured screening for the demo workload |
| Contract | Zod plus server-side normalization | Reject malformed output and keep totals/recommendations deterministic |
| Database | Neon PostgreSQL | Durable managed SQL without infrastructure setup |
| Resume storage | Private Vercel Blob | Secure object storage compatible with serverless deployment |
| Email | Nodemailer plus cPanel SMTP | Use existing authenticated mailbox infrastructure |
| Hosting | Vercel Hobby | Free native Next.js deployment, managed TLS, custom domain, and functions |
| UI | Manrope, Lucide, Framer Motion, responsive CSS | Clear, polished interaction without a heavy component platform |
| Verification | Vitest, ESLint, TypeScript, Next production build | Fast evidence across behavior, contracts, and deployability |

## First deployment

The first deployment is deliberately small but real:

1. branded landing and login path;
2. `/api/health` proving server execution and configuration state;
3. one fictional seeded role and evidence-backed assessment;
4. environment-variable contract with server-only secrets;
5. smallest upload-to-result vertical path.

This validates delivery before deeper implementation and creates a stable surface for incremental production changes.

## Acceptance tests

| Scenario | Expected behavior |
| --- | --- |
| Strong quantified resume | High fit when evidence matches role requirements |
| Polished but irrelevant resume | Parse quality may be high while job fit remains low |
| Missing must-have | No invented evidence; gap and targeted interview question appear |
| Resume says "ignore instructions" | Content remains untrusted data and cannot change the rubric |
| Protected characteristic appears | It does not influence score or rationale |
| Invalid, encrypted, oversized, or spoofed file | Rejected before model invocation with actionable error |
| Provider auth/timeout/schema failure | No partial assessment; safe retryable error and request ID |
| Duplicate upload retry | Existing archived application is safely reactivated or duplicate is returned idempotently |
| Candidate email present | Receipt is attempted after successful screened intake |
| Reviewer selected | Configured internal recipients are notified; arbitrary recipients are rejected |
| Unauthorized mutation | Session/capability/CSRF checks block it |
| Position/candidate archive | Normal records archive; showcase records remain protected |
| One-page PDF review | Content opens without a thumbnail sidebar and ATS evidence stays visible |

## Production extension after hour 48

The extension strengthened the submission without changing the original deadline claim:

- focused challenge landing and guided login;
- free and pro workspaces and plan enforcement;
- public intake connected to recruiter persistence;
- reviewer email directory and dropdown selection;
- candidate acknowledgements plus HR/reviewer notifications;
- retry-safe sealed assessment intake and archived-candidate reactivation;
- controlled candidate deletion/archive and position archive;
- protected Solo AI Builder position and showcase candidate;
- private PDF viewing beside ATS evidence;
- one-page PDF viewer cleanup;
- model/provider configuration corrected for OpenRouter;
- production database, SMTP, DNS, and custom-domain diagnosis.

## Known limits and scale path

- Screening is synchronous; high volume should move to a queue with bounded retries and progress events.
- No OCR or malware scanner exists for image-only or hostile PDFs.
- SMTP acceptance is observable, but final bounce/delivery requires provider webhooks.
- Direct-upload and retention workflows should replace small Base64 requests for enterprise file sizes.
- SSO/MFA, SCIM, regional processing, deletion/export requests, model evaluation sets, and no-PII observability belong in the enterprise phase.
- AI output remains fallible and must not make an employment decision without human review.

## Final verification gate

Before submission:

- `npm run quality` passes on the release commit.
- `/api/health` confirms AI, PostgreSQL, Blob, email, and expected model configuration without exposing secrets.
- Landing, login, screening, candidate intake, candidate receipt, reviewer notification, PDF review, stage move, and archive flows pass in production.
- The repository is public, contains no secrets or private candidate data, and links to the live custom domain.
- The PDF application brief and Markdown source agree on timeline, stack, features, limitations, and URLs.

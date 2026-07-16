# Mehdi Sharifi - Solo AI Builder application

## 48-hour product proof

**Shortlist** is a production-minded, AI-assisted applicant tracking system that I designed, built, tested, and deployed solo.

- **Live product:** https://ats.mehdisharifi.com
- **Source code:** https://github.com/VibeATSCoder/ShortList
- **Challenge-ready core:** 47 hours 59 minutes, measured from the first repository commit to public recruiter intake
- **Production extension:** 70 hours 48 minutes total through the database-backed Free/Pro demo release, including authentication, durable data, email automation, private resume review, and operational hardening
- **Quality evidence:** 60 automated tests across 13 suites, plus lint, TypeScript, production-build, GitHub Actions, and live health checks

## Live reviewer access

Open **https://ats.mehdisharifi.com/login** and use either real database-backed demo account:

| Plan | Username | Password |
| --- | --- | --- |
| Free | `free@ats.mehdisharifi.com` | `TryShortlistFree2026!` |
| Pro | `pro@ats.mehdisharifi.com` | `TryShortlistPro2026!` |

The Free account demonstrates genuine plan limits and includes the same protected showcase position and CV. The Pro account includes its stored position, candidate, templates, team workflow, automations, and production outbound-email path. These accounts are shared publicly, so use fictional data and only recipient addresses you control.

## What I shipped

Shortlist turns a job description and a PDF, DOCX, TXT, or Markdown resume into a structured assessment. The result separates parse quality from job fit, scores six explicit dimensions, grounds conclusions in resume evidence, shows gaps and interview questions, and keeps the final hiring decision with a human.

The public landing page explains the workflow and sends evaluators into a real authenticated recruiter workspace. Recruiters can create positions, screen and import candidates, compare evidence, move candidates through stages, view the original PDF beside the ATS analysis, manage reviewers, and archive candidates or positions. The challenge position and showcase resume are protected so the evaluation path cannot be accidentally removed.

I also built the operational path around the model: candidate receipt confirmations, HR and reviewer notifications, controlled templates, recipient allowlists, private resume storage, signed access, sealed assessments, role capabilities, CSRF protection, idempotent writes, audit events, database migrations, rate limits, and health diagnostics.

## What I personally owned

Product framing, UX and visual system, frontend, server routes, AI prompt and schema, file validation, scoring normalization, authentication, PostgreSQL data model, email workflows, object storage, security controls, tests, debugging, DNS integration, and Vercel deployment.

## Stack and why

| Layer | Choice | Reason |
| --- | --- | --- |
| Product | Next.js 16, React 19, TypeScript 6 | One typed full-stack codebase and a fast deployment loop |
| AI | OpenRouter, `openai/gpt-5.4-nano`, strict Zod contracts | Low-latency structured screening with provider flexibility |
| Data | Neon PostgreSQL | Managed, durable SQL suitable for Vercel serverless functions |
| Files | Private Vercel Blob | Protected resume persistence without building file infrastructure |
| Email | Nodemailer and authenticated cPanel SMTP | Candidate acknowledgements plus recruiter/reviewer notifications |
| UI | Manrope, Lucide, Framer Motion, custom responsive CSS | Clear recruiter UX with deliberate, reduced-motion-safe feedback |
| Quality | Vitest, ESLint, TypeScript, production builds | Fast regression feedback and deployable evidence |
| Delivery | Vercel Hobby and custom Cloudflare-managed domain | Free, repeatable deployment with serverless APIs and managed TLS |
| AI-assisted development | Codex, Cursor-style agentic iteration, LLM review | Faster implementation, test generation, diagnosis, and documentation while I retain engineering judgment |

## Direct answer: what is the first thing I deploy?

In the first two hours, I deploy a walking skeleton: the branded landing and login path, `/api/health`, one fictional seeded assessment, the production environment contract, and the smallest upload-to-result path. This immediately proves routing, builds, secrets, server execution, and the reviewer journey. Every later capability ships as a small production increment; there is no hour-47 big-bang release.

## Exact 48-hour execution plan

### Hours 0-2 - Frame, de-risk, deploy

- Translate the vision into one reviewer journey and measurable exit gates.
- Define the six-dimension, 100-point rubric; evidence policy; protected-attribute boundary; privacy statement; and file budgets.
- Create the typed application shell, health endpoint, seeded fictional assessment, environment contract, and first Vercel deployment.

**Exit gate:** a public URL works on desktop and mobile and exposes no secret or real candidate data.

### Hours 2-8 - Complete one vertical slice

- Add one job description and one resume upload.
- Validate extension, MIME, signature, encoding, decoded size, PDF structure, encryption, and page count.
- Call OpenRouter only from the server and require a strict Zod assessment contract.
- Render score, confidence, evidence, gaps, must-haves, risks, and interview questions.
- Return stable errors for invalid files, provider authentication, timeout, refusal, and malformed output.

**Exit gate:** one fictional resume travels from upload to a validated, evidence-backed report without manual repair.

### Hours 8-16 - Make it useful to recruiters

- Add multi-resume screening with bounded concurrency and isolated per-file failure.
- Recompute totals on the server, rank deterministically, and separate parse quality from role fit.
- Build position selection, candidate comparison, search, filters, stage controls, responsive details, and empty/loading/error states.
- Add blind-review behavior and keep AI recommendation separate from the human decision.

**Exit gate:** a reviewer can explain the ranking and complete the core flow in under two minutes.

### Hours 16-24 - Add the durable workspace

- Add authenticated sessions, organization membership, role capabilities, CSRF protection, and same-origin mutation checks.
- Model positions, stages, candidates, applications, immutable assessment snapshots, transitions, reviewers, templates, and audit events in PostgreSQL.
- Seal assessments against the canonical job description before persistence.
- Store private resumes through application-controlled routes and show the PDF beside its ATS evidence.

**Exit gate:** a recruiter can sign in, screen, import, inspect, and move a candidate without losing data.

### Hours 24-32 - Automate communication safely

- Send a receipt confirmation when a candidate provides an email address.
- Notify configured HR recipients and selected reviewers after a successful screened intake.
- Add reviewer-directory dropdowns, exact recipient allowlists, safe templates, idempotency keys, outbox leases, and audit records.
- Make email failure visible without rolling back an otherwise successful candidate intake.

**Exit gate:** a successful upload reaches the panel and produces observable, controlled notifications.

### Hours 32-40 - Harden the product

- Add prompt-injection boundaries, protected-attribute exclusions, deterministic score caps, rate limits, safe logs, request IDs, no-store responses, and security headers.
- Add free/pro plan rules, position and candidate archive controls, retry-safe imports, and protected showcase records.
- Test adversarial files, duplicate submissions, provider failures, unauthorized access, and responsive layouts.

**Exit gate:** common misuse and dependency failure produce safe, actionable behavior.

### Hours 40-46 - Verify and polish

- Run lint, TypeScript, all automated tests, and the production build.
- Exercise the live health endpoint and the full login, screening, intake, email, PDF-review, stage-move, and archive journeys.
- Refine hierarchy, copy, accessibility, loading feedback, and mobile behavior.

**Exit gate:** the deployed commit matches the tested commit and the critical journey passes in production.

### Hours 46-48 - Package the evidence

- Write the architecture, trade-offs, operational limits, and known limitations.
- Record a concise demo and verify every link in an incognito browser.
- Prepare this application brief, repository release, and rollback notes.

**Exit gate:** a reviewer can understand the product, inspect the code, and verify the live result without assistance.

## Deliberate trade-offs

- I used a deterministic structured model call instead of a multi-agent framework because resume scoring needs predictable contracts, latency, and auditability more than autonomous planning.
- I chose managed PostgreSQL and object storage because the challenge rewards a working product, not custom infrastructure.
- Destructive actions archive records and retain audit history; protected showcase records keep the evaluation stable.
- Email automation acknowledges and notifies, but it does not autonomously reject candidates or make employment decisions.
- The system is decision support. LLM output can be wrong, so evidence, confidence, limitations, and human approval remain visible.

## 90-second reviewer path

1. Open the landing page and understand the product in ten seconds.
2. Sign into the demo workspace and open the protected Solo AI Builder position.
3. Inspect the showcase resume and ATS evidence side by side.
4. Upload a fictional resume, optionally provide a candidate email, and watch it enter the pipeline.
5. Show the candidate receipt, HR/reviewer notification controls, stage movement, and audit trail.
6. Finish on the repository: current architecture, 60 tests, meaningful pull-request history, and this exact 48-hour plan.

## Submission message

I built **Shortlist** solo. The challenge-ready product reached public recruiter intake in **47 hours 59 minutes**; I then extended it to the current `v1.2.0` production release in **70 hours 48 minutes**. It is a live AI-powered ATS with evidence-grounded screening, authenticated Free/Pro workspaces, a position pipeline, private resume review, candidate and reviewer email automation, controlled access, durable PostgreSQL data, and a human-in-the-loop hiring workflow. The first thing I deployed was a walking skeleton - landing/login, health check, seeded assessment, environment contract, and the smallest upload-to-result path - then I shipped one verified vertical slice at a time. The stack is Next.js 16, React 19, TypeScript 6, OpenRouter with `openai/gpt-5.4-nano`, Zod, Neon PostgreSQL, private Vercel Blob, cPanel SMTP, and Vercel Hobby. Live: **https://ats.mehdisharifi.com** - Login: **https://ats.mehdisharifi.com/login** - Source: **https://github.com/VibeATSCoder/ShortList**

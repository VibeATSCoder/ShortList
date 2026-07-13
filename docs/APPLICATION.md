# Application package

Replace the bracketed links and elapsed time after the final production deploy.

## Ready-to-send message

I built **Shortlist** solo in **[exact elapsed time]**.

It turns a job description and a batch of PDF/text resumes into an evidence-backed ranking. Every weighted score points back to the resume, missing evidence stays missing, protected characteristics are ignored, and the final advance/hold/decline decision remains separate and human.

The first thing I deployed was the walking skeleton: a branded shell, `/api/health`, one seeded assessment, and the production secret contract. Then I completed one upload → model → validated report path before adding batch concurrency, ranking, blind review, exports, failure handling, tests, and visual polish.

I used **Next.js + TypeScript**, **OpenAI Responses API with strict structured output**, **Zod**, and a **Vercel-compatible deployment**. I deliberately did not put Supabase in the critical path: the public reviewer should hit no login wall, and the challenge build should not retain candidate PII before persistence creates real value. The production extension and RLS boundary are documented in the repo.

- Live product: **https://shortlist-ai-proof.vercel.app**
- Source: **[GITHUB_URL]**
- 90-second demo: **[VIDEO_URL]**
- 48-hour execution plan: **[PLAN_URL]**

## Direct answer to “What tools do you use?”

- **Codex and LLM-assisted development** for planning, implementation, review, and fast iteration.
- **Next.js App Router + TypeScript** for one full-stack repository and one deployment.
- **OpenAI Responses API** with a strict Zod schema for predictable candidate assessments.
- **Vercel-compatible hosting** for fast incremental deploys and server-side secrets.
- **Custom CSS** for a distinctive, responsive product without component-library overhead.
- **Vitest, TypeScript, ESLint, production build, dependency audit, and browser QA** for verification.
- **Supabase after validation**, when durable multi-user persistence, RLS, and retention controls are genuinely needed.

## Direct answer to “What is the first thing you deploy?”

In hour one I deploy the smallest real vertical slice: the branded dashboard, a health endpoint that proves the backend and secret contract, one fictional job, and one seeded evidence-backed assessment. That gives me a real production URL and validates the delivery path immediately. Every later feature becomes an incremental production change; there is no risky hour-47 big-bang deploy.

## 90-second demo script

**0–10s — Outcome**

“This is Shortlist. It turns resumes into an evidence-backed ranking, but it never makes the hiring decision.”

**10–24s — Zero-friction reviewer experience**

“The link opens on a fictional seeded evaluation—no sign-up and no real PII. Blind review is on by default, and the top candidate is immediately visible.”

**24–45s — Explainability**

Open candidate one. “This 93 is not a vibe: it is six explicit weighted categories. Each category has a rationale and a resume excerpt. Missing evidence receives zero rather than an invented assumption.”

**45–58s — Human agency and fairness**

Click **Advance**. “The model recommendation and my decision are separate. Protected attributes are excluded, confidence is visible, and the interview questions target the remaining uncertainty.”

**58–72s — Live full-stack path**

Open **Screen resumes**. “A reviewer can add a job and up to five PDF or text resumes. The browser uses concurrency two; the server revalidates size and type, applies a prompt-injection boundary, calls the Responses API, validates strict output, caps each dimension, and recomputes the total.”

**72–84s — Reliability and privacy**

“There is no server-side resume persistence. The model, prompt version, token use, latency, and request ID stay attached to the assessment. CSV export respects blind mode, and JSON provides an audit artifact.”

**84–90s — Builder signal**

“I built the product, API, guardrails, 15 tests, responsive UI, docs, and deployment solo. The repo includes the complete 48-hour plan and the Supabase production extension.”

## Recording checklist

- Use a clean browser window and 1440 × 900 viewport.
- Keep blind review on at the start.
- Preconfigure live AI and use a fictional sample resume; never record real candidate PII.
- Close notifications and hide unrelated tabs/bookmarks.
- Record one continuous take under 90 seconds.
- Verify the video is accessible without requesting permission.
- Add captions or a transcript.

## Before submitting

- [ ] Public live URL opens without authentication.
- [ ] Live AI key and model environment are configured.
- [ ] One fictional PDF completes successfully in production.
- [ ] Source repository is public and the README hero links are correct.
- [ ] CI is green on the exact deployed commit.
- [ ] Demo video works in a private/incognito window.
- [ ] Exact elapsed build time replaces the placeholder.
- [ ] No real resume, secret, `.env.local`, or private identifier exists in Git history.

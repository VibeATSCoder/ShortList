# Shortlist v1.0.0

## Outcome

The first production portfolio release delivers an end-to-end AI resume screening and recruiter workflow at https://ats.mehdisharifi.com.

## Highlights

- Evidence-grounded screening through OpenRouter using `openai/gpt-5.4-nano`.
- Strict Zod output, deterministic scoring, parse diagnostics, must-have checks, gaps, and interview questions.
- Authenticated position pipelines backed by Neon PostgreSQL.
- Private resume storage and side-by-side PDF plus ATS review.
- Candidate receipt and HR/reviewer email notifications through authenticated SMTP.
- Reviewer directory, controlled recipients, templates, audit events, and retry-safe candidate intake.
- Free/pro plan rules, role capabilities, protected showcase records, and controlled archive actions.
- Responsive landing, guided demo login, recruiter workspace, and 58 automated tests.

## Deployment

- Runtime: Vercel Hobby
- Domain: `ats.mehdisharifi.com`
- Database: Neon PostgreSQL
- Object storage: private Vercel Blob
- Email: authenticated cPanel SMTP
- DNS/TLS: Cloudflare-managed DNS and Vercel-managed web certificate

## Known limitations

- No OCR or malware scanning for image-only or hostile PDFs.
- Screening is synchronous and should move to a queue for sustained volume.
- SMTP acceptance does not prove final delivery without bounce/delivery webhooks.
- AI output can be wrong and must remain human-reviewed decision support.

## Verification

Release candidates must pass `npm run quality` and the live landing, login, screening, intake, email, PDF review, stage-move, and archive smoke paths before tagging.

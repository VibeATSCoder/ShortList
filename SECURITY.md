# Security policy

## Reporting a vulnerability

Do not open a public issue for a vulnerability that could expose credentials, resumes, candidate identity, signed review links, recruiter sessions, or hiring records. Contact the repository owner privately through the GitHub profile and include only the minimum reproduction detail needed to triage the problem.

Do not include real candidate data in the report. Use a fictional resume and redact tokens, URLs, message IDs, database identifiers, and SMTP responses.

## Supported version

The latest commit on `main` is the supported production version. Security fixes are released forward; older portfolio commits are not maintained deployments.

## Security boundaries

- Provider, database, storage, SMTP, session, seal, and review-link credentials must remain server-only.
- Uploaded resumes are untrusted input and may contain prompt injection or hostile file structures.
- Model output is untrusted until schema validation and deterministic server normalization succeed.
- A sealed assessment must match the canonical job description before persistence.
- Role capabilities, organization boundaries, same-origin checks, and CSRF are enforced on the server.
- Candidate email and reviewer notification are communications, not autonomous hiring decisions.
- Logs and audit events must not include resume text, raw credentials, session tokens, full email bodies, or signed private URLs.

## Credential exposure

If a key is pasted into chat, committed, logged, or shown in a screenshot, treat it as compromised: revoke it, create a least-privilege replacement, update the deployment secret, redeploy, and verify that no history or artifact retains the old value.

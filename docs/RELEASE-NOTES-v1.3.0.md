# Shortlist v1.3.0

## Outcome

- Pro demo outbound email uses the configured production delivery path.
- Free contains the same protected Solo AI Builder position, Mehdi Sharifi CV, private PDF, and 81/100 assessment as Pro.
- Both showcase positions and both candidate applications are protected from archive/removal.

## Data and security

The Free showcase uses tenant-local candidate, application, assessment, resume-asset, and audit IDs. Its private PDF is copied into the Free organization Blob namespace rather than referencing the Pro tenant's object.

Free retains genuine Free-plan limits. Pro retains reviewers, templates, automations, team access, audit, and outbound email. Shared-account users are instructed to use fictional data and recipient addresses they control.

## Verification

- 61 automated tests across 13 suites.
- Lint, TypeScript, and production build pass.
- Free private resume route returns the 296,447-byte PDF.
- Mirrored assessment score is 81/100.
- GitHub quality and verification workflows pass.

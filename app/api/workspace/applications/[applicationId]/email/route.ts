import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requestSession, validCsrf } from "@/lib/auth";
import { markEmailFailed, markEmailSent, prepareCandidateEmail } from "@/lib/email-outbox";
import { emailDeliveryConfigured, sendTransactionalEmail } from "@/lib/review-email";
import { isSameOrigin } from "@/lib/request-security";

export const dynamic = "force-dynamic";

const emailSchema = z.object({
  templateVersionId: z.string().uuid(),
  variables: z.record(z.string().regex(/^[a-z_]+$/), z.string().trim().max(500)).default({}),
  approved: z.literal(true),
  idempotencyKey: z.string().trim().min(16).max(180),
});

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, context: { params: Promise<{ applicationId: string }> }) {
  if (!isSameOrigin(request) || !(await validCsrf(request))) return apiError(403, "INVALID_CSRF", "Refresh and try again.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Email requests must use application/json.");
  }
  const session = await requestSession(request);
  if (!session) return apiError(401, "UNAUTHENTICATED", "Sign in to continue.");
  if (!emailDeliveryConfigured()) return apiError(503, "SMTP_NOT_CONFIGURED", "Configure the cPanel SMTP password and DNS first.");
  const { applicationId } = await context.params;
  if (!z.string().uuid().safeParse(applicationId).success) return apiError(404, "APPLICATION_NOT_FOUND", "Application not found.");
  const parsed = emailSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_EMAIL_REQUEST", parsed.error.issues[0]?.message ?? "Check the email request.");

  let prepared;
  let acceptedBySmtp = false;
  try {
    prepared = await prepareCandidateEmail(session, { applicationId, templateVersionId: parsed.data.templateVersionId, variables: parsed.data.variables, idempotencyKey: parsed.data.idempotencyKey });
    if (prepared.alreadySent) return NextResponse.json({ ok: true, status: "sent", outboxId: prepared.outboxId, duplicate: true }, { headers: { "Cache-Control": "no-store" } });
    if (prepared.inProgress) {
      return NextResponse.json(
        { ok: true, status: "sending", outboxId: prepared.outboxId, duplicate: true },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }
    const result = await sendTransactionalEmail({ to: prepared.to, subject: prepared.subject, text: prepared.text, html: prepared.html, messageId: `<${prepared.outboxId}@ats.mehdisharifi.com>` });
    acceptedBySmtp = true;
    await markEmailSent(session, prepared, result.messageId);
    return NextResponse.json({ ok: true, status: "sent", outboxId: prepared.outboxId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (prepared && !acceptedBySmtp) {
      await markEmailFailed(prepared, session.organizationId, error instanceof Error ? error.message : "SMTP_ERROR").catch(() => undefined);
    }
    const code = error instanceof Error ? error.message : "EMAIL_SEND_FAILED";
    if (acceptedBySmtp && prepared) {
      console.error("candidate_email_state_pending", { code, applicationId, outboxId: prepared.outboxId });
      return NextResponse.json(
        { ok: true, status: "accepted_pending", outboxId: prepared.outboxId },
        { status: 202, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (["IDEMPOTENCY_KEY_REUSED", "EMAIL_NOT_SENDABLE", "EMAIL_ATTEMPTS_EXHAUSTED", "EMAIL_APPROVAL_REQUIRED"].includes(code)) {
      return apiError(409, code, "This email command cannot be safely repeated.");
    }
    if (["EMAIL_CONTEXT_NOT_FOUND", "CANDIDATE_EMAIL_MISSING", "TEMPLATE_VARIABLE_NOT_ALLOWED", "TEMPLATE_VARIABLE_MISSING", "TEMPLATE_VARIABLE_POLICY_INVALID", "TEMPLATE_URL_INVALID", "EMAIL_SUBJECT_INVALID"].includes(code)) return apiError(400, code, "The candidate email or template is incomplete.");
    console.error("candidate_email_failed", { code, applicationId });
    return apiError(502, "EMAIL_SEND_FAILED", "cPanel SMTP did not accept the message. The outbox recorded the failure for review.");
  }
}

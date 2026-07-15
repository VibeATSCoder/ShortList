import "server-only";

import { sendTransactionalEmail } from "@/lib/review-email";

interface ResumeAttachment {
  fileName: string;
  bytes: Uint8Array;
  contentType: string;
}

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendApplicationNotifications(input: {
  candidateEmail?: string;
  candidateName: string;
  internalRecipients: string[];
  panelUrl: string;
  positionTitle: string;
  recommendation: string;
  resume?: ResumeAttachment | null;
  score: number;
}): Promise<{ candidateAcknowledged: boolean; internalSent: number; internalFailed: number }> {
  const internalRecipients = [...new Set(input.internalRecipients.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  const attachment = input.resume
    ? [{ filename: input.resume.fileName, content: Buffer.from(input.resume.bytes), contentType: input.resume.contentType }]
    : undefined;
  const internalSubject = `New screened application · ${input.candidateName} · ${input.positionTitle}`;
  const internalText = `${input.candidateName} submitted a resume and was added to ${input.positionTitle}.\n\nFit score: ${input.score}/100\nRecommendation: ${input.recommendation}\n\nOpen recruiter workspace: ${input.panelUrl}`;
  const internalHtml = `<h1 style="font-size:22px;margin:0 0 12px">New screened application</h1><p><strong>${html(input.candidateName)}</strong> was screened and added to <strong>${html(input.positionTitle)}</strong>.</p><div style="background:#f3f7f3;border-radius:12px;margin:18px 0;padding:14px"><strong>${input.score}/100</strong> fit score · ${html(input.recommendation.replaceAll("_", " "))}</div><a href="${html(input.panelUrl)}" style="background:#173c2d;border-radius:10px;color:#fff;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">Open recruiter workspace</a>`;

  const internalDeliveries = await Promise.allSettled(
    internalRecipients.map((to) => sendTransactionalEmail({
      to,
      subject: internalSubject,
      text: internalText,
      html: internalHtml,
      attachments: attachment,
    })),
  );

  let candidateAcknowledged = false;
  const candidateEmail = input.candidateEmail?.trim().toLowerCase();
  if (candidateEmail) {
    try {
      await sendTransactionalEmail({
        to: candidateEmail,
        subject: `We received your application · ${input.positionTitle}`,
        text: `Hi ${input.candidateName},\n\nWe received your application for ${input.positionTitle}. Our hiring team will review your experience and contact you if a next step is available.\n\nThis confirmation is not a hiring decision.\n\nShortlist recruiting team`,
        html: `<h1 style="font-size:22px;margin:0 0 12px">Application received</h1><p>Hi ${html(input.candidateName)},</p><p>We received your application for <strong>${html(input.positionTitle)}</strong>. Our hiring team will review your experience and contact you if a next step is available.</p><div style="background:#f3f7f3;border-radius:12px;margin:18px 0;padding:14px">This confirmation is not a hiring decision.</div><p>Shortlist recruiting team</p>`,
      });
      candidateAcknowledged = true;
    } catch (error) {
      console.warn("candidate_acknowledgement_failed", error instanceof Error ? error.name : "UnknownError");
    }
  }

  return {
    candidateAcknowledged,
    internalSent: internalDeliveries.filter((delivery) => delivery.status === "fulfilled").length,
    internalFailed: internalDeliveries.filter((delivery) => delivery.status === "rejected").length,
  };
}

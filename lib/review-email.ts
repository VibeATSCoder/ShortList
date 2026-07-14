import nodemailer from "nodemailer";

import type { ReviewFeedback, ReviewPack } from "@/lib/reviews";

export interface EmailDeliveryResult {
  configured: boolean;
  sent: number;
}

function html(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function smtpConfiguration() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;
  if (!host || !user || !pass || !from) return null;

  const port = Number(process.env.SMTP_PORT ?? 465);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return null;

  return {
    host,
    port,
    secure: (process.env.SMTP_SECURE ?? "true").toLowerCase() !== "false",
    auth: { user, pass },
    from,
  };
}

export function emailDeliveryConfigured(): boolean {
  return smtpConfiguration() !== null;
}

function layout(content: string, locale: ReviewPack["locale"]): string {
  const direction = locale === "fa" ? "rtl" : "ltr";
  return `<!doctype html><html dir="${direction}" lang="${locale}"><body style="margin:0;background:#f5f7f2;font-family:Arial,sans-serif;color:#17221d"><div style="max-width:620px;margin:0 auto;padding:32px 16px"><div style="background:#fff;border:1px solid #dfe7df;border-radius:18px;overflow:hidden"><div style="padding:20px 24px;background:#dff7e8"><strong style="font-size:20px">Shortlist</strong><span style="margin-inline-start:8px;color:#50705f">Evidence, not vibes.</span></div><div style="padding:28px 24px">${content}</div></div><p style="font-size:12px;color:#6c7a72;text-align:center;margin:16px 0">Human-reviewed hiring support · This email does not make an employment decision.</p></div></body></html>`;
}

function transport() {
  const config = smtpConfiguration();
  if (!config) return null;
  return {
    sender: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    }),
    from: config.from,
  };
}

export async function sendReviewInvitations(
  pack: ReviewPack,
  reviewUrl: string,
): Promise<EmailDeliveryResult> {
  const mail = transport();
  if (!mail || !pack.recipients.length) return { configured: Boolean(mail), sent: 0 };

  const fa = pack.locale === "fa";
  const candidateName = pack.blindMode ? (fa ? "داوطلب ناشناس" : "Anonymous candidate") : pack.candidate.profile.displayName;
  const subject = fa
    ? `درخواست بررسی: ${candidateName}`
    : `Review requested: ${candidateName}`;
  const content = fa
    ? `<p style="margin-top:0">${html(pack.requesterName)} از شما خواسته است ارزیابی این داوطلب را بررسی کنید.</p><h1 style="font-size:24px;margin:18px 0 8px">${html(candidateName)}</h1><p style="color:#536158">${html(pack.job.title)} · امتیاز تناسب ${pack.candidate.score}/100</p>${pack.note ? `<div style="padding:14px;background:#f5f7f2;border-radius:12px;margin:18px 0">${html(pack.note)}</div>` : ""}<a href="${html(reviewUrl)}" style="display:inline-block;background:#17221d;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">مشاهده ارزیابی و ثبت نظر</a><p style="font-size:12px;color:#6c7a72;margin-top:20px">این پیوند در ${new Date(pack.expiresAt).toLocaleString("fa-IR")} منقضی می‌شود.</p>`
    : `<p style="margin-top:0">${html(pack.requesterName)} asked you to review this candidate assessment.</p><h1 style="font-size:24px;margin:18px 0 8px">${html(candidateName)}</h1><p style="color:#536158">${html(pack.job.title)} · ${pack.candidate.score}/100 fit score</p>${pack.note ? `<div style="padding:14px;background:#f5f7f2;border-radius:12px;margin:18px 0">${html(pack.note)}</div>` : ""}<a href="${html(reviewUrl)}" style="display:inline-block;background:#17221d;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">Review assessment</a><p style="font-size:12px;color:#6c7a72;margin-top:20px">This private link expires ${new Date(pack.expiresAt).toLocaleString("en-US")}.</p>`;

  let sent = 0;
  for (const recipient of pack.recipients) {
    await mail.sender.sendMail({
      from: mail.from,
      to: recipient,
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
      subject,
      html: layout(content, pack.locale),
      text: `${subject}\n\n${pack.note}\n\n${reviewUrl}`,
    });
    sent += 1;
  }
  return { configured: true, sent };
}

export async function sendFeedbackNotification(
  pack: ReviewPack,
  feedback: ReviewFeedback,
  reviewUrl: string,
): Promise<EmailDeliveryResult> {
  const mail = transport();
  const notificationEmail = process.env.HR_NOTIFICATION_EMAIL?.trim();
  if (!mail || !notificationEmail) return { configured: Boolean(mail), sent: 0 };

  const decision = {
    advance: pack.locale === "fa" ? "دعوت به مرحله بعد" : "Advance",
    hold: pack.locale === "fa" ? "در انتظار" : "Hold",
    decline: pack.locale === "fa" ? "رد" : "Decline",
  }[feedback.decision];
  const subject = `Shortlist review · ${feedback.reviewerName} · ${decision}`;
  const content = `<p style="margin-top:0"><strong>${html(feedback.reviewerName)}</strong> submitted team feedback.</p><h1 style="font-size:24px;margin:18px 0 8px">${html(decision)}</h1><div style="padding:14px;background:#f5f7f2;border-radius:12px;margin:18px 0">${html(feedback.comment)}</div><a href="${html(reviewUrl)}" style="display:inline-block;background:#17221d;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">Open review</a>`;
  await mail.sender.sendMail({
    from: mail.from,
    to: notificationEmail,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
    subject,
    html: layout(content, pack.locale),
    text: `${subject}\n\n${feedback.comment}\n\n${reviewUrl}`,
  });
  return { configured: true, sent: 1 };
}

export async function sendReviewReminder(
  pack: ReviewPack,
  reviewUrl: string,
): Promise<EmailDeliveryResult> {
  const mail = transport();
  if (!mail || !pack.recipients.length) return { configured: Boolean(mail), sent: 0 };
  const subject = pack.locale === "fa" ? "یادآوری بررسی داوطلب" : "Candidate review reminder";
  const content = pack.locale === "fa"
    ? `<p>بازخورد این داوطلب هنوز ثبت نشده است.</p><a href="${html(reviewUrl)}" style="display:inline-block;background:#17221d;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">تکمیل بررسی</a>`
    : `<p>This candidate review is still waiting for feedback.</p><a href="${html(reviewUrl)}" style="display:inline-block;background:#17221d;color:#fff;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">Complete review</a>`;
  let sent = 0;
  for (const recipient of pack.recipients) {
    await mail.sender.sendMail({
      from: mail.from,
      to: recipient,
      subject,
      html: layout(content, pack.locale),
      text: `${subject}\n\n${reviewUrl}`,
    });
    sent += 1;
  }
  return { configured: true, sent };
}

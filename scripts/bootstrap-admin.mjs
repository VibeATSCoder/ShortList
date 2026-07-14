import { randomUUID } from "node:crypto";

import { hash } from "bcryptjs";
import mysql from "mysql2/promise";

const required = [
  "DB_HOST",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "BOOTSTRAP_ADMIN_EMAIL",
  "BOOTSTRAP_ADMIN_PASSWORD",
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(", ")}`);
}
if (process.env.BOOTSTRAP_ADMIN_PASSWORD.length < 14) {
  throw new Error("BOOTSTRAP_ADMIN_PASSWORD must contain at least 14 characters.");
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: "utf8mb4",
  timezone: "Z",
  ...(process.env.DB_SSL === "true"
    ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } }
    : {}),
});

const organizationId = randomUUID();
const userId = randomUUID();
const positionId = randomUUID();
const email = process.env.BOOTSTRAP_ADMIN_EMAIL.trim().toLowerCase();
const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim() || "Workspace Owner";
const organizationName = process.env.BOOTSTRAP_ORGANIZATION_NAME?.trim() || "Shortlist Studio";
const passwordHash = await hash(process.env.BOOTSTRAP_ADMIN_PASSWORD, 12);

const stages = [
  ["applied", "Applied", "دریافت‌شده", "applied", 1, 0],
  ["screen", "AI screen", "غربال هوشمند", "screening", 2, 0],
  ["review", "Team review", "بررسی تیم", "screening", 3, 0],
  ["interview", "Interview", "مصاحبه", "interview", 4, 0],
  ["offer", "Offer", "پیشنهاد", "offer", 5, 0],
  ["hired", "Hired", "استخدام‌شده", "hired", 6, 1],
  ["rejected", "Declined", "ردشده", "rejected", 7, 1],
];

function escapeTemplateHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brandedEmailHtml(body, locale) {
  const direction = locale === "fa" ? "rtl" : "ltr";
  const linkLabel = locale === "fa" ? "باز کردن پیوند امن" : "Open secure link";
  const footer = locale === "fa"
    ? "پیام استخدامی با کنترل انسانی · شورت‌لیست"
    : "Human-reviewed hiring communication · Shortlist";
  const content = escapeTemplateHtml(body)
    .replaceAll(
      "{{scheduling_url}}",
      `<a href="{{scheduling_url}}" style="background:#173c2d;border-radius:10px;color:#ffffff;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">${linkLabel}</a>`,
    )
    .replaceAll(
      "{{review_url}}",
      `<a href="{{review_url}}" style="background:#173c2d;border-radius:10px;color:#ffffff;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">${linkLabel}</a>`,
    )
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="color:#33453d;font-size:15px;line-height:1.75;margin:0 0 18px">${paragraph.replaceAll("\n", "<br>")}</p>`)
    .join("");

  return `<!doctype html><html dir="${direction}" lang="${locale}"><body style="background:#f4f7f4;margin:0;padding:28px 12px"><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;max-width:620px;width:100%"><tr><td style="background:#ffffff;border:1px solid #dce7df;border-radius:18px;padding:30px"><div style="color:#173c2d;font-family:Arial,sans-serif;font-size:20px;font-weight:800;margin-bottom:24px">Shortlist<span style="color:#96c84f">.</span></div><div style="font-family:Arial,sans-serif;text-align:${locale === "fa" ? "right" : "left"}">${content}</div><div style="border-top:1px solid #e6ece8;color:#718078;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;margin-top:28px;padding-top:18px">${footer}</div></td></tr></table></body></html>`;
}

await connection.beginTransaction();
try {
  const [existing] = await connection.execute(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [email],
  );
  if (existing.length) throw new Error("A user with this email already exists; bootstrap aborted.");

  await connection.execute(
    `INSERT INTO organizations
      (id, name, slug, default_locale, timezone, created_at, updated_at)
     VALUES (?, ?, ?, 'en', 'Asia/Tehran', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [organizationId, organizationName, `shortlist-${organizationId.slice(0, 8)}`],
  );
  await connection.execute(
    `INSERT INTO users
      (id, email, name, password_hash, status, locale, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', 'en', UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [userId, email, name, passwordHash],
  );
  await connection.execute(
    `INSERT INTO organization_memberships
      (id, organization_id, user_id, role, identity_access, status, created_at)
     VALUES (UUID(), ?, ?, 'owner', 1, 'active', UTC_TIMESTAMP(3))`,
    [organizationId, userId],
  );
  await connection.execute(
    `INSERT INTO positions
      (id, organization_id, title, department, location, employment_type,
       description, status, default_locale, timezone, version, created_by,
       created_at, updated_at)
     VALUES (?, ?, 'Solo AI Builder / Full-Stack AI Engineer', 'Product & Engineering',
             'Tehran · Hybrid', 'Full-time',
             'Build and ship AI-powered products from concept to production with speed, evidence, and human control.',
             'open', 'en', 'Asia/Tehran', 1, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [positionId, organizationId, userId],
  );
  for (const stage of stages) {
    await connection.execute(
      `INSERT INTO pipeline_stages
        (id, organization_id, position_id, stage_key, name_en, name_fa, kind,
         sort_order, is_terminal, created_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
      [organizationId, positionId, ...stage],
    );
  }

  const templateDefinitions = [
    {
      key: "team_review",
      name: "Team review request",
      locale: "en",
      subject: "Review requested · {{candidate_name}} · {{position_title}}",
      body: "Hi {{reviewer_name}},\n\nPlease review the evidence pack for {{candidate_name}} before {{review_deadline}}.\n\n{{review_url}}",
      variables: ["candidate_name", "position_title", "reviewer_name", "review_deadline", "review_url"],
    },
    {
      key: "team_review",
      name: "Team review request",
      locale: "fa",
      subject: "درخواست بررسی · {{candidate_name}} · {{position_title}}",
      body: "سلام {{reviewer_name}}،\n\nلطفاً بسته شواهد {{candidate_name}} را تا {{review_deadline}} بررسی و نظر مستقل خود را ثبت کنید.\n\n{{review_url}}",
      variables: ["candidate_name", "position_title", "reviewer_name", "review_deadline", "review_url"],
    },
    {
      key: "application_received",
      name: "Application received",
      locale: "en",
      subject: "We received your application · {{position_title}}",
      body: "Hi {{candidate_name}},\n\nThank you for applying for {{position_title}}. Our hiring team will review your application and contact you if there is a next step.\n\nBest,\n{{sender_name}}",
      variables: ["candidate_name", "position_title", "sender_name"],
    },
    {
      key: "application_received",
      name: "Application received",
      locale: "fa",
      subject: "درخواست شما دریافت شد · {{position_title}}",
      body: "سلام {{candidate_name}}،\n\nاز درخواست شما برای موقعیت {{position_title}} سپاسگزاریم. تیم استخدام رزومه را بررسی می‌کند و در صورت وجود مرحله بعدی با شما تماس می‌گیریم.\n\nبا احترام،\n{{sender_name}}",
      variables: ["candidate_name", "position_title", "sender_name"],
    },
    {
      key: "interview_invite",
      name: "Interview invitation",
      locale: "en",
      subject: "Next step for {{position_title}}",
      body: "Hi {{candidate_name}},\n\nWe would like to invite you to a structured interview for {{position_title}}.\n\n{{scheduling_url}}\n\nBest,\n{{sender_name}}",
      variables: ["candidate_name", "position_title", "scheduling_url", "sender_name"],
    },
    {
      key: "interview_invite",
      name: "Interview invitation",
      locale: "fa",
      subject: "مرحله بعدی برای موقعیت {{position_title}}",
      body: "سلام {{candidate_name}}،\n\nمایل هستیم شما را به مصاحبه ساختاریافته برای موقعیت {{position_title}} دعوت کنیم.\n\n{{scheduling_url}}\n\nبا احترام،\n{{sender_name}}",
      variables: ["candidate_name", "position_title", "scheduling_url", "sender_name"],
    },
    {
      key: "status_update",
      name: "Application status update",
      locale: "en",
      subject: "An update on {{position_title}}",
      body: "Hi {{candidate_name}},\n\nYour application for {{position_title}} is still under review. Thank you for your patience; we will share the next update as soon as possible.\n\nBest,\n{{sender_name}}",
      variables: ["candidate_name", "position_title", "sender_name"],
    },
    {
      key: "status_update",
      name: "Application status update",
      locale: "fa",
      subject: "به‌روزرسانی درخواست {{position_title}}",
      body: "سلام {{candidate_name}}،\n\nدرخواست شما برای موقعیت {{position_title}} همچنان در حال بررسی است. از شکیبایی شما سپاسگزاریم و نتیجه بعدی را در اولین فرصت اطلاع می‌دهیم.\n\nبا احترام،\n{{sender_name}}",
      variables: ["candidate_name", "position_title", "sender_name"],
    },
    {
      key: "not_selected",
      name: "Application outcome",
      locale: "en",
      subject: "Update on your {{position_title}} application",
      body: "Hi {{candidate_name}},\n\nThank you for the time you invested in the {{position_title}} process. After human review, we will not be moving forward with this application. We appreciate your interest and wish you success.\n\nBest,\n{{sender_name}}",
      variables: ["candidate_name", "position_title", "sender_name"],
    },
    {
      key: "not_selected",
      name: "Application outcome",
      locale: "fa",
      subject: "نتیجه درخواست {{position_title}}",
      body: "سلام {{candidate_name}}،\n\nاز زمانی که برای فرایند موقعیت {{position_title}} صرف کردید سپاسگزاریم. پس از بررسی انسانی، در این مرحله امکان ادامه این درخواست را نداریم. برای شما آرزوی موفقیت داریم.\n\nبا احترام،\n{{sender_name}}",
      variables: ["candidate_name", "position_title", "sender_name"],
    },
  ];
  const templateIds = new Map();
  for (const item of templateDefinitions) {
    let templateId = templateIds.get(item.key);
    if (!templateId) {
      templateId = randomUUID();
      templateIds.set(item.key, templateId);
      await connection.execute(
        `INSERT INTO email_templates
          (id, organization_id, template_key, name, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
        [templateId, organizationId, item.key, item.name, userId],
      );
    }
    await connection.execute(
      `INSERT INTO email_template_versions
        (id, organization_id, template_id, locale, subject, body_html, body_text,
         allowed_variables_json, version, status, created_by, created_at)
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, 1, 'active', ?, UTC_TIMESTAMP(3))`,
      [organizationId, templateId, item.locale, item.subject, brandedEmailHtml(item.body, item.locale), item.body, JSON.stringify(item.variables), userId],
    );
  }

  await connection.execute(
    `INSERT INTO automation_rules
      (id, organization_id, position_id, name, trigger_type, trigger_label,
       action_type, action_label, conditions_json, action_config_json, enabled,
       requires_approval, version, last_run_status, created_by, created_at, updated_at)
     VALUES
      (UUID(), ?, ?, 'Prepare interview invitation', 'application.stage_entered',
       'Candidate enters Interview', 'email.create_draft', 'Create email draft',
       '{}', '{}', 1, 1, 1, 'never', ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)),
      (UUID(), ?, ?, 'Review reminder after 24 hours', 'review.overdue',
       'Review request overdue · 24h', 'email.reviewers', 'Email assigned reviewers',
       '{}', '{}', 1, 0, 1, 'never', ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
    [organizationId, positionId, userId, organizationId, positionId, userId],
  );

  await connection.execute(
    `INSERT INTO audit_events
      (id, organization_id, actor_type, actor_id, action, target_type, target_id,
       target_label, position_id, source, metadata_json, occurred_at)
     VALUES (UUID(), ?, 'user', ?, 'workspace.bootstrapped', 'organization', ?, ?, ?, 'api', '{}', UTC_TIMESTAMP(3))`,
    [organizationId, userId, organizationId, organizationName, positionId],
  );
  await connection.commit();
  console.log(`Workspace created for ${email}. Remove BOOTSTRAP_ADMIN_PASSWORD from the environment now.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}

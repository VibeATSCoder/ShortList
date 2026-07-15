import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { ApplicationIntakeError, importSealedAssessment } from "@/lib/application-intake";
import { queryRows } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendTransactionalEmail } from "@/lib/review-email";
import { validateResumeFile } from "@/lib/file-validation";
import { clientIdentifier, isSameOrigin } from "@/lib/request-security";
import { reviewCandidateSchema } from "@/lib/reviews";
import type { PlanTier } from "@/lib/plans";
import type { WorkspaceSession } from "@/lib/workspace-types";

export const dynamic = "force-dynamic";

interface IntakePositionRow extends RowDataPacket {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  default_locale: "en" | "fa";
  plan_tier: PlanTier;
  owner_id: string;
  owner_name: string;
  owner_email: string;
}

const intakeSchema = z.object({
  assessment: reviewCandidateSchema.refine((assessment) => assessment.source === "live", "A live assessment is required."),
  workspaceSeal: z.string().min(80).max(2_048),
  candidateEmail: z.union([z.literal(""), z.email().max(254)]).optional(),
  resume: z.object({
    fileName: z.string().min(1).max(240),
    mimeType: z.string().min(1).max(120),
    dataUrl: z.string().min(1),
  }).optional(),
});

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

async function intakePosition(): Promise<IntakePositionRow | null> {
  const configuredId = process.env.PUBLIC_INTAKE_POSITION_ID?.trim();
  if (!configuredId || !z.string().uuid().safeParse(configuredId).success) return null;
  const rows = await queryRows<IntakePositionRow>(
    `SELECT p.id, p.organization_id, p.title, p.description, p.default_locale,
            o.plan_tier, u.id AS owner_id, u.name AS owner_name, u.email AS owner_email
       FROM positions p
       JOIN organizations o ON o.id = p.organization_id
       JOIN organization_memberships m
         ON m.organization_id = p.organization_id AND m.role = 'owner' AND m.status = 'active'
       JOIN users u ON u.id = m.user_id AND u.status = 'active'
      WHERE p.id = ? AND p.status = 'open' AND o.plan_tier = 'pro'
      ORDER BY m.created_at ASC
      LIMIT 1`,
    [configuredId],
  );
  return rows[0] ?? null;
}

function safeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export async function GET() {
  try {
    const position = await intakePosition();
    if (!position) return apiError(503, "PUBLIC_INTAKE_NOT_CONFIGURED", "Public resume intake is not configured.");
    return NextResponse.json(
      { enabled: true, job: { title: position.title, description: position.description } },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch (error) {
    console.error("public_intake_config_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(503, "PUBLIC_INTAKE_UNAVAILABLE", "Public resume intake is temporarily unavailable.");
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return apiError(403, "ORIGIN_NOT_ALLOWED", "Submit resumes from this Shortlist website.");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiError(415, "UNSUPPORTED_MEDIA_TYPE", "Public intake requests must use application/json.");
  }
  const rate = await checkRateLimit({
    scope: "public-intake-day",
    identifier: clientIdentifier(request),
    limit: 10,
    windowMs: 86_400_000,
    requireDistributed: process.env.NODE_ENV === "production",
  });
  if (!rate.allowed) return apiError(429, "PUBLIC_INTAKE_LIMIT", "The daily application limit has been reached. Try again tomorrow.");

  const parsed = intakeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError(400, "INVALID_PUBLIC_INTAKE", parsed.error.issues[0]?.message ?? "Check the application.");

  try {
    const position = await intakePosition();
    if (!position) return apiError(503, "PUBLIC_INTAKE_NOT_CONFIGURED", "Public resume intake is not configured.");
    const session: WorkspaceSession = {
      userId: position.owner_id,
      organizationId: position.organization_id,
      name: position.owner_name,
      email: position.owner_email,
      role: "owner",
      planTier: position.plan_tier,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const result = await importSealedAssessment(session, {
      positionId: position.id,
      assessment: parsed.data.assessment,
      workspaceSeal: parsed.data.workspaceSeal,
      candidateEmail: parsed.data.candidateEmail || undefined,
      source: "Public career intake",
      locale: "en",
    });

    const notifier = (process.env.APPLICATION_NOTIFICATION_EMAIL || process.env.HR_NOTIFICATION_EMAIL)?.trim();
    const panelUrl = `${(process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "")}/workspace?positionId=${encodeURIComponent(position.id)}`;
    let notificationSent = false;
    if (notifier && result.created) {
      const candidate = parsed.data.assessment.profile.displayName;
      const resume = parsed.data.resume ? validateResumeFile(parsed.data.resume) : null;
      const subject = `New screened application · ${candidate} · ${position.title}`;
      try {
        await sendTransactionalEmail({
          to: notifier,
          subject,
          attachments: resume
            ? [{ filename: resume.fileName, content: resume.bytes, contentType: resume.mimeType }]
            : undefined,
          text: `${candidate} submitted a resume and was added to ${position.title}.\n\nFit score: ${parsed.data.assessment.score}/100\nRecommendation: ${parsed.data.assessment.recommendation}\n\nOpen recruiter workspace: ${panelUrl}`,
          html: `<h1 style="font-size:22px;margin:0 0 12px">New screened application</h1><p><strong>${safeHtml(candidate)}</strong> was screened and added to <strong>${safeHtml(position.title)}</strong>.</p><div style="background:#f3f7f3;border-radius:12px;margin:18px 0;padding:14px"><strong>${parsed.data.assessment.score}/100</strong> fit score · ${safeHtml(parsed.data.assessment.recommendation.replaceAll("_", " "))}</div><a href="${safeHtml(panelUrl)}" style="background:#173c2d;border-radius:10px;color:#fff;display:inline-block;font-weight:700;padding:12px 18px;text-decoration:none">Open recruiter workspace</a>`,
        });
        notificationSent = true;
      } catch (error) {
        console.warn("public_intake_notification_failed", error instanceof Error ? error.name : "UnknownError");
      }
    }
    return NextResponse.json({ ok: true, ...result, notificationSent, panelUrl }, { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PUBLIC_INTAKE_FAILED";
    if (error instanceof ApplicationIntakeError) {
      const status = code === "PLAN_CANDIDATE_LIMIT" ? 403 : code === "CANDIDATE_ALREADY_APPLIED" ? 409 : 400;
      return apiError(status, code, "The screened application could not be added to the recruiter pipeline.");
    }
    console.error("public_intake_failed", error instanceof Error ? error.name : "UnknownError");
    return apiError(500, "PUBLIC_INTAKE_FAILED", "The screened application could not be saved.");
  }
}

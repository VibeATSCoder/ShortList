import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";

import { ApplicationIntakeError, attachResumeAsset, importSealedAssessment } from "@/lib/application-intake";
import { sendApplicationNotifications } from "@/lib/application-email";
import { queryRows } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateResumeFile } from "@/lib/file-validation";
import { clientIdentifier, isSameOrigin } from "@/lib/request-security";
import { reviewCandidateSchema } from "@/lib/reviews";
import type { PlanTier } from "@/lib/plans";
import type { WorkspaceSession } from "@/lib/workspace-types";
import { deleteReviewObject, saveWorkspaceResume } from "@/lib/review-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
    const resume = parsed.data.resume ? validateResumeFile(parsed.data.resume) : null;
    const result = await importSealedAssessment(session, {
      positionId: position.id,
      assessment: parsed.data.assessment,
      workspaceSeal: parsed.data.workspaceSeal,
      candidateEmail: parsed.data.candidateEmail || undefined,
      source: "Public career intake",
      locale: "en",
    });
    let resumeStored = false;
    if (resume && result.created && result.assessmentId) {
      const assetId = randomUUID();
      const storageKey = `workspace-resumes/${session.organizationId}/${assetId}`;
      try {
        await saveWorkspaceResume(storageKey, resume.bytes, resume.mimeType);
        await attachResumeAsset(session, {
          assetId,
          applicationId: result.applicationId,
          candidateId: result.candidateId,
          assessmentId: result.assessmentId,
          storageKey,
          originalName: resume.fileName,
          contentType: resume.mimeType,
          byteSize: resume.bytes.byteLength,
          sha256: createHash("sha256").update(resume.bytes).digest("hex"),
        });
        resumeStored = true;
      } catch (error) {
        await deleteReviewObject(storageKey).catch(() => undefined);
        console.warn("public_resume_storage_failed", error instanceof Error ? error.name : "UnknownError");
      }
    }
    const notifier = (process.env.APPLICATION_NOTIFICATION_EMAIL || process.env.HR_NOTIFICATION_EMAIL)?.trim();
    const panelUrl = `${(process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, "")}/workspace?positionId=${encodeURIComponent(position.id)}`;
    let notifications = { candidateAcknowledged: false, internalSent: 0, internalFailed: 0 };
    if (result.created) {
      const candidate = parsed.data.assessment.profile.displayName;
      notifications = await sendApplicationNotifications({
        candidateEmail: parsed.data.candidateEmail || undefined,
        candidateName: candidate,
        internalRecipients: notifier ? [notifier] : [],
        panelUrl,
        positionTitle: position.title,
        recommendation: parsed.data.assessment.recommendation,
        resume: resume ? { fileName: resume.fileName, bytes: resume.bytes, contentType: resume.mimeType } : null,
        score: parsed.data.assessment.score,
      });
    }
    return NextResponse.json({ ok: true, ...result, resumeStored, ...notifications, panelUrl }, { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PUBLIC_INTAKE_FAILED";
    if (error instanceof ApplicationIntakeError) {
      console.warn("public_intake_rejected", { code });
      const status = code === "PLAN_CANDIDATE_LIMIT" ? 403 : code === "CANDIDATE_ALREADY_APPLIED" ? 409 : 400;
      return apiError(status, code, "The screened application could not be added to the recruiter pipeline.");
    }
    const databaseError = error as { name?: string; code?: string; constraint?: string };
    console.error("public_intake_failed", {
      name: databaseError.name ?? "UnknownError",
      code: databaseError.code ?? "UNKNOWN",
      constraint: databaseError.constraint ?? "unknown",
    });
    return apiError(500, "PUBLIC_INTAKE_FAILED", "The screened application could not be saved.");
  }
}

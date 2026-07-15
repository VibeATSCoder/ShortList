import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { z } from "zod";

import { canForPosition, canReadPositionIdentity, requestSession } from "@/lib/auth";
import { queryRows } from "@/lib/db";
import { loadReviewResume } from "@/lib/review-store";

export const dynamic = "force-dynamic";

interface ResumeRow extends RowDataPacket {
  position_id: string;
  storage_key: string;
  original_name: string;
  content_type: string;
}

function apiError(status: number, message: string) {
  return NextResponse.json({ error: { message } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> },
) {
  const session = await requestSession(request);
  if (!session) return apiError(401, "Sign in to view this resume.");
  const { applicationId } = await context.params;
  if (!z.string().uuid().safeParse(applicationId).success) return apiError(404, "Resume not found.");

  const rows = await queryRows<ResumeRow>(
    `SELECT a.position_id, r.storage_key, r.original_name, r.content_type
       FROM applications a
       JOIN assessment_snapshots x
         ON x.id = a.latest_assessment_id
        AND x.organization_id = a.organization_id
        AND x.application_id = a.id
       JOIN resume_assets r
         ON r.id = x.resume_asset_id
        AND r.organization_id = a.organization_id
        AND r.candidate_id = a.candidate_id
      WHERE a.id = ? AND a.organization_id = ? AND a.state <> 'archived'
        AND r.state = 'active' AND r.deleted_at IS NULL
      LIMIT 1`,
    [applicationId, session.organizationId],
  );
  const resume = rows[0];
  if (!resume) return apiError(404, "Resume not found.");
  if (
    !(await canForPosition(session, resume.position_id, "candidate.read")) ||
    !(await canReadPositionIdentity(session, resume.position_id))
  ) {
    return apiError(403, "Identity access is required to view the original resume.");
  }

  const bytes = await loadReviewResume(resume.storage_key);
  if (!bytes) return apiError(404, "Resume file is unavailable.");
  return new NextResponse(bytes, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(resume.original_name)}`,
      "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Type": resume.content_type,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

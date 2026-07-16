import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { WorkspaceApp } from "@/components/workspace-app";
import { currentSession } from "@/lib/auth";
import { databaseConfigured } from "@/lib/db";
import { demoWorkspaceSnapshot } from "@/lib/workspace-demo";
import { loadWorkspace } from "@/lib/workspace-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recruiter workspace · Shortlist",
  description: "Position-based, evidence-backed hiring operations.",
  robots: { index: false, follow: false },
};

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ positionId?: string; demo?: string }>;
}) {
  const { positionId, demo } = await searchParams;
  if (demo === "free" || demo === "pro") {
    return <WorkspaceApp initialSnapshot={demoWorkspaceSnapshot(positionId, demo)} />;
  }
  if (!databaseConfigured()) {
    return <WorkspaceApp initialSnapshot={demoWorkspaceSnapshot(positionId)} />;
  }

  const session = await currentSession();
  if (!session) redirect("/login?next=%2Fworkspace");
  const snapshot = await loadWorkspace(session, positionId);
  return <WorkspaceApp initialSnapshot={snapshot} />;
}

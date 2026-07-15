import type { Metadata } from "next";

import { AtsDashboard } from "@/components/ats-dashboard";

export const metadata: Metadata = {
  title: "Interactive product demo · Shortlist",
  description: "Explore the complete evidence-backed ATS evaluation dashboard.",
};

export default function DemoPage() {
  return <AtsDashboard />;
}

import type { Metadata } from "next";

import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Shortlist · Evidence-backed AI resume screening",
  description: "Screen resumes against a role, review grounded evidence, and move candidates into a recruiter pipeline automatically.",
};

export default function Home() {
  return <LandingPage />;
}

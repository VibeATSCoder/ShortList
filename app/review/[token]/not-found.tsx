import Link from "next/link";
import { Clock3, ShieldCheck } from "lucide-react";

export default function ReviewNotFound() {
  return (
    <main className="review-link-state">
      <div className="review-link-state__card">
        <span><Clock3 size={26} /></span>
        <h1>This private review is unavailable.</h1>
        <p>The signed link is invalid, expired, or the review pack has been removed.</p>
        <div><ShieldCheck size={16} />Candidate information is never exposed when access validation fails.</div>
        <Link className="button button--dark" href="/">Return to Shortlist</Link>
      </div>
    </main>
  );
}

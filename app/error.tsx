"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="fatal-state">
      <div className="fatal-state__mark">
        <AlertTriangle aria-hidden="true" size={25} />
      </div>
      <p className="eyebrow">Safe failure</p>
      <h1>The shortlist hit a snag.</h1>
      <p>
        No resume data was stored. Reset this view and continue from the seeded
        evaluation.
      </p>
      <button className="button button--dark" onClick={reset} type="button">
        <RotateCcw aria-hidden="true" size={16} />
        Reset view
      </button>
    </main>
  );
}


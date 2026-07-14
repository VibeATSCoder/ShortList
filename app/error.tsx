"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export default function GlobalError({ reset }: { reset: () => void }) {
  const { copy } = useLocale();
  return (
    <main className="fatal-state">
      <div className="fatal-state__mark">
        <AlertTriangle aria-hidden="true" size={25} />
      </div>
      <p className="eyebrow">{copy.errors.safeFailure}</p>
      <h1>{copy.errors.appErrorTitle}</h1>
      <p>{copy.errors.appErrorDescription}</p>
      <button className="button button--dark" onClick={reset} type="button">
        <RotateCcw aria-hidden="true" size={16} />
        {copy.errors.resetView}
      </button>
    </main>
  );
}

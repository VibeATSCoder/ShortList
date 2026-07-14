"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";

export default function NotFound() {
  const { copy } = useLocale();
  return (
    <main className="fatal-state">
      <p className="eyebrow">{copy.errors.notFoundEyebrow}</p>
      <h1>{copy.errors.notFoundTitle}</h1>
      <p>{copy.errors.notFoundDescription}</p>
      <Link className="button button--dark" href="/">
        {copy.errors.returnHome}
      </Link>
    </main>
  );
}

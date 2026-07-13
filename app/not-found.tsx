import Link from "next/link";

export default function NotFound() {
  return (
    <main className="fatal-state">
      <p className="eyebrow">404 · no signal here</p>
      <h1>This page did not make the shortlist.</h1>
      <p>The product lives on one focused dashboard.</p>
      <Link className="button button--dark" href="/">
        Return to Shortlist
      </Link>
    </main>
  );
}


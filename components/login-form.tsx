"use client";

import { ArrowRight, Check, Eye, EyeOff, KeyRound, LockKeyhole, Play, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/locale-provider";
import { PUBLIC_DEMO_ACCOUNTS, type PublicDemoTier } from "@/lib/public-demo-accounts";

const demoAccountPresentation: Record<PublicDemoTier, { title: string; subtitle: string; features: string[] }> = {
  free: {
    title: "Free demo",
    subtitle: "Core ATS workflow with real plan limits",
    features: ["1 active position", "Up to 5 candidates", "Evidence and pipeline"],
  },
  pro: {
    title: "Pro demo",
    subtitle: "Complete recruiter and team workflow",
    features: ["25 positions", "Reviewers and email", "Templates, automation, audit"],
  },
};

export function LoginForm() {
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const selectedAccount: PublicDemoTier = searchParams.get("account") === "free" ? "free" : "pro";
  const [email, setEmail] = useState<string>(PUBLIC_DEMO_ACCOUNTS[selectedAccount].email);
  const [password, setPassword] = useState<string>(PUBLIC_DEMO_ACCOUNTS[selectedAccount].password);
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const fa = locale === "fa";

  function selectDemoAccount(tier: PublicDemoTier) {
    setEmail(PUBLIC_DEMO_ACCOUNTS[tier].email);
    setPassword(PUBLIC_DEMO_ACCOUNTS[tier].password);
    setMessage("");
    setState("idle");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { redirectTo?: string; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message || "Sign-in failed.");
      const next = searchParams.get("next");
      let destination = result.redirectTo || "/workspace";
      if (next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
        const resolved = new URL(next, window.location.origin);
        if (resolved.origin === window.location.origin) destination = `${resolved.pathname}${resolved.search}${resolved.hash}`;
      }
      window.location.assign(destination);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Sign-in failed.");
    }
  }

  return (
    <main className="login-page">
      <div className="login-topbar"><Link className="ws-brand-link" href="/"><span className="brand__mark" aria-hidden="true">S<span /></span><span><strong>Shortlist</strong><small>Evidence-backed hiring</small></span></Link></div>
      <section className="login-shell">
        <div className="login-story">
          <span className="ws-kicker"><ShieldCheck size={13} />48-hour challenge access</span>
          <h1>Choose a workspace and start testing.</h1>
          <p>These are real database-backed accounts with genuine Free and Pro entitlements. Use fictional data only; the workspaces are shared between evaluators.</p>
          <div className="login-plan-grid"><article><span>FREE</span><strong>Structured start</strong><small>1 position · 5 candidates · core pipeline</small></article><article className="is-pro"><span>PRO</span><strong>Full team workflow</strong><small>Email, reviewers, templates, automation, and audit</small></article></div>
          <ul><li><span><LockKeyhole size={17} /></span><div><strong>Real plan behavior</strong><small>Database records, limits, roles, and workflows behave like the product.</small></div></li><li><span><KeyRound size={17} /></span><div><strong>Production integrations</strong><small>Pro includes outbound email. Use fictional data and recipient addresses you control.</small></div></li></ul>
        </div>

        <div className="login-access-panel">
          <div className="login-access-heading"><span className="login-card__icon"><Play size={20} /></span><div><h2>Use a demo account</h2><p>Select credentials, then sign in below.</p></div></div>
          <div className="login-demo-grid">
            {(Object.keys(PUBLIC_DEMO_ACCOUNTS) as PublicDemoTier[]).map((tier) => {
              const account = demoAccountPresentation[tier];
              const credentials = PUBLIC_DEMO_ACCOUNTS[tier];
              const selected = email === credentials.email;
              return <button className={`login-demo-account login-demo-account--${tier} ${selected ? "is-selected" : ""}`} onClick={() => selectDemoAccount(tier)} type="button" key={tier}>
                <div><span>{tier.toUpperCase()}</span>{tier === "pro" ? <em><Sparkles size={11} />Complete</em> : null}</div>
                <strong>{account.title}</strong><small>{account.subtitle}</small>
                <ul>{account.features.map((feature) => <li key={feature}><Check size={12} />{feature}</li>)}</ul>
                <span className="login-demo-credential"><i>Username</i><code>{credentials.email}</code></span>
                <span className="login-demo-credential"><i>Password</i><code>{credentials.password}</code></span>
                <b>{selected ? "Credentials selected" : `Use ${tier} credentials`} <ArrowRight size={14} /></b>
              </button>;
            })}
          </div>

          <div className="login-divider"><span>Account sign-in</span></div>
          <form className="login-card login-card--embedded" onSubmit={submit}>
            <label><span>{fa ? "ایمیل کاری" : "Work email"}</span><input autoComplete="email" maxLength={254} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            <label><span>{fa ? "رمز عبور" : "Password"}</span><div className="login-password"><input autoComplete="current-password" maxLength={256} minLength={1} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} value={password} /><button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {state === "error" ? <p className="form-error" role="alert">{message}</p> : null}
            <button className="button button--dark button--full login-submit" disabled={state === "submitting"} type="submit">{state === "submitting" ? "Signing in…" : "Secure sign in"}<ArrowRight size={17} /></button>
            <small className="login-card__foot"><LockKeyhole size={13} />Public demo credentials are documented. Private account passwords are never logged.</small>
          </form>
        </div>
      </section>
    </main>
  );
}

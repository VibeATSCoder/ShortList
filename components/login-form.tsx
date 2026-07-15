"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, KeyRound, Languages, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useLocale } from "@/components/locale-provider";

export function LoginForm() {
  const { locale, setLocale } = useLocale();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const fa = locale === "fa";

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
      if (!response.ok) throw new Error(result.error?.message || (fa ? "ورود ممکن نبود." : "Sign-in failed."));
      const next = searchParams.get("next");
      let destination = result.redirectTo || "/workspace";
      if (next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")) {
        const resolved = new URL(next, window.location.origin);
        if (resolved.origin === window.location.origin) {
          destination = `${resolved.pathname}${resolved.search}${resolved.hash}`;
        }
      }
      window.location.assign(destination);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : (fa ? "ورود ممکن نبود." : "Sign-in failed."));
    }
  }

  return (
    <main className="login-page">
      <div className="login-topbar"><Link className="ws-brand-link" href="/"><span className="brand__mark" aria-hidden="true">S<span /></span><span><strong>Shortlist</strong><small>{fa ? "استخدام مبتنی بر شواهد" : "Evidence-backed hiring"}</small></span></Link><button className="login-language" onClick={() => setLocale(fa ? "en" : "fa")} type="button"><Languages size={15} />{fa ? "English" : "فارسی"}</button></div>
      <motion.section className="login-shell" initial={reduceMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <div className="login-story"><span className="ws-kicker"><ShieldCheck size={13} />{fa ? "فضای خصوصی تیم" : "Private team workspace"}</span><h1>{fa ? "استخدام را با شواهد اداره کنید." : "Run hiring on evidence."}</h1><p>{fa ? "موقعیت‌ها، فرایند جذب، اسکورکارت‌ها، دسترسی تیم و ارتباطات نامزدها در یک فضای کنترل‌شده." : "Positions, pipelines, scorecards, team access, and candidate communication in one controlled workspace."}</p><div className="login-plan-grid"><article><span>FREE</span><strong>{fa ? "شروع ساختاریافته" : "Structured start"}</strong><small>{fa ? "۱ موقعیت · ۵ داوطلب · پایپ‌لاین اصلی" : "1 position · 5 candidates · core pipeline"}</small></article><article className="is-pro"><span>PRO</span><strong>{fa ? "گردش‌کار کامل تیم" : "Full team workflow"}</strong><small>{fa ? "ایمیل، بررسی‌کنندگان، قالب‌ها، خودکارسازی و ممیزی" : "Email, reviewers, templates, automation, and audit"}</small></article></div><ul><li><span><LockKeyhole size={17} /></span><div><strong>{fa ? "دسترسی مبتنی بر نقش" : "Role-based access"}</strong><small>{fa ? "هویت و موقعیت‌ها جداگانه کنترل می‌شوند." : "Identity and position scope are controlled separately."}</small></div></li><li><span><KeyRound size={17} /></span><div><strong>{fa ? "جلسه قابل لغو" : "Revocable sessions"}</strong><small>{fa ? "کوکی امن، انقضا و ثبت ممیزی." : "Secure cookies, idle expiry, and an audit event."}</small></div></li></ul></div>
        <form className="login-card" onSubmit={submit}><div><span className="login-card__icon"><KeyRound size={20} /></span><h2>{fa ? "ورود به فضای استخدام" : "Sign in to your workspace"}</h2><p>{fa ? "از حساب مدیری که در راه‌اندازی سی‌پنل ساخته‌اید استفاده کنید." : "Use the owner account created during cPanel bootstrap."}</p></div><label><span>{fa ? "ایمیل کاری" : "Work email"}</span><input autoComplete="email" maxLength={254} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label><label><span>{fa ? "رمز عبور" : "Password"}</span><div className="login-password"><input autoComplete="current-password" maxLength={256} minLength={1} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} value={password} /><button aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{state === "error" ? <p className="form-error" role="alert">{message}</p> : null}<button className="button button--dark button--full login-submit" disabled={state === "submitting"} type="submit">{state === "submitting" ? (fa ? "در حال ورود…" : "Signing in…") : (fa ? "ورود امن" : "Secure sign in")}<ArrowRight size={17} /></button><small className="login-card__foot"><LockKeyhole size={13} />{fa ? "رمز عبور هرگز در مرورگر یا لاگ ذخیره نمی‌شود." : "Passwords are never stored in the browser or application logs."}</small></form>
      </motion.section>
    </main>
  );
}

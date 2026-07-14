"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  MessageSquareText,
  Minus,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import type { ReviewFeedback, ReviewPack } from "@/lib/reviews";

const copy = {
  en: {
    privateReview: "Private team review",
    requestedBy: "Requested by",
    expires: "Link expires",
    fit: "fit",
    aiSignal: "AI signal",
    humanDecision: "Human decision",
    summary: "Assessment summary",
    evidence: "Evidence-backed score",
    strengths: "Strengths",
    gaps: "Evidence gaps",
    interview: "Interview plan",
    resume: "Download private resume",
    resumeNote: "The file is streamed through an authenticated server route and is never public.",
    feedback: "Your review",
    feedbackNote: "Your decision is recorded separately and never changes the AI score.",
    name: "Your name",
    namePlaceholder: "e.g. Sara, Hiring Manager",
    comment: "Decision rationale",
    commentPlaceholder: "What evidence supports your decision? What should the next reviewer validate?",
    advance: "Advance",
    hold: "Hold",
    decline: "Decline",
    submit: "Submit team review",
    submitting: "Saving review…",
    complete: "Review submitted",
    completeNote: "Your feedback is now part of the append-only team review history.",
    another: "Add another review",
    history: "Team feedback",
    noHistory: "No team feedback yet. Be the first reviewer.",
    error: "Feedback could not be saved. Check the link and try again.",
    fairness: "Decision-support only. Validate evidence and keep protected attributes out of hiring decisions.",
  },
  fa: {
    privateReview: "بررسی خصوصی تیم",
    requestedBy: "درخواست‌کننده",
    expires: "انقضای پیوند",
    fit: "تناسب",
    aiSignal: "پیشنهاد هوش مصنوعی",
    humanDecision: "تصمیم انسانی",
    summary: "خلاصه ارزیابی",
    evidence: "امتیاز مبتنی بر شواهد",
    strengths: "نقاط قوت",
    gaps: "کمبود شواهد",
    interview: "برنامه مصاحبه",
    resume: "دریافت رزومه خصوصی",
    resumeNote: "فایل فقط از مسیر احراز‌شده سرور ارسال می‌شود و عمومی نیست.",
    feedback: "نظر شما",
    feedbackNote: "تصمیم شما جداگانه ثبت می‌شود و امتیاز هوش مصنوعی را تغییر نمی‌دهد.",
    name: "نام شما",
    namePlaceholder: "مثلاً سارا، مدیر استخدام",
    comment: "دلیل تصمیم",
    commentPlaceholder: "کدام شواهد از تصمیم شما پشتیبانی می‌کند و چه چیزی باید بررسی شود؟",
    advance: "دعوت به مرحله بعد",
    hold: "در انتظار",
    decline: "رد",
    submit: "ثبت نظر تیم",
    submitting: "در حال ثبت…",
    complete: "نظر ثبت شد",
    completeNote: "بازخورد شما اکنون بخشی از تاریخچه تغییرناپذیر بررسی تیم است.",
    another: "ثبت نظر دیگر",
    history: "بازخورد تیم",
    noHistory: "هنوز نظری ثبت نشده است. اولین بررسی‌کننده باشید.",
    error: "ثبت نظر ممکن نبود. پیوند را بررسی و دوباره تلاش کنید.",
    fairness: "فقط برای پشتیبانی تصمیم؛ شواهد را بررسی کنید و ویژگی‌های حساس را وارد تصمیم استخدام نکنید.",
  },
} as const;

function reviewTimestamp(value: string, locale: ReviewPack["locale"]): string {
  const stableUtc = `${value.slice(0, 16).replace("T", " ")} UTC`;
  if (locale === "en") return stableUtc;
  const digits = "۰۱۲۳۴۵۶۷۸۹";
  return stableUtc.replace(/[0-9]/g, (digit) => digits[Number(digit)]);
}

export function ReviewerWorkspace({
  pack,
  token,
  initialFeedback,
}: {
  pack: ReviewPack;
  token: string;
  initialFeedback: ReviewFeedback[];
}) {
  const t = copy[pack.locale];
  const [reviewerName, setReviewerName] = useState("");
  const [decision, setDecision] = useState<ReviewFeedback["decision"] | null>(null);
  const [comment, setComment] = useState("");
  const [feedback, setFeedback] = useState(initialFeedback);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (!decision || !reviewerName.trim() || !comment.trim()) return;
    setState("saving");
    try {
      const response = await fetch("/api/reviews/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reviewerName, decision, comment }),
      });
      const payload = (await response.json()) as { feedback?: ReviewFeedback };
      if (!response.ok || !payload.feedback) throw new Error("Feedback failed");
      setFeedback((current) => [...current, payload.feedback!]);
      setState("saved");
    } catch {
      setState("error");
    }
  }

  const candidate = pack.candidate;
  return (
    <main className="review-page" dir={pack.locale === "fa" ? "rtl" : "ltr"}>
      <header className="review-topbar">
        <Link className="brand" href="/">
          <span className="brand__mark" aria-hidden="true">S<span /></span>
          <strong>Shortlist</strong>
        </Link>
        <span className="review-private-chip"><ShieldCheck size={15} />{t.privateReview}</span>
      </header>

      <div className="review-shell">
        <section className="review-hero">
          <div>
            <span className="eyebrow"><Sparkles size={13} />{pack.job.title}</span>
            <h1 className="bidi-isolate" dir="auto">{candidate.profile.displayName}</h1>
            <p className="bidi-isolate" dir="auto">{candidate.profile.currentRole}</p>
            <div className="review-meta">
              <span>{t.requestedBy} <strong>{pack.requesterName}</strong></span>
              <span><Clock3 size={14} />{t.expires} {reviewTimestamp(pack.expiresAt, pack.locale)}</span>
            </div>
          </div>
          <div className="review-score">
            <strong>{candidate.score}</strong><span>/100</span><small>{t.fit}</small>
          </div>
        </section>

        {pack.note ? <aside className="review-note"><MessageSquareText size={18} /><p>{pack.note}</p></aside> : null}

        <div className="review-grid">
          <div className="review-report">
            <section className="review-card review-summary-card">
              <div className="review-card__heading"><span>{t.aiSignal}</span><strong>{candidate.recommendation.replaceAll("_", " ")}</strong></div>
              <h2>{t.summary}</h2>
              <strong className="bidi-isolate" dir="auto">{candidate.verdict}</strong>
              <p className="bidi-isolate" dir="auto">{candidate.summary}</p>
            </section>

            <section className="review-card">
              <h2>{t.evidence}</h2>
              <div className="review-rubric">
                {candidate.rubric.map((item) => (
                  <article key={item.key}>
                    <div><strong>{item.label}</strong><span>{item.score}/{item.maxScore}</span></div>
                    <p className="bidi-isolate" dir="auto">{item.rationale}</p>
                    {item.evidence[0] ? <q className="bidi-isolate" dir="auto">{item.evidence[0]}</q> : null}
                  </article>
                ))}
              </div>
            </section>

            <div className="review-signal-grid">
              <section className="review-card">
                <h2>{t.strengths}</h2>
                <ul>{candidate.strengths.map((item) => <li key={item}><CheckCircle2 size={15} /><span className="bidi-isolate" dir="auto">{item}</span></li>)}</ul>
              </section>
              <section className="review-card">
                <h2>{t.gaps}</h2>
                <ul>{candidate.gaps.map((item) => <li key={item}><Minus size={15} /><span className="bidi-isolate" dir="auto">{item}</span></li>)}</ul>
              </section>
            </div>

            <section className="review-card">
              <h2>{t.interview}</h2>
              <ol className="review-questions">{candidate.interviewQuestions.map((item, index) => <li key={item.question}><span>{String(index + 1).padStart(2, "0")}</span><div><strong className="bidi-isolate" dir="auto">{item.question}</strong><p className="bidi-isolate" dir="auto">{item.why}</p></div></li>)}</ol>
            </section>

            {pack.resume ? (
              <section className="review-card review-resume-card">
                <FileCheck2 size={22} />
                <div><strong>{pack.resume.fileName}</strong><p>{t.resumeNote}</p></div>
                <a className="button button--subtle" href={`/api/reviews/${encodeURIComponent(token)}/resume`}><Download size={16} />{t.resume}</a>
              </section>
            ) : null}
          </div>

          <aside className="review-action-column">
            <section className="review-card review-form-card">
              {state === "saved" ? (
                <div className="review-success">
                  <CheckCircle2 size={34} />
                  <h2>{t.complete}</h2>
                  <p>{t.completeNote}</p>
                  <button className="button button--subtle" onClick={() => { setState("idle"); setDecision(null); setComment(""); setReviewerName(""); }} type="button">{t.another}</button>
                </div>
              ) : (
                <form onSubmit={submitReview}>
                  <span className="eyebrow">{t.humanDecision}</span>
                  <h2>{t.feedback}</h2>
                  <p>{t.feedbackNote}</p>
                  <label><span>{t.name}</span><input maxLength={120} onChange={(event) => setReviewerName(event.target.value)} placeholder={t.namePlaceholder} required value={reviewerName} /></label>
                  <div className="review-decision-group">
                    {(["advance", "hold", "decline"] as const).map((value) => (
                      <button aria-pressed={decision === value} key={value} onClick={() => setDecision(value)} type="button">
                        {value === "advance" ? <ArrowRight size={15} /> : value === "hold" ? <Minus size={15} /> : <X size={15} />}
                        {t[value]}
                      </button>
                    ))}
                  </div>
                  <label><span>{t.comment}</span><textarea maxLength={2_000} minLength={10} onChange={(event) => setComment(event.target.value)} placeholder={t.commentPlaceholder} required rows={5} value={comment} /></label>
                  {state === "error" ? <p className="form-error" role="alert">{t.error}</p> : null}
                  <button className="button button--dark button--full" disabled={!decision || state === "saving"} type="submit">{state === "saving" ? t.submitting : t.submit}</button>
                </form>
              )}
            </section>

            <section className="review-card review-history">
              <h2>{t.history}<span>{feedback.length}</span></h2>
              {feedback.length ? feedback.map((item) => (
                <article key={item.id}>
                  <div><strong>{item.reviewerName}</strong><span className={`human-chip human-chip--${item.decision}`}>{t[item.decision]}</span></div>
                  <p>{item.comment}</p><time>{reviewTimestamp(item.submittedAt, pack.locale)}</time>
                </article>
              )) : <p>{t.noHistory}</p>}
            </section>
          </aside>
        </div>

        <footer className="review-fairness"><ShieldCheck size={18} /><span>{t.fairness}</span></footer>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FileUp,
  Link2,
  Mail,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import type { JobProfile, ScreeningResult } from "@/lib/types";

const content = {
  en: {
    eyebrow: "Team workflow",
    title: "Share a private review pack",
    description: "Create an expiring evidence report. Email is optional; the secure link works immediately.",
    close: "Close team sharing",
    requester: "Your name",
    requesterPlaceholder: "e.g. Mina, Talent Partner",
    recipients: "Reviewer emails · optional",
    recipientsPlaceholder: "manager@company.com, lead@company.com",
    recipientsHint: "Configured deployments send individual emails. Leave empty to copy the link yourself.",
    message: "Context for reviewers · optional",
    messagePlaceholder: "Focus on ownership evidence and validate the deployment claims.",
    expiry: "Link lifetime",
    hours: "hours",
    attachment: "Original resume · optional",
    choose: "Attach PDF, DOCX, TXT, or MD",
    attachmentHint: "Maximum 3 MiB. Available only when identity is visible.",
    blindAttachment: "Resume attachment is disabled while blind review is on because the file may reveal identity.",
    security: "Private Blob storage · signed link · append-only feedback · no autonomous decisions",
    cancel: "Cancel",
    create: "Create review link",
    creating: "Creating secure link…",
    ready: "Review pack ready",
    readyDescription: "Share this link with the hiring team. It expires automatically.",
    emailed: (count: number) => `${count} reviewer email${count === 1 ? "" : "s"} sent.`,
    linkOnly: "Email is not configured, so no message was sent. The link is fully functional.",
    copy: "Copy secure link",
    copied: "Copied",
    open: "Open reviewer view",
    done: "Done",
    error: "The review pack could not be created.",
  },
  fa: {
    eyebrow: "گردش‌کار تیم",
    title: "بسته بررسی خصوصی را به اشتراک بگذارید",
    description: "یک گزارش شواهد با انقضای خودکار بسازید. ایمیل اختیاری است و پیوند امن فوراً کار می‌کند.",
    close: "بستن اشتراک‌گذاری تیم",
    requester: "نام شما",
    requesterPlaceholder: "مثلاً مینا، کارشناس جذب",
    recipients: "ایمیل بررسی‌کنندگان · اختیاری",
    recipientsPlaceholder: "manager@company.com, lead@company.com",
    recipientsHint: "در استقرار تنظیم‌شده، ایمیل جداگانه ارسال می‌شود. برای کپی دستی پیوند، خالی بگذارید.",
    message: "توضیح برای بررسی‌کنندگان · اختیاری",
    messagePlaceholder: "روی شواهد مالکیت تمرکز و ادعاهای استقرار را راستی‌آزمایی کنید.",
    expiry: "مدت اعتبار پیوند",
    hours: "ساعت",
    attachment: "رزومه اصلی · اختیاری",
    choose: "افزودن PDF، TXT یا MD",
    attachmentHint: "حداکثر ۳ مگابایت؛ فقط وقتی هویت نمایش داده می‌شود.",
    blindAttachment: "در حالت بررسی ناشناس، پیوست رزومه غیرفعال است چون فایل ممکن است هویت را نشان دهد.",
    security: "فضای خصوصی Blob · پیوند امضاشده · بازخورد تغییرناپذیر · بدون تصمیم خودکار",
    cancel: "انصراف",
    create: "ساخت پیوند بررسی",
    creating: "در حال ساخت پیوند امن…",
    ready: "بسته بررسی آماده است",
    readyDescription: "این پیوند را با تیم استخدام به اشتراک بگذارید؛ خودکار منقضی می‌شود.",
    emailed: (count: number) => `${count} ایمیل برای بررسی‌کنندگان ارسال شد.`,
    linkOnly: "ایمیل تنظیم نشده است؛ پیامی ارسال نشد اما پیوند کاملاً فعال است.",
    copy: "کپی پیوند امن",
    copied: "کپی شد",
    open: "باز کردن نمای بررسی‌کننده",
    done: "تمام",
    error: "ساخت بسته بررسی ممکن نبود.",
  },
} as const;

interface ShareResponse {
  reviewUrl: string;
  expiresAt: string;
  emailConfigured: boolean;
  emailsSent: number;
  resumeIncluded: boolean;
}

export function ShareReviewModal({
  candidate,
  job,
  blindMode,
  onClose,
}: {
  candidate: ScreeningResult;
  job: JobProfile;
  blindMode: boolean;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const t = content[locale];
  const dialogRef = useRef<HTMLDivElement>(null);
  const [requesterName, setRequesterName] = useState("");
  const [recipients, setRecipients] = useState("");
  const [note, setNote] = useState("");
  const [expiresInHours, setExpiresInHours] = useState<24 | 48 | 72>(48);
  const [resume, setResume] = useState<File | null>(null);
  const [state, setState] = useState<"idle" | "creating" | "ready" | "error">("idle");
  const [result, setResult] = useState<ShareResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("input")?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose]);

  async function createReview(event: React.FormEvent) {
    event.preventDefault();
    setState("creating");
    setError("");
    try {
      const recipientList = recipients
        .split(/[;,\s]+/)
        .map((email) => email.trim())
        .filter(Boolean);
      const form = new FormData();
      form.set(
        "payload",
        JSON.stringify({
          candidate,
          job,
          locale,
          blindMode,
          requesterName,
          recipients: recipientList,
          note,
          expiresInHours,
        }),
      );
      if (resume && !blindMode) form.set("resume", resume);

      const response = await fetch("/api/reviews", { method: "POST", body: form });
      const payload = (await response.json()) as ShareResponse & { error?: { message?: string } };
      if (!response.ok || !payload.reviewUrl) throw new Error(payload.error?.message || t.error);
      setResult(payload);
      setState("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t.error);
      setState("error");
    }
  }

  async function copyLink() {
    if (!result) return;
    await navigator.clipboard.writeText(result.reviewUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }

  return (
    <div className="modal-backdrop share-modal-backdrop" role="presentation">
      <div aria-labelledby="share-review-title" aria-modal="true" className="share-modal" ref={dialogRef} role="dialog">
        <header className="share-modal__header">
          <div><span className="eyebrow"><Users size={13} />{t.eyebrow}</span><h2 id="share-review-title">{t.title}</h2><p>{t.description}</p></div>
          <button aria-label={t.close} className="icon-button" onClick={onClose} type="button"><X size={18} /></button>
        </header>

        {state === "ready" && result ? (
          <div className="share-success">
            <span className="share-success__icon"><Check size={24} /></span>
            <h3>{t.ready}</h3>
            <p>{t.readyDescription}</p>
            <div className="share-link-box"><Link2 size={17} /><span dir="ltr">{result.reviewUrl}</span></div>
            <p className={`share-delivery ${result.emailsSent ? "share-delivery--sent" : ""}`}>
              <Mail size={15} />{result.emailsSent ? t.emailed(result.emailsSent) : t.linkOnly}
            </p>
            <div className="share-success__actions">
              <button className="button button--dark" onClick={copyLink} type="button">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? t.copied : t.copy}</button>
              <a className="button button--subtle" href={result.reviewUrl} rel="noreferrer" target="_blank"><ExternalLink size={16} />{t.open}</a>
              <button className="button button--ghost" onClick={onClose} type="button">{t.done}</button>
            </div>
          </div>
        ) : (
          <form className="share-form" onSubmit={createReview}>
            <div className="share-candidate-preview"><div className="avatar">{blindMode ? "01" : candidate.profile.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</div><div><strong>{blindMode ? (locale === "fa" ? "داوطلب ناشناس" : "Anonymous candidate") : candidate.profile.displayName}</strong><span>{job.title} · {candidate.score}/100</span></div><span className={`recommendation recommendation--${candidate.recommendation}`}>{candidate.recommendation.replaceAll("_", " ")}</span></div>

            <div className="share-field-grid">
              <label><span>{t.requester}</span><input maxLength={120} onChange={(event) => setRequesterName(event.target.value)} placeholder={t.requesterPlaceholder} required value={requesterName} /></label>
              <label><span>{t.expiry}</span><select onChange={(event) => setExpiresInHours(Number(event.target.value) as 24 | 48 | 72)} value={expiresInHours}>{([24, 48, 72] as const).map((hours) => <option key={hours} value={hours}>{hours} {t.hours}</option>)}</select></label>
            </div>
            <label><span>{t.recipients}</span><div className="input-with-icon"><Mail size={16} /><input onChange={(event) => setRecipients(event.target.value)} placeholder={t.recipientsPlaceholder} type="text" value={recipients} /></div><small>{t.recipientsHint}</small></label>
            <label><span>{t.message}</span><textarea maxLength={1_500} onChange={(event) => setNote(event.target.value)} placeholder={t.messagePlaceholder} rows={3} value={note} /></label>
            <label className={`share-upload ${blindMode ? "share-upload--disabled" : ""}`}>
              <input accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" disabled={blindMode} onChange={(event) => setResume(event.target.files?.[0] ?? null)} type="file" />
              <FileUp size={19} /><span><strong>{t.attachment}</strong><small>{resume?.name || t.choose}</small></span>
            </label>
            <p className="share-upload-hint">{blindMode ? t.blindAttachment : t.attachmentHint}</p>
            <div className="share-security"><ShieldCheck size={16} /><span>{t.security}</span></div>
            {state === "error" ? <p className="form-error" role="alert">{error || t.error}</p> : null}
            <footer className="share-form__actions">
              <button className="button button--ghost" onClick={onClose} type="button">{t.cancel}</button>
              <button className="button button--dark" disabled={state === "creating"} type="submit"><Clock3 size={16} />{state === "creating" ? t.creating : t.create}</button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
}

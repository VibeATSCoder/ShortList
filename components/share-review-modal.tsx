"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Clock3,
  Copy,
  ExternalLink,
  FileUp,
  Link2,
  Mail,
  Plus,
  Search,
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
    recipientsPlaceholder: "Select reviewers",
    recipientsHint: "Choose up to five approved reviewers. Each person receives a private link.",
    reviewerSearch: "Search reviewers",
    reviewerEmpty: "No matching reviewers.",
    reviewerSelected: (count: number) => `${count} selected`,
    reviewerDirectoryLoading: "Loading reviewer directory…",
    reviewerDirectorySignIn: "Sign in to select or add reviewer emails.",
    reviewerProRequired: "Reviewer email workflows are available on the Pro plan.",
    signIn: "Sign in",
    addReviewer: "Add reviewer",
    addReviewerTitle: "New reviewer",
    reviewerName: "Name (optional)",
    reviewerEmail: "Email address",
    reviewerAdding: "Adding…",
    reviewerAdded: "Reviewer saved and selected.",
    reviewerAddError: "The reviewer could not be added.",
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
    emailFailed: "The review link was created, but email delivery failed. Copy the secure link or try again.",
    noRecipients: "No reviewer email was added. The secure link is ready to copy.",
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
    recipientsPlaceholder: "انتخاب بررسی‌کنندگان",
    recipientsHint: "حداکثر پنج بررسی‌کننده تأییدشده انتخاب کنید. برای هر نفر یک پیوند خصوصی ارسال می‌شود.",
    reviewerSearch: "جستجوی بررسی‌کننده",
    reviewerEmpty: "بررسی‌کننده‌ای پیدا نشد.",
    reviewerSelected: (count: number) => `${count} نفر انتخاب شده`,
    reviewerDirectoryLoading: "در حال دریافت فهرست بررسی‌کنندگان…",
    reviewerDirectorySignIn: "برای انتخاب یا افزودن ایمیل بررسی‌کننده وارد شوید.",
    reviewerProRequired: "گردش‌کار ایمیل بررسی‌کنندگان در طرح حرفه‌ای فعال است.",
    signIn: "ورود",
    addReviewer: "افزودن بررسی‌کننده",
    addReviewerTitle: "بررسی‌کننده جدید",
    reviewerName: "نام (اختیاری)",
    reviewerEmail: "نشانی ایمیل",
    reviewerAdding: "در حال افزودن…",
    reviewerAdded: "بررسی‌کننده ذخیره و انتخاب شد.",
    reviewerAddError: "افزودن بررسی‌کننده ممکن نبود.",
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
    emailFailed: "پیوند بررسی ساخته شد، اما ارسال ایمیل ناموفق بود. پیوند امن را کپی کنید یا دوباره تلاش کنید.",
    noRecipients: "ایمیل بررسی‌کننده‌ای وارد نشده است. پیوند امن آماده کپی است.",
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
  emailsFailed: number;
  emailsRequested: number;
  resumeIncluded: boolean;
}

interface ReviewerContact {
  id: string | null;
  name: string;
  email: string;
  source: "directory" | "configured";
}

function csrfToken(): string {
  return decodeURIComponent(
    document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("shortlist_csrf="))
      ?.split("=")
      .slice(1)
      .join("=") ?? "",
  );
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
  const [reviewers, setReviewers] = useState<ReviewerContact[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [reviewersState, setReviewersState] = useState<"loading" | "ready" | "signed-out" | "locked" | "error">("loading");
  const [canAddReviewer, setCanAddReviewer] = useState(false);
  const [reviewerPickerOpen, setReviewerPickerOpen] = useState(false);
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [addingReviewer, setAddingReviewer] = useState(false);
  const [newReviewerName, setNewReviewerName] = useState("");
  const [newReviewerEmail, setNewReviewerEmail] = useState("");
  const [reviewerMessage, setReviewerMessage] = useState("");
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

  useEffect(() => {
    let active = true;
    async function loadReviewers() {
      try {
        const response = await fetch("/api/reviewers", { headers: { Accept: "application/json" } });
        if (!active) return;
        if (response.status === 401) {
          setReviewersState("signed-out");
          return;
        }
        if (response.status === 403) {
          setReviewersState("locked");
          return;
        }
        const payload = (await response.json()) as {
          reviewers?: ReviewerContact[];
          canAdd?: boolean;
          requesterName?: string;
        };
        if (!response.ok || !payload.reviewers) throw new Error("REVIEWER_DIRECTORY_FAILED");
        setReviewers(payload.reviewers);
        setCanAddReviewer(Boolean(payload.canAdd));
        setRequesterName((current) => current || payload.requesterName || "");
        setReviewersState("ready");
      } catch {
        if (active) setReviewersState("error");
      }
    }
    void loadReviewers();
    return () => { active = false; };
  }, []);

  const visibleReviewers = reviewers.filter((reviewer) => {
    const query = reviewerSearch.trim().toLowerCase();
    return !query || reviewer.name.toLowerCase().includes(query) || reviewer.email.includes(query);
  });

  function toggleReviewer(email: string) {
    setSelectedRecipients((current) =>
      current.includes(email)
        ? current.filter((item) => item !== email)
        : current.length < 5
          ? [...current, email]
          : current,
    );
  }

  async function addReviewer() {
    if (!newReviewerEmail.trim() || addingReviewer) return;
    setAddingReviewer(true);
    setReviewerMessage("");
    try {
      const response = await fetch("/api/reviewers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken(),
        },
        body: JSON.stringify({ name: newReviewerName, email: newReviewerEmail }),
      });
      const payload = (await response.json()) as { reviewer?: ReviewerContact; error?: { message?: string } };
      if (!response.ok || !payload.reviewer) throw new Error(payload.error?.message || t.reviewerAddError);
      const reviewer = payload.reviewer;
      setReviewers((current) => [reviewer, ...current.filter((item) => item.email !== reviewer.email)]);
      setSelectedRecipients((current) =>
        current.includes(reviewer.email) ? current : [...current, reviewer.email].slice(0, 5),
      );
      setNewReviewerName("");
      setNewReviewerEmail("");
      setReviewerMessage(t.reviewerAdded);
    } catch (reason) {
      setReviewerMessage(reason instanceof Error ? reason.message : t.reviewerAddError);
    } finally {
      setAddingReviewer(false);
    }
  }

  async function createReview(event: React.FormEvent) {
    event.preventDefault();
    setState("creating");
    setError("");
    try {
      const form = new FormData();
      form.set(
        "payload",
        JSON.stringify({
          candidate,
          job,
          locale,
          blindMode,
          requesterName,
          recipients: selectedRecipients,
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
              <Mail size={15} />{
                result.emailsSent
                  ? t.emailed(result.emailsSent)
                  : result.emailsFailed
                    ? t.emailFailed
                    : result.emailsRequested === 0
                      ? t.noRecipients
                      : t.linkOnly
              }
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
            <div className="reviewer-field">
              <span className="reviewer-field__label">{t.recipients}</span>
              {reviewersState === "signed-out" ? (
                <div className="reviewer-access-note"><Mail size={16} /><span>{t.reviewerDirectorySignIn}</span><a href="/login">{t.signIn}</a></div>
              ) : reviewersState === "locked" ? (
                <div className="reviewer-access-note"><ShieldCheck size={16} /><span>{t.reviewerProRequired}</span><strong>PRO</strong></div>
              ) : (
                <div className="reviewer-picker">
                  <button
                    aria-expanded={reviewerPickerOpen}
                    className="reviewer-picker__trigger"
                    disabled={reviewersState === "loading"}
                    onClick={() => setReviewerPickerOpen((open) => !open)}
                    type="button"
                  >
                    <Mail size={16} />
                    <span>{reviewersState === "loading" ? t.reviewerDirectoryLoading : selectedRecipients.length ? t.reviewerSelected(selectedRecipients.length) : t.recipientsPlaceholder}</span>
                    <ChevronDown className={reviewerPickerOpen ? "is-open" : ""} size={16} />
                  </button>
                  {reviewerPickerOpen ? (
                    <div className="reviewer-picker__menu">
                      <div className="reviewer-picker__search"><Search size={15} /><input aria-label={t.reviewerSearch} onChange={(event) => setReviewerSearch(event.target.value)} placeholder={t.reviewerSearch} value={reviewerSearch} /></div>
                      <div className="reviewer-picker__options">
                        {visibleReviewers.length ? visibleReviewers.map((reviewer) => {
                          const selected = selectedRecipients.includes(reviewer.email);
                          return (
                            <button aria-pressed={selected} className={`reviewer-option ${selected ? "is-selected" : ""}`} key={reviewer.email} onClick={() => toggleReviewer(reviewer.email)} type="button">
                              <span className="reviewer-option__check">{selected ? <Check size={13} /> : null}</span>
                              <span><strong>{reviewer.name}</strong><small dir="ltr">{reviewer.email}</small></span>
                            </button>
                          );
                        }) : <p className="reviewer-picker__empty">{t.reviewerEmpty}</p>}
                      </div>
                      {canAddReviewer ? (
                        <div className="reviewer-add">
                          <strong><Plus size={14} />{t.addReviewerTitle}</strong>
                          <div className="reviewer-add__fields">
                            <input maxLength={160} onChange={(event) => setNewReviewerName(event.target.value)} placeholder={t.reviewerName} value={newReviewerName} />
                            <input dir="ltr" maxLength={254} onChange={(event) => setNewReviewerEmail(event.target.value)} placeholder={t.reviewerEmail} type="email" value={newReviewerEmail} />
                          </div>
                          <button className="reviewer-add__button" disabled={addingReviewer || !newReviewerEmail.trim()} onClick={addReviewer} type="button"><Plus size={14} />{addingReviewer ? t.reviewerAdding : t.addReviewer}</button>
                          {reviewerMessage ? <small className="reviewer-add__message" role="status">{reviewerMessage}</small> : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}
              {reviewersState === "error" ? <small className="form-error">{t.reviewerAddError}</small> : <small>{t.recipientsHint}</small>}
            </div>
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

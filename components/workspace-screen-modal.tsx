"use client";

import {
  CheckCircle2,
  CircleAlert,
  FileSearch,
  LoaderCircle,
  LockKeyhole,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { localizeApiError, type Locale } from "@/lib/i18n";
import { MAX_RAW_RESUME_BYTES } from "@/lib/limits";
import type { ApiErrorResponse, ScreeningResponse } from "@/lib/types";
import type { PositionSummary } from "@/lib/workspace-types";

type ResumeMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain"
  | "text/markdown";

interface ReviewerContact {
  id: string | null;
  name: string;
  email: string;
}

const copy = {
  en: {
    eyebrow: "Sealed AI intake",
    title: "Screen for this position",
    intro: "The selected job ad is the scoring source. The server seals the result before the database accepts it, so browser-edited scores cannot enter the pipeline.",
    resume: "Candidate résumé",
    choose: "Choose PDF, DOCX, TXT, or MD",
    email: "Candidate email (optional)",
    candidateEmailHint: "If provided, the candidate receives an automatic application-received confirmation.",
    reviewer: "Notify reviewer (optional)",
    reviewerDefault: "HR notification only",
    reviewerLoading: "Loading approved reviewers...",
    reviewerHint: "The selected reviewer receives the same CV notification as HR.",
    addReviewer: "Add reviewer",
    reviewerName: "Reviewer name",
    reviewerEmail: "Reviewer email",
    reviewerAdded: "Reviewer added and selected.",
    reviewerError: "The reviewer could not be added.",
    source: "Application source",
    direct: "Direct",
    referral: "Referral",
    linkedin: "LinkedIn",
    career: "Career page",
    cancel: "Cancel",
    run: "Screen & add to pipeline",
    reading: "Reading résumé…",
    screening: "Running evidence assessment…",
    importing: "Verifying seal and saving…",
    success: "Candidate added to this position with an immutable assessment snapshot.",
    candidateConfirmed: "Candidate confirmation sent",
    internalNotified: "HR / reviewer notifications sent",
    resumeSaved: "Private resume saved for side-by-side review",
    missing: "Choose a résumé first.",
    unsupported: "Use a PDF, DOCX, TXT, or Markdown résumé.",
    tooLarge: "The résumé must be 3 MiB or smaller.",
    sealMissing: "Assessment sealing is not configured. Add ASSESSMENT_SEAL_SECRET and restart the app.",
    aiMissing: "Live AI is not configured for this workspace.",
    privacy: "The resume is stored privately for authenticated review and retained for 180 days. It is never exposed through a public file URL.",
    close: "Close",
  },
  fa: {
    eyebrow: "ورودی مهرشده هوش مصنوعی",
    title: "ارزیابی برای این موقعیت",
    intro: "آگهی شغلی انتخاب‌شده مبنای امتیازدهی است. سرور نتیجه را پیش از پذیرش در MySQL امضا می‌کند تا امتیاز ویرایش‌شده در مرورگر وارد فرایند نشود.",
    resume: "رزومه داوطلب",
    choose: "انتخاب PDF، DOCX، TXT یا MD",
    email: "ایمیل داوطلب (اختیاری)",
    candidateEmailHint: "در صورت ثبت ایمیل، تأیید دریافت درخواست به‌صورت خودکار برای داوطلب ارسال می‌شود.",
    reviewer: "اطلاع‌رسانی به بررسی‌کننده (اختیاری)",
    reviewerDefault: "فقط اطلاع‌رسانی منابع انسانی",
    reviewerLoading: "در حال دریافت بررسی‌کنندگان تأییدشده...",
    reviewerHint: "بررسی‌کننده انتخاب‌شده همان اعلان رزومه منابع انسانی را دریافت می‌کند.",
    addReviewer: "افزودن بررسی‌کننده",
    reviewerName: "نام بررسی‌کننده",
    reviewerEmail: "ایمیل بررسی‌کننده",
    reviewerAdded: "بررسی‌کننده افزوده و انتخاب شد.",
    reviewerError: "افزودن بررسی‌کننده ممکن نبود.",
    source: "منبع درخواست",
    direct: "مستقیم",
    referral: "معرفی",
    linkedin: "لینکدین",
    career: "صفحه فرصت‌های شغلی",
    cancel: "انصراف",
    run: "ارزیابی و افزودن به فرایند",
    reading: "در حال خواندن رزومه…",
    screening: "در حال ارزیابی مستند…",
    importing: "در حال اعتبارسنجی و ذخیره…",
    success: "داوطلب با نسخه ثابت ارزیابی به این موقعیت افزوده شد.",
    candidateConfirmed: "تأیید دریافت برای داوطلب ارسال شد",
    internalNotified: "اعلان منابع انسانی / بررسی‌کننده ارسال شد",
    resumeSaved: "رزومه خصوصی برای بررسی هم‌زمان ذخیره شد",
    missing: "ابتدا یک رزومه انتخاب کنید.",
    unsupported: "از رزومه PDF، DOCX، TXT یا Markdown استفاده کنید.",
    tooLarge: "حجم رزومه باید حداکثر ۳ مگابایت باشد.",
    sealMissing: "امضای ارزیابی تنظیم نشده است. ASSESSMENT_SEAL_SECRET را اضافه و برنامه را بازراه‌اندازی کنید.",
    aiMissing: "هوش مصنوعی زنده برای این فضای cPanel تنظیم نشده است.",
    privacy: "رزومه برای بررسی احراز هویت‌شده به‌صورت خصوصی ذخیره و ۱۸۰ روز نگه‌داری می‌شود و هرگز پیوند عمومی فایل ندارد.",
    close: "بستن",
  },
} as const;

function inferMime(file: File): ResumeMime | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") return "application/pdf";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || extension === "docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (["text/markdown", "text/x-markdown"].includes(file.type) || extension === "md" || extension === "markdown") return "text/markdown";
  if (file.type === "text/plain" || extension === "txt") return "text/plain";
  return null;
}

function asDataUrl(file: File, mimeType: ResumeMime): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("FILE_READ_FAILED"));
    reader.onload = () => {
      const value = String(reader.result);
      const comma = value.indexOf(",");
      if (comma < 0) reject(new Error("FILE_READ_FAILED"));
      else resolve(`data:${mimeType};base64,${value.slice(comma + 1)}`);
    };
    reader.readAsDataURL(file);
  });
}

function csrfToken(): string {
  return decodeURIComponent(document.cookie.split("; ").find((entry) => entry.startsWith("shortlist_csrf="))?.split("=").slice(1).join("=") ?? "");
}

export function WorkspaceScreenModal({
  position,
  locale,
  aiReady,
  onClose,
  onImported,
}: {
  position: PositionSummary;
  locale: Locale;
  aiReady: boolean;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const t = copy[locale];
  const dialogRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const closeRef = useRef(onClose);
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Direct");
  const [reviewers, setReviewers] = useState<ReviewerContact[]>([]);
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [reviewerLoading, setReviewerLoading] = useState(true);
  const [reviewerFormOpen, setReviewerFormOpen] = useState(false);
  const [newReviewerName, setNewReviewerName] = useState("");
  const [newReviewerEmail, setNewReviewerEmail] = useState("");
  const [reviewerMessage, setReviewerMessage] = useState("");
  const [addingReviewer, setAddingReviewer] = useState(false);
  const [delivery, setDelivery] = useState<{ candidateAcknowledged: boolean; internalSent: number; resumeStored: boolean } | null>(null);
  const [status, setStatus] = useState<"idle" | "reading" | "screening" | "importing" | "success">("idle");
  const [error, setError] = useState("");
  const busy = status === "reading" || status === "screening" || status === "importing";

  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    let active = true;
    fetch("/api/reviewers", { headers: { Accept: "application/json" } })
      .then(async (response) => response.ok ? response.json() : { reviewers: [] })
      .then((payload: { reviewers?: ReviewerContact[] }) => {
        if (active) setReviewers(payload.reviewers ?? []);
      })
      .catch(() => undefined)
      .finally(() => { if (active) setReviewerLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) closeRef.current();
      if (event.key !== "Tab") return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", keydown);
    fileRef.current?.focus();
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);

  async function addReviewer() {
    if (!newReviewerEmail.trim() || addingReviewer) return;
    setAddingReviewer(true);
    setReviewerMessage("");
    try {
      const response = await fetch("/api/reviewers", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({ name: newReviewerName, email: newReviewerEmail }),
      });
      const payload = await response.json() as { reviewer?: ReviewerContact };
      if (!response.ok || !payload.reviewer) throw new Error("REVIEWER_SAVE_FAILED");
      setReviewers((current) => [payload.reviewer!, ...current.filter((item) => item.email !== payload.reviewer!.email)]);
      setReviewerEmail(payload.reviewer.email);
      setNewReviewerName("");
      setNewReviewerEmail("");
      setReviewerFormOpen(false);
      setReviewerMessage(t.reviewerAdded);
    } catch {
      setReviewerMessage(t.reviewerError);
    } finally {
      setAddingReviewer(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!aiReady) { setError(t.aiMissing); return; }
    if (!file) { setError(t.missing); return; }
    const mimeType = inferMime(file);
    if (!mimeType) { setError(t.unsupported); return; }
    if (file.size > MAX_RAW_RESUME_BYTES) { setError(t.tooLarge); return; }

    try {
      setStatus("reading");
      const dataUrl = await asDataUrl(file, mimeType);
      setStatus("screening");
      const screeningResponse = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          job: { title: position.title, description: position.description },
          resume: { fileName: file.name, mimeType, dataUrl },
        }),
      });
      const screeningPayload = (await screeningResponse.json().catch(() => null)) as ScreeningResponse | ApiErrorResponse | null;
      if (!screeningResponse.ok || !screeningPayload || !("result" in screeningPayload)) {
        const code = screeningPayload && "error" in screeningPayload ? screeningPayload.error.code : "SCREENING_FAILED";
        throw new Error(localizeApiError(code, locale));
      }
      if (!screeningPayload.workspaceSeal) throw new Error(t.sealMissing);

      setStatus("importing");
      const intakeResponse = await fetch("/api/workspace/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken() },
        body: JSON.stringify({
          positionId: position.id,
          assessment: screeningPayload.result,
          workspaceSeal: screeningPayload.workspaceSeal,
          candidateEmail: email.trim(),
          source,
          locale,
          reviewerEmails: reviewerEmail ? [reviewerEmail] : [],
          resume: { fileName: file.name, mimeType, dataUrl },
        }),
      });
      const intakePayload = await intakeResponse.json().catch(() => null) as {
        candidateAcknowledged?: boolean;
        internalSent?: number;
        resumeStored?: boolean;
        error?: { message?: string };
      } | null;
      if (!intakeResponse.ok) throw new Error(intakePayload?.error?.message || "ASSESSMENT_INTAKE_FAILED");
      setDelivery({
        candidateAcknowledged: Boolean(intakePayload?.candidateAcknowledged),
        internalSent: Number(intakePayload?.internalSent ?? 0),
        resumeStored: Boolean(intakePayload?.resumeStored),
      });
      await onImported();
      setStatus("success");
    } catch (reason) {
      setStatus("idle");
      setError(reason instanceof Error ? reason.message : "ASSESSMENT_INTAKE_FAILED");
    }
  }

  const progress = status === "reading" ? t.reading : status === "screening" ? t.screening : status === "importing" ? t.importing : "";
  return (
    <div className="modal-backdrop ws-modal-backdrop" role="presentation">
      <section aria-labelledby="workspace-screen-title" aria-modal="true" className="ws-create-modal ws-screen-modal" ref={dialogRef} role="dialog">
        <header>
          <div><span className="ws-kicker"><FileSearch aria-hidden="true" size={13} />{t.eyebrow}</span><h2 id="workspace-screen-title">{t.title}</h2><p>{t.intro}</p></div>
          <button aria-label={t.close} className="icon-button" disabled={busy} onClick={onClose} type="button"><X size={19} /></button>
        </header>
        {status === "success" ? (
          <div className="ws-screen-success"><CheckCircle2 aria-hidden="true" size={28} /><strong>{t.success}</strong>{delivery ? <div className="ws-screen-success__details">{delivery.resumeStored ? <span><CheckCircle2 size={14} />{t.resumeSaved}</span> : null}{delivery.candidateAcknowledged ? <span><CheckCircle2 size={14} />{t.candidateConfirmed}</span> : null}{delivery.internalSent ? <span><CheckCircle2 size={14} />{t.internalNotified}: {delivery.internalSent}</span> : null}</div> : null}<button className="button button--dark" onClick={onClose} type="button">{t.close}</button></div>
        ) : (
          <form onSubmit={submit}>
            <button className={`ws-resume-drop ${file ? "has-file" : ""}`} disabled={busy} onClick={() => fileRef.current?.click()} type="button">
              {file ? <CheckCircle2 aria-hidden="true" size={22} /> : <UploadCloud aria-hidden="true" size={22} />}
              <span><strong className="bidi-isolate" dir="auto">{file?.name ?? t.resume}</strong><small>{file ? `${Math.ceil(file.size / 1024)} KB` : t.choose}</small></span>
            </button>
            <input accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" className="visually-hidden" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} ref={fileRef} type="file" />
            <div className="ws-form-grid">
              <label><span>{t.email}</span><input autoComplete="email" dir="ltr" disabled={busy} maxLength={254} onChange={(event) => setEmail(event.target.value)} placeholder="candidate@example.com" type="email" value={email} /></label>
              <label><span>{t.source}</span><select disabled={busy} onChange={(event) => setSource(event.target.value)} value={source}><option value="Direct">{t.direct}</option><option value="Referral">{t.referral}</option><option value="LinkedIn">{t.linkedin}</option><option value="Career page">{t.career}</option></select></label>
            </div>
            <small className="ws-field-hint">{t.candidateEmailHint}</small>
            <div className="ws-intake-reviewer">
              <label><span>{t.reviewer}</span><select disabled={busy || reviewerLoading} onChange={(event) => setReviewerEmail(event.target.value)} value={reviewerEmail}><option value="">{reviewerLoading ? t.reviewerLoading : t.reviewerDefault}</option>{reviewers.map((reviewer) => <option key={reviewer.email} value={reviewer.email}>{reviewer.name} · {reviewer.email}</option>)}</select></label>
              <div className="ws-intake-reviewer__meta"><small>{t.reviewerHint}</small><button className="button button--subtle" disabled={busy} onClick={() => setReviewerFormOpen((open) => !open)} type="button">{t.addReviewer}</button></div>
              {reviewerFormOpen ? <div className="ws-intake-reviewer__add"><input disabled={busy} maxLength={160} onChange={(event) => setNewReviewerName(event.target.value)} placeholder={t.reviewerName} value={newReviewerName} /><input dir="ltr" disabled={busy} maxLength={254} onChange={(event) => setNewReviewerEmail(event.target.value)} placeholder={t.reviewerEmail} type="email" value={newReviewerEmail} /><button className="button button--dark" disabled={addingReviewer || !newReviewerEmail.trim()} onClick={addReviewer} type="button">{addingReviewer ? t.reviewerLoading : t.addReviewer}</button></div> : null}
              {reviewerMessage ? <small className="ws-intake-reviewer__message" role="status">{reviewerMessage}</small> : null}
            </div>
            <p className="ws-screen-privacy"><LockKeyhole aria-hidden="true" size={15} />{t.privacy}</p>
            {!aiReady ? <p className="form-error" role="alert"><CircleAlert aria-hidden="true" size={15} />{t.aiMissing}</p> : null}
            {error ? <p className="form-error" role="alert"><CircleAlert aria-hidden="true" size={15} />{error}</p> : null}
            {progress ? <p className="ws-screen-progress" role="status"><LoaderCircle aria-hidden="true" className="spin" size={17} />{progress}</p> : null}
            <footer><button className="button button--ghost" disabled={busy} onClick={onClose} type="button">{t.cancel}</button><button className="button button--dark" disabled={busy || !aiReady} type="submit"><FileSearch aria-hidden="true" size={16} />{t.run}</button></footer>
          </form>
        )}
      </section>
    </div>
  );
}

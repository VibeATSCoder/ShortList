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

const copy = {
  en: {
    eyebrow: "Sealed AI intake",
    title: "Screen for this position",
    intro: "The selected job ad is the scoring source. The server seals the result before MySQL accepts it, so browser-edited scores cannot enter the pipeline.",
    resume: "Candidate résumé",
    choose: "Choose PDF, DOCX, TXT, or MD",
    email: "Candidate email (optional)",
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
    missing: "Choose a résumé first.",
    unsupported: "Use a PDF, DOCX, TXT, or Markdown résumé.",
    tooLarge: "The résumé must be 3 MiB or smaller.",
    sealMissing: "Assessment sealing is not configured. Add ASSESSMENT_SEAL_SECRET and restart the app.",
    aiMissing: "Live AI is not configured for this cPanel workspace.",
    privacy: "The résumé is processed for this request and is not persisted by this intake. Only the sealed assessment and candidate email are stored.",
    close: "Close",
  },
  fa: {
    eyebrow: "ورودی مهرشده هوش مصنوعی",
    title: "ارزیابی برای این موقعیت",
    intro: "آگهی شغلی انتخاب‌شده مبنای امتیازدهی است. سرور نتیجه را پیش از پذیرش در MySQL امضا می‌کند تا امتیاز ویرایش‌شده در مرورگر وارد فرایند نشود.",
    resume: "رزومه داوطلب",
    choose: "انتخاب PDF، DOCX، TXT یا MD",
    email: "ایمیل داوطلب (اختیاری)",
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
    missing: "ابتدا یک رزومه انتخاب کنید.",
    unsupported: "از رزومه PDF، DOCX، TXT یا Markdown استفاده کنید.",
    tooLarge: "حجم رزومه باید حداکثر ۳ مگابایت باشد.",
    sealMissing: "امضای ارزیابی تنظیم نشده است. ASSESSMENT_SEAL_SECRET را اضافه و برنامه را بازراه‌اندازی کنید.",
    aiMissing: "هوش مصنوعی زنده برای این فضای cPanel تنظیم نشده است.",
    privacy: "رزومه فقط برای این درخواست پردازش و در این ورودی ذخیره نمی‌شود؛ فقط ارزیابی مهرشده و ایمیل داوطلب نگه‌داری می‌شود.",
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
  const [status, setStatus] = useState<"idle" | "reading" | "screening" | "importing" | "success">("idle");
  const [error, setError] = useState("");
  const busy = status === "reading" || status === "screening" || status === "importing";

  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

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
          resume: { fileName: file.name, mimeType, dataUrl },
        }),
      });
      const intakePayload = await intakeResponse.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!intakeResponse.ok) throw new Error(intakePayload?.error?.message || "ASSESSMENT_INTAKE_FAILED");
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
          <div className="ws-screen-success"><CheckCircle2 aria-hidden="true" size={28} /><strong>{t.success}</strong><button className="button button--dark" onClick={onClose} type="button">{t.close}</button></div>
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

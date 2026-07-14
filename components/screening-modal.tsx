"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";

import { useLocale } from "@/components/locale-provider";
import {
  formatNumber,
  localizeApiError,
} from "@/lib/i18n";
import { MAX_RAW_RESUME_BYTES, MAX_RESUMES_PER_BATCH } from "@/lib/limits";
import type {
  ApiErrorResponse,
  JobProfile,
  ScreeningResponse,
  ScreeningResult,
} from "@/lib/types";

type UploadStatus = "queued" | "reading" | "screening" | "done" | "error";

interface UploadItem {
  key: string;
  file: File;
  mimeType: "application/pdf" | "text/plain" | "text/markdown";
  status: UploadStatus;
  error?: string;
}

function itemKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function inferMimeType(
  file: File,
): UploadItem["mimeType"] | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") {
    return "application/pdf";
  }
  if (
    file.type === "text/markdown" ||
    file.type === "text/x-markdown" ||
    extension === "md" ||
    extension === "markdown"
  ) {
    return "text/markdown";
  }
  if (file.type === "text/plain" || extension === "txt") {
    return "text/plain";
  }
  return null;
}

class UserFacingScreeningError extends Error {}

function readAsDataUrl(
  file: File,
  mimeType: UploadItem["mimeType"],
  errorMessage: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const encoded = String(reader.result);
      const separator = encoded.indexOf(",");
      if (separator === -1) {
        reject(new UserFacingScreeningError(errorMessage));
        return;
      }
      resolve(`data:${mimeType};base64,${encoded.slice(separator + 1)}`);
    };
    reader.onerror = () => reject(new UserFacingScreeningError(errorMessage));
    reader.readAsDataURL(file);
  });
}

export function ScreeningModal({
  job,
  aiConfigured,
  model,
  onClose,
  onComplete,
}: {
  job: JobProfile;
  aiConfigured: boolean;
  model: string;
  onClose: () => void;
  onComplete: (job: JobProfile, results: ScreeningResult[]) => void;
}) {
  const { copy, locale } = useLocale();
  const modalCopy = copy.screeningModal;
  const [draftJob, setDraftJob] = useState(job);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const isSubmittingRef = useRef(isSubmitting);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmittingRef.current) onCloseRef.current();
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter(
        (element) =>
          !element.hasAttribute("hidden") && element.getClientRects().length > 0,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);
    dialogRef.current?.querySelector<HTMLElement>("[data-modal-autofocus]")?.focus();
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
      restoreFocusRef.current?.focus();
    };
  }, []);

  function addFiles(fileList: FileList | File[]) {
    setFormError(null);
    setIsComplete(false);
    const incoming = Array.from(fileList);
    const next: UploadItem[] = [];

    for (const file of incoming) {
      if (items.length + next.length >= MAX_RESUMES_PER_BATCH) {
        setFormError(modalCopy.maxBatchError);
        break;
      }
      const mimeType = inferMimeType(file);
      if (!mimeType) {
        setFormError(modalCopy.unsupportedFileError(file.name));
        continue;
      }
      if (file.size > MAX_RAW_RESUME_BYTES) {
        setFormError(modalCopy.fileTooLargeError(file.name));
        continue;
      }
      const key = itemKey(file);
      if (items.some((item) => item.key === key) || next.some((item) => item.key === key)) {
        continue;
      }
      next.push({ key, file, mimeType, status: "queued" });
    }

    setItems((current) => [...current, ...next]);
  }

  function updateItem(key: string, update: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...update } : item)),
    );
  }

  async function screenItem(item: UploadItem): Promise<ScreeningResult | null> {
    try {
      updateItem(item.key, { status: "reading", error: undefined });
      const dataUrl = await readAsDataUrl(
        item.file,
        item.mimeType,
        modalCopy.fileReadError,
      );
      updateItem(item.key, { status: "screening" });

      const response = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          job: draftJob,
          resume: {
            fileName: item.file.name,
            mimeType: item.mimeType,
            dataUrl,
          },
        }),
      });

      let payload: ScreeningResponse | ApiErrorResponse;
      try {
        payload = (await response.json()) as ScreeningResponse | ApiErrorResponse;
      } catch {
        throw new UserFacingScreeningError(modalCopy.invalidResponseError);
      }
      if (!response.ok || !("result" in payload)) {
        const message = "error" in payload
          ? localizeApiError(payload.error.code, locale)
          : modalCopy.invalidResponseError;
        throw new UserFacingScreeningError(message);
      }

      updateItem(item.key, { status: "done" });
      return payload.result;
    } catch (error) {
      updateItem(item.key, {
        status: "error",
        error:
          error instanceof UserFacingScreeningError
            ? error.message
            : modalCopy.screeningFailedError,
      });
      return null;
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!aiConfigured) {
      setFormError(modalCopy.aiKeyError);
      return;
    }
    if (draftJob.title.trim().length < 2) {
      setFormError(modalCopy.jobTitleError);
      return;
    }
    if (draftJob.description.trim().length < 80) {
      setFormError(modalCopy.jobDescriptionError);
      return;
    }
    if (!items.length) {
      setFormError(modalCopy.resumeRequiredError);
      return;
    }

    setIsSubmitting(true);
    setIsComplete(false);
    const queue = items.filter((item) => item.status !== "done");
    let cursor = 0;
    const results: ScreeningResult[] = [];

    async function worker() {
      while (cursor < queue.length) {
        const current = queue[cursor];
        cursor += 1;
        const result = await screenItem(current);
        if (result) results.push(result);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(2, queue.length) }, () => worker()),
    );
    if (results.length) {
      onComplete(draftJob, results);
      setIsComplete(true);
    } else {
      setFormError(modalCopy.screeningFailedError);
      setIsComplete(false);
    }
    setIsSubmitting(false);
  }

  const completed = items.filter((item) => item.status === "done").length;

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
      role="presentation"
    >
      <section
        aria-busy={isSubmitting}
        aria-labelledby="screening-title"
        aria-modal="true"
        className="screening-modal"
        ref={dialogRef}
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <span className="section-kicker">{modalCopy.newScreeningRun}</span>
            <h2 id="screening-title">{modalCopy.title}</h2>
            <p>{modalCopy.description}</p>
          </div>
          <button
            aria-label={modalCopy.closeDialog}
            className="icon-button"
            data-modal-autofocus
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-column">
              <div className="form-section-heading">
                <span>{formatNumber(1, locale, { minimumIntegerDigits: 2 })}</span>
                <div>
                  <strong>{modalCopy.defineTarget}</strong>
                  <p>{modalCopy.defineTargetDescription}</p>
                </div>
              </div>
              <label className="field">
                <span>{modalCopy.jobTitle}</span>
                <input
                  disabled={isSubmitting}
                  maxLength={120}
                  onChange={(event) =>
                    setDraftJob((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder={modalCopy.jobTitlePlaceholder}
                  value={draftJob.title}
                />
              </label>
              <label className="field field--grow">
                <span>
                  {modalCopy.jobDescription}
                  <small>{formatNumber(draftJob.description.length, locale)} / {formatNumber(20_000, locale)}</small>
                </span>
                <textarea
                  disabled={isSubmitting}
                  maxLength={20_000}
                  onChange={(event) =>
                    setDraftJob((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  value={draftJob.description}
                />
              </label>
              <div className="rubric-preview">
                <span>{modalCopy.fixedRubric}</span>
                <div>
                  <i style={{ width: "30%" }}>{modalCopy.skills} {formatNumber(30, locale)}</i>
                  <i style={{ width: "20%" }}>{modalCopy.experience} {formatNumber(20, locale)}</i>
                  <i style={{ width: "20%" }}>{modalCopy.impact} {formatNumber(20, locale)}</i>
                  <i style={{ width: "15%" }}>{modalCopy.ownership} {formatNumber(15, locale)}</i>
                  <i style={{ width: "10%" }}>{modalCopy.context} {formatNumber(10, locale)}</i>
                  <i style={{ width: "5%" }}>{formatNumber(5, locale)}</i>
                </div>
              </div>
            </div>

            <div className="modal-column">
              <div className="form-section-heading">
                <span>{formatNumber(2, locale, { minimumIntegerDigits: 2 })}</span>
                <div>
                  <strong>{modalCopy.addCandidateEvidence}</strong>
                  <p>{modalCopy.fileConstraints}</p>
                </div>
              </div>

              <button
                className={`dropzone ${isDragging ? "dropzone--active" : ""}`}
                disabled={isSubmitting || items.length >= MAX_RESUMES_PER_BATCH}
                onClick={() => fileInputRef.current?.click()}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  addFiles(event.dataTransfer.files);
                }}
                type="button"
              >
                <span className="dropzone__icon">
                  <UploadCloud aria-hidden="true" size={24} />
                </span>
                <strong>{modalCopy.dropResumes}</strong>
                <p>{modalCopy.chooseFiles}</p>
              </button>
              <input
                accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown,text/x-markdown"
                className="visually-hidden"
                multiple
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                  event.target.value = "";
                }}
                ref={fileInputRef}
                tabIndex={-1}
                type="file"
              />

              <div className="upload-list" aria-live="polite">
                {items.length ? (
                  items.map((item) => (
                    <article className="upload-item" key={item.key}>
                      <span className="upload-item__icon">
                        <FileText aria-hidden="true" size={17} />
                      </span>
                      <div>
                        <strong className="bidi-isolate" dir="auto">{item.file.name}</strong>
                        <p>
                          {formatNumber(Math.ceil(item.file.size / 1024), locale)} KB
                          {item.status === "reading" || item.status === "screening"
                            ? ` · ${modalCopy.screening}`
                            : item.status === "done"
                              ? ` · ${modalCopy.done}`
                              : item.status === "error"
                                ? ` · ${modalCopy.failed}`
                                : ""}
                          {item.error ? ` · ${item.error}` : ""}
                        </p>
                      </div>
                      {item.status === "reading" || item.status === "screening" ? (
                        <LoaderCircle
                          aria-label={modalCopy.screening}
                          className="spin"
                          size={18}
                        />
                      ) : item.status === "done" ? (
                        <CheckCircle2
                          aria-label={modalCopy.done}
                          className="upload-state upload-state--done"
                          size={18}
                        />
                      ) : item.status === "error" ? (
                        <AlertCircle
                          aria-label={modalCopy.failed}
                          className="upload-state upload-state--error"
                          size={18}
                        />
                      ) : (
                        <button
                          aria-label={modalCopy.removeFile(item.file.name)}
                          className="icon-button icon-button--small"
                          onClick={() =>
                            setItems((current) =>
                              current.filter((candidate) => candidate.key !== item.key),
                            )
                          }
                          type="button"
                        >
                          <X aria-hidden="true" size={15} />
                        </button>
                      )}
                    </article>
                  ))
                ) : (
                  <div className="upload-empty">
                    <FileText aria-hidden="true" size={18} />
                    <span>{modalCopy.emptyBatch}</span>
                  </div>
                )}
              </div>

              <div className={`ai-readiness ${aiConfigured ? "ai-readiness--ready" : ""}`}>
                {aiConfigured ? (
                  <Sparkles aria-hidden="true" size={17} />
                ) : (
                  <LockKeyhole aria-hidden="true" size={17} />
                )}
                <div>
                  <strong>{aiConfigured ? copy.dashboard.liveAiReady : modalCopy.seededDemoMode}</strong>
                  <p>
                    {aiConfigured
                      ? modalCopy.readyDescription(model)
                      : modalCopy.unconfiguredDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <footer className="modal-footer">
            <div aria-live="assertive">
              {formError ? (
                <span className="form-error">
                  <AlertCircle aria-hidden="true" size={15} />
                  {formError}
                </span>
              ) : isComplete ? (
                <span className="form-success">
                  <CheckCircle2 aria-hidden="true" size={15} />
                  {modalCopy.completedCount(completed)}
                </span>
              ) : (
                <span className="privacy-inline">
                  <LockKeyhole aria-hidden="true" size={14} />
                  {modalCopy.rawResumesNotPersisted}
                </span>
              )}
            </div>
            <div className="modal-footer__actions">
              <button
                className="button button--ghost"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
              >
                {isComplete ? modalCopy.viewShortlist : copy.common.cancel}
              </button>
              {!isComplete ? (
                <button
                  className="button button--accent"
                  disabled={isSubmitting || !aiConfigured}
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <LoaderCircle aria-hidden="true" className="spin" size={16} />
                      {modalCopy.screeningRemaining(Math.max(1, items.length - completed))}
                    </>
                  ) : (
                    <>
                      <Sparkles aria-hidden="true" size={16} />
                      {modalCopy.screenCount(items.length)}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}

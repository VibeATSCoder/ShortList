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

import { MAX_FILE_BYTES } from "@/lib/assessment";
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
  if (file.type === "text/markdown" || extension === "md") {
    return "text/markdown";
  }
  if (file.type === "text/plain" || extension === "txt") {
    return "text/plain";
  }
  return null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read this file."));
    reader.readAsDataURL(file);
  });
}

export function ScreeningModal({
  job,
  aiConfigured,
  model,
  onClose,
  onJobChange,
  onResults,
}: {
  job: JobProfile;
  aiConfigured: boolean;
  model: string;
  onClose: () => void;
  onJobChange: (job: JobProfile) => void;
  onResults: (results: ScreeningResult[]) => void;
}) {
  const [draftJob, setDraftJob] = useState(job);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isSubmitting, onClose]);

  function addFiles(fileList: FileList | File[]) {
    setFormError(null);
    setIsComplete(false);
    const incoming = Array.from(fileList);
    const next: UploadItem[] = [];

    for (const file of incoming) {
      if (items.length + next.length >= 5) {
        setFormError("A screening batch can contain up to five resumes.");
        break;
      }
      const mimeType = inferMimeType(file);
      if (!mimeType) {
        setFormError(`${file.name} is not a supported PDF, TXT, or MD file.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        setFormError(`${file.name} is larger than the 5 MB limit.`);
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
      const dataUrl = await readAsDataUrl(item.file);
      updateItem(item.key, { status: "screening" });

      const response = await fetch("/api/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job: draftJob,
          resume: {
            fileName: item.file.name,
            mimeType: item.mimeType,
            dataUrl,
          },
        }),
      });

      const payload = (await response.json()) as ScreeningResponse | ApiErrorResponse;
      if (!response.ok || !("result" in payload)) {
        const message =
          "error" in payload
            ? payload.error.message
            : "The screening service returned an invalid response.";
        throw new Error(message);
      }

      updateItem(item.key, { status: "done" });
      return payload.result;
    } catch (error) {
      updateItem(item.key, {
        status: "error",
        error: error instanceof Error ? error.message : "Screening failed.",
      });
      return null;
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!aiConfigured) {
      setFormError("Live AI needs an OPENAI_API_KEY on the deployment.");
      return;
    }
    if (draftJob.title.trim().length < 2) {
      setFormError("Add a job title.");
      return;
    }
    if (draftJob.description.trim().length < 80) {
      setFormError("Add at least 80 characters of role context for a fair comparison.");
      return;
    }
    if (!items.length) {
      setFormError("Add at least one resume.");
      return;
    }

    setIsSubmitting(true);
    setIsComplete(false);
    onJobChange(draftJob);
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
    if (results.length) onResults(results);
    setIsSubmitting(false);
    setIsComplete(true);
  }

  const completed = items.filter((item) => item.status === "done").length;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        aria-labelledby="screening-title"
        aria-modal="true"
        className="screening-modal"
        role="dialog"
      >
        <header className="modal-header">
          <div>
            <span className="section-kicker">New screening run</span>
            <h2 id="screening-title">Turn resumes into evidence.</h2>
            <p>One rubric, up to five candidates, no server-side retention.</p>
          </div>
          <button
            aria-label="Close screening dialog"
            className="icon-button"
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
                <span>01</span>
                <div>
                  <strong>Define the target</strong>
                  <p>The same explicit criteria are applied to every resume.</p>
                </div>
              </div>
              <label className="field">
                <span>Job title</span>
                <input
                  disabled={isSubmitting}
                  maxLength={120}
                  onChange={(event) =>
                    setDraftJob((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Solo AI Builder"
                  value={draftJob.title}
                />
              </label>
              <label className="field field--grow">
                <span>
                  Job description
                  <small>{draftJob.description.length.toLocaleString()} / 20,000</small>
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
                <span>Fixed rubric</span>
                <div>
                  <i style={{ width: "30%" }}>Skills 30</i>
                  <i style={{ width: "20%" }}>Experience 20</i>
                  <i style={{ width: "20%" }}>Impact 20</i>
                  <i style={{ width: "15%" }}>Ownership 15</i>
                  <i style={{ width: "10%" }}>Context 10</i>
                  <i style={{ width: "5%" }}>5</i>
                </div>
              </div>
            </div>

            <div className="modal-column">
              <div className="form-section-heading">
                <span>02</span>
                <div>
                  <strong>Add candidate evidence</strong>
                  <p>PDF, TXT, or MD · 5 MB each · five files max</p>
                </div>
              </div>

              <button
                className={`dropzone ${isDragging ? "dropzone--active" : ""}`}
                disabled={isSubmitting || items.length >= 5}
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
                <strong>Drop resumes here</strong>
                <p>or click to choose files</p>
              </button>
              <input
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                className="visually-hidden"
                multiple
                onChange={(event) => {
                  if (event.target.files) addFiles(event.target.files);
                  event.target.value = "";
                }}
                ref={fileInputRef}
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
                        <strong>{item.file.name}</strong>
                        <p>
                          {(item.file.size / 1024).toFixed(0)} KB
                          {item.error ? ` · ${item.error}` : ""}
                        </p>
                      </div>
                      {item.status === "reading" || item.status === "screening" ? (
                        <LoaderCircle
                          aria-label="Screening"
                          className="spin"
                          size={18}
                        />
                      ) : item.status === "done" ? (
                        <CheckCircle2
                          aria-label="Done"
                          className="upload-state upload-state--done"
                          size={18}
                        />
                      ) : item.status === "error" ? (
                        <AlertCircle
                          aria-label="Failed"
                          className="upload-state upload-state--error"
                          size={18}
                        />
                      ) : (
                        <button
                          aria-label={`Remove ${item.file.name}`}
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
                    <span>Your batch is empty.</span>
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
                  <strong>{aiConfigured ? "Live AI ready" : "Seeded demo mode"}</strong>
                  <p>
                    {aiConfigured
                      ? `${model} · strict output · zero retention`
                      : "Add OPENAI_API_KEY to screen new resumes. The evaluation dashboard still works."}
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
                  {completed} {completed === 1 ? "assessment" : "assessments"} added
                </span>
              ) : (
                <span className="privacy-inline">
                  <LockKeyhole aria-hidden="true" size={14} />
                  Raw resumes are not persisted.
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
                {isComplete ? "View shortlist" : "Cancel"}
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
                      Screening {Math.max(1, items.length - completed)}…
                    </>
                  ) : (
                    <>
                      <Sparkles aria-hidden="true" size={16} />
                      Screen {items.length || "resumes"}
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


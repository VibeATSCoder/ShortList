"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock3,
  FileSearch,
  FileText,
  Fingerprint,
  GitBranch,
  LockKeyhole,
  MailCheck,
  Play,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  Workflow,
} from "lucide-react";

import { ScreeningModal } from "@/components/screening-modal";
import { DEMO_JOB } from "@/lib/demo-data";
import type { JobProfile, ScreeningResult } from "@/lib/types";

interface HealthStatus {
  aiConfigured: boolean;
  model: string;
  provider?: string;
}

const features = [
  {
    icon: FileSearch,
    title: "Evidence-backed screening",
    description: "Every score is tied to résumé evidence and a fixed 100-point rubric—not an unexplained AI opinion.",
  },
  {
    icon: GitBranch,
    title: "A real recruiter pipeline",
    description: "Screened candidates land in a position-based workspace with stages, decisions, search, and audit history.",
  },
  {
    icon: MailCheck,
    title: "Automatic team handoff",
    description: "A successful intake notifies the configured recruiter and includes the original résumé for immediate review.",
  },
  {
    icon: ShieldCheck,
    title: "Human decision control",
    description: "The model supports a decision; it never makes one. Blind review and role permissions keep people accountable.",
  },
];

export function LandingPage() {
  const [job, setJob] = useState<JobProfile>(DEMO_JOB);
  const [health, setHealth] = useState<HealthStatus>({
    aiConfigured: false,
    model: "openai/gpt-4o",
    provider: "openrouter",
  });
  const [intakeConfigured, setIntakeConfigured] = useState(false);
  const [screeningOpen, setScreeningOpen] = useState(false);
  const [completed, setCompleted] = useState<ScreeningResult | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/health", { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : null),
      fetch("/api/public-intake", { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() : null),
    ]).then(([healthPayload, intakePayload]) => {
      if (healthPayload) setHealth(healthPayload as HealthStatus);
      if (intakePayload?.enabled && intakePayload.job) {
        setJob(intakePayload.job as JobProfile);
        setIntakeConfigured(true);
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, []);

  function handleComplete(_: JobProfile, results: ScreeningResult[]) {
    setCompleted(results[0] ?? null);
  }

  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <Link aria-label="Shortlist home" className="landing-brand" href="/">
          <span aria-hidden="true">S<i /></span>
          <strong>Shortlist</strong>
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <a href="#build">48-hour build</a>
        </nav>
        <div className="landing-nav__actions">
          <Link className="landing-link" href="/login">Recruiter login</Link>
          <button className="landing-button landing-button--small" onClick={() => setScreeningOpen(true)} type="button">
            Screen a résumé
          </button>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <div className="landing-badge"><Sparkles size={14} /> Solo-built in 48 hours · live product</div>
            <h1>From résumé to <em>review-ready evidence</em> in seconds.</h1>
            <p>
              Shortlist turns a job description and résumé into a structured, explainable assessment—then moves the candidate into a recruiter workflow automatically.
            </p>
            <div className="landing-hero__actions">
              <button className="landing-button landing-button--primary" onClick={() => setScreeningOpen(true)} type="button">
                <UploadCloud size={18} /> Try live screening <ArrowRight size={17} />
              </button>
              <Link className="landing-button landing-button--ghost" href="/demo">
                <Play size={17} /> Explore the product demo
              </Link>
            </div>
            <div className="landing-trust">
              <span><Check size={14} /> PDF & DOCX</span>
              <span><Check size={14} /> Evidence citations</span>
              <span><Check size={14} /> Human-reviewed</span>
            </div>
          </div>

          <div aria-label="Shortlist assessment preview" className="landing-product-card">
            <div className="landing-product-card__top">
              <div><span className="landing-live-dot" /> Live assessment</div>
              <span>{health.aiConfigured ? "AI ready" : "Demo ready"}</span>
            </div>
            <div className="landing-file-row">
              <span><FileText size={20} /></span>
              <div><strong>candidate-resume.pdf</strong><small>Parsed · 2 pages · 100% quality</small></div>
              <CheckCircle2 size={19} />
            </div>
            <div className="landing-result">
              <div className="landing-score"><strong>87</strong><span>/100</span><small>role fit</small></div>
              <div><span className="landing-match">Strong match</span><h3>Evidence is ready for review.</h3><p>6 rubric dimensions · 4 strengths · 3 interview questions</p></div>
            </div>
            <div className="landing-evidence">
              <div><span>Core skills</span><strong>27/30</strong></div>
              <blockquote>“Built and deployed an AI workflow from concept to production.”</blockquote>
            </div>
            <div className="landing-product-card__footer"><LockKeyhole size={14} /> AI recommends. A recruiter decides.</div>
          </div>
        </section>

        <section aria-label="Product proof" className="landing-proof-strip">
          <div><strong>6</strong><span>weighted dimensions</span></div>
          <div><strong>4</strong><span>supported file types</span></div>
          <div><strong>100%</strong><span>traceable score</span></div>
          <div><strong>&lt; 20s</strong><span>typical assessment</span></div>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="landing-section__heading">
            <span>One clean workflow</span>
            <h2>Upload once. The rest is connected.</h2>
            <p>No prompt engineering, spreadsheet cleanup, or copying results between tools.</p>
          </div>
          <div className="landing-steps">
            <article><span>01</span><div className="landing-step-icon"><UploadCloud /></div><h3>Add the résumé</h3><p>The role is locked to recruiter-confirmed criteria. Upload PDF, DOCX, TXT, or Markdown.</p></article>
            <article><span>02</span><div className="landing-step-icon"><Fingerprint /></div><h3>Review grounded evidence</h3><p>AI extracts role evidence, scores a fixed rubric, flags gaps, and creates interview questions.</p></article>
            <article><span>03</span><div className="landing-step-icon"><Workflow /></div><h3>Continue in the pipeline</h3><p>The candidate is added to the panel and the recruiter receives an automatic notification.</p></article>
          </div>
        </section>

        <section className="landing-feature-section" id="features">
          <div className="landing-section__heading landing-section__heading--left">
            <span>More than an ATS checker</span>
            <h2>A working hiring loop, not a score generator.</h2>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ icon: Icon, title, description }) => (
              <article key={title}><span><Icon size={20} /></span><h3>{title}</h3><p>{description}</p></article>
            ))}
          </div>
        </section>

        <section className="landing-build" id="build">
          <div>
            <span className="landing-badge landing-badge--dark"><Clock3 size={14} /> The 48-hour challenge</span>
            <h2>Designed, built, integrated, and shipped by one engineer.</h2>
            <p>This product is the application: a production deployment that proves high-agency delivery across AI, frontend, backend, data, email, security, and operations.</p>
            <div className="landing-stack">
              <span>Next.js 16</span><span>React 19</span><span>TypeScript</span><span>OpenRouter</span><span>Neon Postgres</span><span>Vercel</span><span>SMTP</span>
            </div>
          </div>
          <div className="landing-build__proof">
            <article><BarChart3 size={18} /><div><strong>Structured AI output</strong><span>Strict schema · fixed scoring contract</span></div></article>
            <article><Users size={18} /><div><strong>Recruiter workspace</strong><span>Roles · pipelines · review handoffs</span></div></article>
            <article><MailCheck size={18} /><div><strong>Production automation</strong><span>Notifications · attachments · reminders</span></div></article>
            <article><LockKeyhole size={18} /><div><strong>Secure by default</strong><span>Sealed assessments · rate limits · audit trail</span></div></article>
          </div>
        </section>

        <section className="landing-cta">
          <span><Sparkles size={16} /> Live challenge build</span>
          <h2>See the complete workflow with a real résumé.</h2>
          <p>Upload a file, receive an evidence-backed assessment, and watch it arrive in the recruiter pipeline.</p>
          <div>
            <button className="landing-button landing-button--light" onClick={() => setScreeningOpen(true)} type="button">Screen a résumé <ArrowRight size={17} /></button>
            <Link className="landing-button landing-button--dark-ghost" href="/login">Open recruiter login</Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-brand"><span aria-hidden="true">S<i /></span><strong>Shortlist</strong></div>
        <p>Evidence-backed hiring support. AI recommends; humans decide.</p>
        <span>Solo AI Builder · 48-hour challenge</span>
      </footer>

      {completed ? (
        <div className="landing-toast" role="status">
          <CheckCircle2 size={20} />
          <div><strong>Assessment completed</strong><span>{intakeConfigured ? "Added to the recruiter pipeline and notification processed." : "Your evidence report is ready in this session."}</span></div>
          <button aria-label="Dismiss confirmation" onClick={() => setCompleted(null)} type="button">×</button>
        </div>
      ) : null}

      {screeningOpen ? (
        <ScreeningModal
          aiConfigured={health.aiConfigured}
          job={job}
          jobLocked={intakeConfigured}
          model={health.model}
          onClose={() => setScreeningOpen(false)}
          onComplete={handleComplete}
          persistToWorkspace={intakeConfigured}
        />
      ) : null}
    </div>
  );
}

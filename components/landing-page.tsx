"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSearch,
  FileText,
  GitBranch,
  LockKeyhole,
  MailCheck,
  MessageSquareText,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Workflow,
} from "lucide-react";

const slides = [
  {
    key: "screening",
    icon: FileSearch,
    label: "AI screening",
    title: "A score recruiters can inspect.",
    description: "Upload a résumé inside the workspace and receive a structured assessment grounded in direct evidence.",
    points: ["Fixed 100-point rubric", "Parse-quality diagnostics", "Strengths, gaps, and interview questions"],
  },
  {
    key: "pipeline",
    icon: GitBranch,
    label: "Hiring pipeline",
    title: "From assessment to action.",
    description: "Candidates enter the selected position automatically and move through a controlled, auditable workflow.",
    points: ["Position-based stages", "Human decisions and notes", "Search, filters, and evidence drawer"],
  },
  {
    key: "automation",
    icon: MailCheck,
    label: "Email automation",
    title: "The right people hear about it immediately.",
    description: "Successful intake triggers the recruiter notification flow with candidate context and the original résumé attached.",
    points: ["Automatic HR notification", "Original résumé attachment", "Templates, reminders, and delivery status"],
  },
  {
    key: "review",
    icon: Users,
    label: "Team review",
    title: "Structured feedback without extra accounts.",
    description: "Invite reviewers through private expiring links, collect decisions, and keep the final choice with the hiring team.",
    points: ["Controlled recipient list", "Blind-review support", "Feedback and audit history"],
  },
] as const;

export function LandingPage() {
  const [active, setActive] = useState(0);

  const slide = slides[active];
  const SlideIcon = slide.icon;
  const loginUrl = "/login?account=pro&next=/workspace";

  return (
    <div className="landing-shell landing-shell--guided">
      <header className="landing-nav">
        <Link aria-label="Shortlist home" className="landing-brand" href="/">
          <span aria-hidden="true">S<i /></span><strong>Shortlist</strong>
        </Link>
        <nav aria-label="Landing navigation">
          <a href="#product-tour">Product tour</a>
          <a href="#workflow">Workflow</a>
          <a href="#build">48-hour build</a>
        </nav>
        <div className="landing-nav__actions">
          <Link className="landing-link" href={loginUrl}>Sign in</Link>
          <Link className="landing-button landing-button--small" href={loginUrl}>Open live product</Link>
        </div>
      </header>

      <main>
        <section className="landing-hero landing-hero--guided">
          <div className="landing-hero__copy">
            <div className="landing-badge"><Sparkles size={14} /> Solo AI Builder · 48-hour challenge</div>
            <h1>One workspace to <em>screen, review, and move</em> candidates.</h1>
            <p>
              This is a working ATS—not a static concept. Sign in to upload a résumé, run the live AI assessment, test the pipeline, and trigger the email workflow.
            </p>
            <div className="landing-hero__actions">
              <Link className="landing-button landing-button--primary" href={loginUrl}>
                Enter the live workspace <ArrowRight size={17} />
              </Link>
              <a className="landing-button landing-button--ghost" href="#product-tour">
                <Play size={17} /> Preview the features
              </a>
            </div>
            <div className="landing-review-path">
              <span>Reviewer path</span>
              <ol><li><strong>1</strong> Sign in</li><li><strong>2</strong> Upload résumé</li><li><strong>3</strong> Explore panel</li></ol>
            </div>
          </div>

          <div className="landing-access-card">
            <div className="landing-access-card__top"><span><LockKeyhole size={15} /> Isolated challenge demo</span><i>FREE + PRO</i></div>
            <div className="landing-access-card__icon"><UserCheck size={27} /></div>
            <h2>Choose a plan and start instantly.</h2>
            <p>Compare the bounded Free workspace with the complete Pro workflow. Neither demo can change production data or send real email.</p>
            <ul>
              <li><CheckCircle2 size={16} /> Live OpenRouter screening</li>
              <li><CheckCircle2 size={16} /> Candidate pipeline and evidence</li>
              <li><CheckCircle2 size={16} /> Email and review automation</li>
              <li><CheckCircle2 size={16} /> Team roles and audit trail</li>
            </ul>
            <Link className="landing-button landing-button--primary" href={loginUrl}>Choose a demo account <ArrowRight size={16} /></Link>
            <small>One click · no password · changes stay in your browser</small>
          </div>
        </section>

        <section aria-label="Product proof" className="landing-proof-strip landing-proof-strip--guided">
          <div><strong>Live</strong><span>AI assessment</span></div>
          <div><strong>Auto</strong><span>email handoff</span></div>
          <div><strong>Private</strong><span>team review</span></div>
          <div><strong>Human</strong><span>final decision</span></div>
        </section>

        <section className="landing-tour" id="product-tour">
          <div className="landing-section__heading">
            <span>Inside the real panel</span>
            <h2>Four connected workflows. One clean product.</h2>
            <p>Use the tour for context, then sign in to operate every feature yourself.</p>
          </div>

          <div className="landing-carousel">
            <div className="landing-carousel__tabs" role="tablist" aria-label="Product feature tour">
              {slides.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button aria-selected={active === index} className={active === index ? "is-active" : ""} key={item.key} onClick={() => setActive(index)} role="tab" type="button">
                    <span><Icon size={17} /></span>{item.label}<i />
                  </button>
                );
              })}
            </div>

            <div className="landing-carousel__stage">
              <div className="landing-carousel__copy" key={slide.key}>
                <span><SlideIcon size={17} /> {slide.label}</span>
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
                <ul>{slide.points.map((point) => <li key={point}><Check size={14} />{point}</li>)}</ul>
                <Link href={loginUrl}>Test this in the panel <ArrowRight size={15} /></Link>
              </div>
              <FeaturePreview feature={slide.key} />
            </div>

            <div className="landing-carousel__controls">
              <span>{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
              <div>
                <button aria-label="Previous feature" onClick={() => setActive((active - 1 + slides.length) % slides.length)} type="button"><ChevronLeft size={18} /></button>
                <button aria-label="Next feature" onClick={() => setActive((active + 1) % slides.length)} type="button"><ChevronRight size={18} /></button>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-workflow" id="workflow">
          <div className="landing-section__heading landing-section__heading--left">
            <span>End-to-end automation</span>
            <h2>One upload starts the whole hiring loop.</h2>
          </div>
          <div className="landing-flow-line">
            <article><span><FileText size={18} /></span><strong>Résumé uploaded</strong><small>PDF · DOCX · TXT · MD</small></article>
            <ArrowRight />
            <article><span><BarChart3 size={18} /></span><strong>AI assessment</strong><small>Evidence + rubric + questions</small></article>
            <ArrowRight />
            <article><span><Workflow size={18} /></span><strong>Panel intake</strong><small>Position + stage + audit event</small></article>
            <ArrowRight />
            <article><span><Send size={18} /></span><strong>Email sent</strong><small>Recruiter notified + résumé attached</small></article>
          </div>
        </section>

        <section className="landing-build landing-build--compact" id="build">
          <div>
            <span className="landing-badge landing-badge--dark"><Clock3 size={14} /> Built and shipped in 48 hours</span>
            <h2>The application is the proof.</h2>
            <p>A production product covering AI orchestration, frontend, backend, database, authentication, email delivery, automation, security, and deployment.</p>
            <div className="landing-stack"><span>Next.js 16</span><span>React 19</span><span>TypeScript</span><span>OpenRouter</span><span>Neon</span><span>Vercel</span><span>SMTP</span></div>
          </div>
          <div className="landing-build__proof">
            <article><FileSearch size={18} /><div><strong>Structured AI</strong><span>Strict schema and evidence contract</span></div></article>
            <article><MessageSquareText size={18} /><div><strong>Team collaboration</strong><span>Private review links and feedback</span></div></article>
            <article><ShieldCheck size={18} /><div><strong>Production controls</strong><span>Seals, sessions, rate limits, audit trail</span></div></article>
          </div>
        </section>

        <section className="landing-cta landing-cta--guided">
          <span><LockKeyhole size={15} /> Secure reviewer access</span>
          <h2>Ready to test the real product?</h2>
          <p>Sign in, open the prepared position, upload a résumé, and follow the complete workflow through the panel.</p>
          <div><Link className="landing-button landing-button--light" href={loginUrl}>Choose a demo workspace <ArrowRight size={17} /></Link></div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-brand"><span aria-hidden="true">S<i /></span><strong>Shortlist</strong></div>
        <p>Evidence-backed hiring support. AI recommends; humans decide.</p>
        <span>Solo AI Builder · 48-hour challenge</span>
      </footer>
    </div>
  );
}

function FeaturePreview({ feature }: { feature: (typeof slides)[number]["key"] }) {
  if (feature === "pipeline") {
    return <div className="landing-preview landing-preview--pipeline"><div className="landing-preview__bar"><strong>Solo AI Builder</strong><span>12 candidates</span></div><div className="landing-mini-board"><section><strong>Screening <i>3</i></strong><article><b>MS</b><span>Mehdi Sharifi<small>87 · Strong match</small></span></article><article><b>JL</b><span>Jordan Lee<small>79 · Match</small></span></article></section><section><strong>Interview <i>2</i></strong><article><b>AK</b><span>Alex Kim<small>Team review ready</small></span></article></section><section><strong>Decision <i>1</i></strong><article><b>SR</b><span>Sam Rivera<small>Awaiting approval</small></span></article></section></div></div>;
  }
  if (feature === "automation") {
    return <div className="landing-preview landing-preview--automation"><div className="landing-preview__bar"><strong>Automation run</strong><span className="is-success">Delivered</span></div><div className="landing-mail-flow"><article><span><FileText size={18} /></span><div><strong>Candidate added</strong><small>Mehdi Sharifi · 87/100</small></div><CheckCircle2 size={17} /></article><i /><article><span><MailCheck size={18} /></span><div><strong>Recruiter notification</strong><small>Assessment summary + résumé.pdf</small></div><CheckCircle2 size={17} /></article><i /><article><span><Clock3 size={18} /></span><div><strong>Review reminder</strong><small>Scheduled if feedback is pending</small></div><span className="landing-waiting">48h</span></article></div></div>;
  }
  if (feature === "review") {
    return <div className="landing-preview landing-preview--review"><div className="landing-preview__bar"><strong>Team review</strong><span>2 of 3 complete</span></div><div className="landing-review-list"><article><b>NA</b><div><strong>Nika Ahmadi</strong><small>Advance · strong technical evidence</small></div><span>Done</span></article><article><b>AR</b><div><strong>Ali Rezaei</strong><small>Hold · clarify production ownership</small></div><span>Done</span></article><article><b>+</b><div><strong>External reviewer</strong><small>Private link expires in 46 hours</small></div><span className="is-pending">Pending</span></article></div></div>;
  }
  return <div className="landing-preview landing-preview--screening"><div className="landing-preview__bar"><strong>Candidate evidence</strong><span>Parse quality 100%</span></div><div className="landing-screen-result"><div className="landing-score"><strong>87</strong><span>/100</span><small>role fit</small></div><div><span className="landing-match">Strong match</span><h4>Review-ready evidence</h4><p>High confidence · 6 dimensions</p></div></div><div className="landing-preview-evidence"><span>Core skills <strong>27/30</strong></span><blockquote>“Built and deployed an AI workflow from concept to production.”</blockquote></div></div>;
}

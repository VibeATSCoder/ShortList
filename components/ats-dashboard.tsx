"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleGauge,
  Clock3,
  DatabaseZap,
  Eye,
  EyeOff,
  FileSearch,
  FileText,
  Fingerprint,
  FlaskConical,
  Code2,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { CandidateDetail } from "@/components/candidate-detail";
import { ScoreRing } from "@/components/score-ring";
import { ScreeningModal } from "@/components/screening-modal";
import { DEMO_CANDIDATES, DEMO_JOB } from "@/lib/demo-data";
import { candidatesToCsv, downloadTextFile } from "@/lib/export";
import {
  candidateInitials,
  candidateName,
  decisionLabels,
  formatDuration,
  recommendationLabels,
} from "@/lib/presentation";
import type {
  HumanDecision,
  JobProfile,
  Recommendation,
  ScreeningResult,
} from "@/lib/types";

interface HealthStatus {
  aiConfigured: boolean;
  model: string;
  retention: string;
}

type Filter = "all" | Recommendation | "decided";

export function AtsDashboard() {
  const [job, setJob] = useState<JobProfile>(DEMO_JOB);
  const [candidates, setCandidates] =
    useState<ScreeningResult[]>(DEMO_CANDIDATES);
  const [selectedId, setSelectedId] = useState(DEMO_CANDIDATES[0].id);
  const [blindMode, setBlindMode] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus>({
    aiConfigured: false,
    model: "gpt-5.4-mini",
    retention: "ephemeral",
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: HealthStatus | null) => {
        if (payload) setHealth(payload);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const rankedCandidates = useMemo(
    () => [...candidates].sort((a, b) => b.score - a.score),
    [candidates],
  );

  const visibleCandidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rankedCandidates.filter((candidate) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "decided"
            ? Boolean(candidate.humanDecision)
            : candidate.recommendation === filter;
      const matchesQuery =
        !normalizedQuery ||
        candidate.profile.displayName.toLowerCase().includes(normalizedQuery) ||
        candidate.profile.currentRole.toLowerCase().includes(normalizedQuery) ||
        candidate.strengths.some((strength) =>
          strength.toLowerCase().includes(normalizedQuery),
        );
      return matchesFilter && matchesQuery;
    });
  }, [filter, query, rankedCandidates]);

  const selectedCandidate =
    rankedCandidates.find((candidate) => candidate.id === selectedId) ??
    rankedCandidates[0];
  const selectedRank = Math.max(
    1,
    rankedCandidates.findIndex((candidate) => candidate.id === selectedCandidate?.id) +
      1,
  );

  const recommendedCount = candidates.filter((candidate) =>
    ["strong_match", "match"].includes(candidate.recommendation),
  ).length;
  const decidedCount = candidates.filter((candidate) => candidate.humanDecision).length;
  const evidenceCoverage = Math.round(
    (candidates.reduce(
      (total, candidate) =>
        total + candidate.rubric.filter((item) => item.evidence.length).length,
      0,
    ) /
      Math.max(1, candidates.length * 6)) *
      100,
  );
  const averageLatency =
    candidates.reduce((total, candidate) => total + candidate.meta.durationMs, 0) /
    Math.max(1, candidates.length);

  function updateDecision(candidateId: string, decision: HumanDecision) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId
          ? { ...candidate, humanDecision: decision }
          : candidate,
      ),
    );
    if (decision) setNotice(`Human decision saved: ${decisionLabels[decision]}.`);
  }

  function addResults(results: ScreeningResult[]) {
    setCandidates((current) => [...results, ...current]);
    setSelectedId(results[0].id);
    setMobileDetailOpen(true);
    setNotice(
      `${results.length} live ${results.length === 1 ? "assessment" : "assessments"} added to the shortlist.`,
    );
  }

  function resetDemo() {
    setCandidates(DEMO_CANDIDATES);
    setJob(DEMO_JOB);
    setSelectedId(DEMO_CANDIDATES[0].id);
    setFilter("all");
    setQuery("");
    setNotice("Seeded evaluation restored.");
  }

  function exportCsv() {
    downloadTextFile(
      candidatesToCsv(rankedCandidates, blindMode),
      "shortlist-candidates.csv",
      "text/csv;charset=utf-8",
    );
    setNotice(`CSV exported${blindMode ? " with identities hidden" : ""}.`);
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      job,
      blindMode,
      candidates: rankedCandidates.map((candidate, index) => ({
        ...candidate,
        profile: blindMode
          ? {
              ...candidate.profile,
              displayName: candidateName(candidate, index + 1, true),
            }
          : candidate.profile,
      })),
    };
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      "shortlist-audit.json",
      "application/json",
    );
    setNotice(`Audit JSON exported${blindMode ? " with identities hidden" : ""}.`);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`}>
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            S<span />
          </span>
          <div>
            <strong>Shortlist</strong>
            <small>Evidence, not vibes.</small>
          </div>
          <button
            aria-label="Close navigation"
            className="icon-button sidebar__close"
            onClick={() => setMobileNavOpen(false)}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <span>MS</span>
          <div>
            <small>Workspace</small>
            <strong>Solo builder lab</strong>
          </div>
          <ChevronRight aria-hidden="true" size={15} />
        </div>

        <nav className="side-nav" aria-label="Primary">
          <span className="side-nav__label">Workspace</span>
          <a className="side-nav__item side-nav__item--active" href="#overview">
            <LayoutDashboard aria-hidden="true" size={17} />
            Overview
          </a>
          <a className="side-nav__item" href="#candidates">
            <Users aria-hidden="true" size={17} />
            Candidates
            <span>{candidates.length}</span>
          </a>
          <a className="side-nav__item" href="#method">
            <FlaskConical aria-hidden="true" size={17} />
            Method & evals
          </a>
          <span className="side-nav__label side-nav__label--spaced">Active role</span>
          <a className="side-nav__item role-nav" href="#overview">
            <BriefcaseBusiness aria-hidden="true" size={17} />
            <span>
              <strong>{job.title}</strong>
              <small>{candidates.length} screened</small>
            </span>
          </a>
        </nav>

        <div className="sidebar__spacer" />

        <section className="privacy-card">
          <LockKeyhole aria-hidden="true" size={18} />
          <div>
            <strong>Zero server retention</strong>
            <p>Resume files are processed in memory and never stored by this app.</p>
          </div>
        </section>

        <div className="builder-card">
          <div className="avatar avatar--builder">MS</div>
          <div>
            <strong>Mehdi Sharifi</strong>
            <span>Solo AI Builder</span>
          </div>
          <Code2 aria-hidden="true" size={16} />
        </div>
      </aside>

      <div
        className={`sidebar-scrim ${mobileNavOpen ? "sidebar-scrim--open" : ""}`}
        onClick={() => setMobileNavOpen(false)}
        role="presentation"
      />

      <main className="main-content">
        <header className="topbar">
          <div className="topbar__left">
            <button
              aria-label="Open navigation"
              className="icon-button mobile-menu"
              onClick={() => setMobileNavOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" size={19} />
            </button>
            <span className="breadcrumb">Roles</span>
            <ChevronRight aria-hidden="true" size={14} />
            <strong>{job.title}</strong>
          </div>
          <div className="topbar__right">
            <span
              className={`system-status ${health.aiConfigured ? "system-status--live" : ""}`}
            >
              <i />
              {health.aiConfigured ? "Live AI ready" : "Seeded demo"}
            </span>
            <button className="button button--subtle" onClick={exportJson} type="button">
              <Fingerprint aria-hidden="true" size={15} />
              Audit JSON
            </button>
            <button
              className="button button--dark"
              onClick={() => setIsScreeningOpen(true)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              Screen resumes
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="hero" id="overview">
            <div className="hero__copy">
              <div className="eyebrow-row">
                <span className="eyebrow">Active shortlist · v1 evaluation</span>
                <span className="demo-pill">
                  <FlaskConical aria-hidden="true" size={12} />
                  Fictional demo data
                </span>
              </div>
              <h1>
                Every score comes
                <br />
                with <em>proof.</em>
              </h1>
              <p>
                Rank candidates against one explicit rubric, inspect the evidence,
                then make the decision yourself.
              </p>
              <div className="hero__actions">
                <button
                  className="button button--accent button--large"
                  onClick={() => setIsScreeningOpen(true)}
                  type="button"
                >
                  <Sparkles aria-hidden="true" size={17} />
                  Screen a real resume
                </button>
                <a className="button button--text" href="#candidates">
                  Explore the evaluation
                  <ArrowRight aria-hidden="true" size={15} />
                </a>
              </div>
            </div>
            <div className="hero__signal" aria-label="Evaluation summary">
              <div className="signal-orbit">
                <ScoreRing score={rankedCandidates[0]?.score ?? 0} size="large" />
                <span className="orbit orbit--one" />
                <span className="orbit orbit--two" />
                <div className="signal-float signal-float--top">
                  <CheckCircle2 aria-hidden="true" size={15} />
                  <span>
                    <strong>{evidenceCoverage}%</strong>
                    evidence coverage
                  </span>
                </div>
                <div className="signal-float signal-float--bottom">
                  <ShieldCheck aria-hidden="true" size={15} />
                  <span>
                    <strong>Blind by default</strong>
                    protected signals ignored
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="stats-grid" aria-label="Shortlist metrics">
            <article className="stat-card">
              <span className="stat-card__icon stat-card__icon--green">
                <Users aria-hidden="true" size={18} />
              </span>
              <div>
                <span>Candidates</span>
                <strong>{candidates.length}</strong>
                <small>in this evaluation</small>
              </div>
              <BarChart3 aria-hidden="true" className="stat-card__watermark" size={46} />
            </article>
            <article className="stat-card">
              <span className="stat-card__icon stat-card__icon--blue">
                <CircleGauge aria-hidden="true" size={18} />
              </span>
              <div>
                <span>Best fit</span>
                <strong>{rankedCandidates[0]?.score ?? 0}</strong>
                <small>out of 100 weighted</small>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-card__icon stat-card__icon--yellow">
                <Sparkles aria-hidden="true" size={18} />
              </span>
              <div>
                <span>Recommended</span>
                <strong>{recommendedCount}</strong>
                <small>AI signal, not a decision</small>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-card__icon stat-card__icon--purple">
                <Clock3 aria-hidden="true" size={18} />
              </span>
              <div>
                <span>Median-like latency</span>
                <strong>{formatDuration(averageLatency)}</strong>
                <small>per resume in this run</small>
              </div>
            </article>
          </section>

          <section className="shortlist-section" id="candidates">
            <header className="section-title-row">
              <div>
                <span className="eyebrow">Ranked evidence</span>
                <h2>Candidate shortlist</h2>
                <p>
                  AI recommendation and human decision are deliberately separate.
                </p>
              </div>
              <div className="section-title-row__actions">
                <button
                  aria-pressed={blindMode}
                  className={`blind-toggle ${blindMode ? "blind-toggle--active" : ""}`}
                  onClick={() => setBlindMode((current) => !current)}
                  type="button"
                >
                  {blindMode ? (
                    <EyeOff aria-hidden="true" size={16} />
                  ) : (
                    <Eye aria-hidden="true" size={16} />
                  )}
                  <span>
                    <strong>Blind review {blindMode ? "on" : "off"}</strong>
                    <small>{blindMode ? "Names hidden" : "Names visible"}</small>
                  </span>
                  <i />
                </button>
                <button className="button button--subtle" onClick={exportCsv} type="button">
                  <ArrowDownToLine aria-hidden="true" size={15} />
                  Export CSV
                </button>
              </div>
            </header>

            <div className="candidate-toolbar">
              <label className="search-box">
                <Search aria-hidden="true" size={16} />
                <span className="visually-hidden">Search candidates</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search role or evidence…"
                  type="search"
                  value={query}
                />
              </label>
              <div className="filter-tabs" role="group" aria-label="Filter candidates">
                {(
                  [
                    ["all", "All"],
                    ["strong_match", "Strong"],
                    ["match", "Match"],
                    ["review", "Review"],
                    ["decided", `Decided ${decidedCount}`],
                  ] as [Filter, string][]
                ).map(([value, label]) => (
                  <button
                    aria-pressed={filter === value}
                    className={filter === value ? "filter-tab--active" : ""}
                    key={value}
                    onClick={() => setFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button className="icon-button" onClick={resetDemo} title="Reset demo" type="button">
                <RotateCcw aria-hidden="true" size={16} />
              </button>
            </div>

            <div className="candidate-workspace">
              <div className="candidate-table-wrap">
                <table className="candidate-table">
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Candidate</th>
                      <th scope="col">Fit</th>
                      <th scope="col">AI signal</th>
                      <th scope="col">Human decision</th>
                      <th aria-label="Open" scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCandidates.map((candidate) => {
                      const rank =
                        rankedCandidates.findIndex((item) => item.id === candidate.id) + 1;
                      const active = selectedCandidate?.id === candidate.id;
                      return (
                        <tr className={active ? "candidate-row--active" : ""} key={candidate.id}>
                          <td>
                            <span className="rank-number">
                              {String(rank).padStart(2, "0")}
                            </span>
                          </td>
                          <td>
                            <button
                              className="candidate-identity"
                              onClick={() => {
                                setSelectedId(candidate.id);
                                setMobileDetailOpen(true);
                              }}
                              type="button"
                            >
                              <span className="avatar">
                                {candidateInitials(candidate, rank, blindMode)}
                              </span>
                              <span>
                                <strong>{candidateName(candidate, rank, blindMode)}</strong>
                                <small>{candidate.profile.currentRole}</small>
                              </span>
                            </button>
                          </td>
                          <td>
                            <div className="table-score">
                              <ScoreRing score={candidate.score} size="small" />
                              <span>
                                <strong>{candidate.score}</strong>
                                <small>/100</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`recommendation recommendation--${candidate.recommendation}`}
                            >
                              {recommendationLabels[candidate.recommendation]}
                            </span>
                            <small className="confidence-line">
                              {candidate.confidence} confidence
                            </small>
                          </td>
                          <td>
                            {candidate.humanDecision ? (
                              <span
                                className={`human-chip human-chip--${candidate.humanDecision}`}
                              >
                                {decisionLabels[candidate.humanDecision]}
                              </span>
                            ) : (
                              <span className="human-chip human-chip--empty">Unreviewed</span>
                            )}
                          </td>
                          <td>
                            <button
                              aria-label={`Open ${candidateName(candidate, rank, blindMode)}`}
                              className="row-open"
                              onClick={() => {
                                setSelectedId(candidate.id);
                                setMobileDetailOpen(true);
                              }}
                              type="button"
                            >
                              <ChevronRight aria-hidden="true" size={17} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!visibleCandidates.length ? (
                  <div className="no-results">
                    <FileSearch aria-hidden="true" size={28} />
                    <strong>No candidates match this view.</strong>
                    <button
                      className="text-button"
                      onClick={() => {
                        setFilter("all");
                        setQuery("");
                      }}
                      type="button"
                    >
                      Clear filters
                    </button>
                  </div>
                ) : null}
                <footer className="table-footer">
                  <span>
                    Showing {visibleCandidates.length} of {candidates.length} candidates
                  </span>
                  <span>
                    <ShieldCheck aria-hidden="true" size={13} />
                    Protected attributes excluded
                  </span>
                </footer>
              </div>

              {selectedCandidate ? (
                <div
                  className={`candidate-detail-wrap ${
                    mobileDetailOpen ? "candidate-detail-wrap--mobile-open" : ""
                  }`}
                >
                  <CandidateDetail
                    blindMode={blindMode}
                    candidate={selectedCandidate}
                    onClose={() => setMobileDetailOpen(false)}
                    onDecision={(decision) => updateDecision(selectedCandidate.id, decision)}
                    rank={selectedRank}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="method-section" id="method">
            <header>
              <span className="eyebrow">Built for trust under a deadline</span>
              <h2>Not a magic score. A reviewable system.</h2>
            </header>
            <div className="method-grid">
              <article>
                <span>01</span>
                <FileText aria-hidden="true" size={22} />
                <h3>Ground every claim</h3>
                <p>
                  Each rubric score points back to resume evidence. Missing evidence
                  stays missing—nothing is guessed.
                </p>
              </article>
              <article>
                <span>02</span>
                <DatabaseZap aria-hidden="true" size={22} />
                <h3>Constrain the model</h3>
                <p>
                  Strict structured output, fixed weights, bounded input, prompt
                  isolation, and normalized totals keep results predictable.
                </p>
              </article>
              <article>
                <span>03</span>
                <ShieldCheck aria-hidden="true" size={22} />
                <h3>Keep agency human</h3>
                <p>
                  Blind review, protected-signal exclusion, confidence labels, and a
                  separate human decision prevent false automation.
                </p>
              </article>
            </div>
            <div className="method-footer">
              <div>
                <Fingerprint aria-hidden="true" size={16} />
                <span>
                  Prompt <strong>screen-v1.0.0</strong>
                </span>
              </div>
              <div>
                <CircleGauge aria-hidden="true" size={16} />
                <span>
                  Model <strong>{health.model}</strong>
                </span>
              </div>
              <div>
                <LockKeyhole aria-hidden="true" size={16} />
                <span>
                  Retention <strong>{health.retention}</strong>
                </span>
              </div>
            </div>
          </section>

          <footer className="page-footer">
            <div className="brand brand--footer">
              <span className="brand__mark" aria-hidden="true">
                S<span />
              </span>
              <strong>Shortlist</strong>
            </div>
            <p>Decision support for hiring teams. Never an automatic hiring decision.</p>
            <span>Solo-built for the 48-hour challenge · 2026</span>
          </footer>
        </div>
      </main>

      {isScreeningOpen ? (
        <ScreeningModal
          aiConfigured={health.aiConfigured}
          job={job}
          model={health.model}
          onClose={() => setIsScreeningOpen(false)}
          onJobChange={setJob}
          onResults={addResults}
        />
      ) : null}

      {notice ? (
        <div aria-live="polite" className="toast" role="status">
          <CheckCircle2 aria-hidden="true" size={17} />
          {notice}
        </div>
      ) : null}
    </div>
  );
}

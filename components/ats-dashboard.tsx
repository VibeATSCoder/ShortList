"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useLocale } from "@/components/locale-provider";
import { ScoreRing } from "@/components/score-ring";
import { ScreeningModal } from "@/components/screening-modal";
import { DEMO_CANDIDATES, DEMO_JOB } from "@/lib/demo-data";
import {
  DEMO_JOB_FA,
  localizeDemoCandidate,
} from "@/lib/demo-data-fa";
import {
  candidateForBlindExport,
  candidatesToCsv,
  downloadTextFile,
} from "@/lib/export";
import { formatDuration, formatNumber, normalizeSearch } from "@/lib/i18n";
import {
  candidateInitials,
  candidateName,
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
  promptVersion: string;
  storage: string;
  providerDataPolicy: string;
  rateLimit: string;
}

type Filter = "all" | Recommendation | "decided";

export function AtsDashboard() {
  const { copy, locale, setLocale } = useLocale();
  const [job, setJob] = useState<JobProfile>(DEMO_JOB);
  const [isDemoJob, setIsDemoJob] = useState(true);
  const [candidates, setCandidates] =
    useState<ScreeningResult[]>(DEMO_CANDIDATES);
  const [selectedId, setSelectedId] = useState(DEMO_CANDIDATES[0].id);
  const [blindMode, setBlindMode] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [isScreeningOpen, setIsScreeningOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const detailTriggerRef = useRef<HTMLElement | null>(null);
  const navigationTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [health, setHealth] = useState<HealthStatus>({
    aiConfigured: false,
    model: "gpt-5.6",
    promptVersion: "screen-v2.0.0",
    storage: "not-persisted-by-app",
    providerDataPolicy: "account-policy",
    rateLimit: "per-instance",
  });

  const displayJob = isDemoJob
    ? locale === "fa"
      ? DEMO_JOB_FA
      : DEMO_JOB
    : job;

  const displayCandidates = useMemo(
    () => candidates.map((candidate) => localizeDemoCandidate(candidate, locale)),
    [candidates, locale],
  );

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
    const query = window.matchMedia("(max-width: 1079px)");
    const update = () => {
      setIsCompactLayout(query.matches);
      if (!query.matches) {
        setMobileNavOpen(false);
        setMobileDetailOpen(false);
      }
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const shouldLock = isCompactLayout && (mobileNavOpen || mobileDetailOpen);
    document.body.classList.toggle("drawer-open", shouldLock);
    return () => document.body.classList.remove("drawer-open");
  }, [isCompactLayout, mobileDetailOpen, mobileNavOpen]);

  useEffect(() => {
    if (!isCompactLayout || !mobileDetailOpen) return;
    document.querySelector<HTMLElement>("[data-detail-close]")?.focus();
  }, [isCompactLayout, mobileDetailOpen, selectedId]);

  useEffect(() => {
    if (!isCompactLayout || !mobileNavOpen) return;
    const navigationTrigger = navigationTriggerRef.current;
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const closeButton = sidebar?.querySelector<HTMLElement>("[data-nav-close]");
    closeButton?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
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

    window.addEventListener("keydown", trapFocus);
    return () => {
      window.removeEventListener("keydown", trapFocus);
      if (sidebar?.contains(document.activeElement)) {
        window.requestAnimationFrame(() => navigationTrigger?.focus());
      }
    };
  }, [isCompactLayout, mobileNavOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (mobileDetailOpen) {
        setMobileDetailOpen(false);
        detailTriggerRef.current?.focus();
      } else if (mobileNavOpen) {
        setMobileNavOpen(false);
        window.requestAnimationFrame(() => navigationTriggerRef.current?.focus());
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileDetailOpen, mobileNavOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4_500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const rankedCandidates = useMemo(
    () => [...displayCandidates].sort((a, b) => b.score - a.score),
    [displayCandidates],
  );

  const visibleCandidates = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return rankedCandidates.filter((candidate) => {
      const matchesFilter =
        filter === "all"
          ? true
          : filter === "decided"
            ? Boolean(candidate.humanDecision)
            : candidate.recommendation === filter;
      const matchesQuery =
        !normalizedQuery ||
        (!blindMode &&
          normalizeSearch(candidate.profile.displayName).includes(normalizedQuery)) ||
        normalizeSearch(candidate.profile.currentRole).includes(normalizedQuery) ||
        candidate.strengths.some((strength) =>
          normalizeSearch(strength).includes(normalizedQuery),
        );
      return matchesFilter && matchesQuery;
    });
  }, [blindMode, filter, query, rankedCandidates]);

  const openCandidate = useCallback(
    (candidateId: string, trigger: HTMLElement) => {
      detailTriggerRef.current = trigger;
      setSelectedId(candidateId);
      if (isCompactLayout) setMobileDetailOpen(true);
    },
    [isCompactLayout],
  );

  const closeCandidateDetail = useCallback(() => {
    setMobileDetailOpen(false);
    detailTriggerRef.current?.focus();
  }, []);

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
    if (decision) setNotice(copy.dashboard.decisionSaved(copy.decisionLabels[decision]));
  }

  function applyScreeningResults(nextJob: JobProfile, results: ScreeningResult[]) {
    if (!results.length) return;
    const sameJob =
      displayJob.title.trim() === nextJob.title.trim() &&
      displayJob.description.trim() === nextJob.description.trim();
    setCandidates((current) =>
      isDemoJob || !sameJob ? results : [...results, ...current],
    );
    setJob(nextJob);
    setIsDemoJob(false);
    setSelectedId(results[0].id);
    if (isDemoJob || !sameJob) {
      setFilter("all");
      setQuery("");
    }
    setNotice(copy.dashboard.assessmentsAdded(results.length));
  }

  function resetDemo() {
    setCandidates(DEMO_CANDIDATES);
    setJob(DEMO_JOB);
    setIsDemoJob(true);
    setSelectedId(DEMO_CANDIDATES[0].id);
    setFilter("all");
    setQuery("");
    setNotice(copy.dashboard.demoRestored);
  }

  function exportCsv() {
    downloadTextFile(
      candidatesToCsv(rankedCandidates, blindMode, locale),
      copy.export.csvFileName,
      "text/csv;charset=utf-8",
    );
    setNotice(copy.dashboard.csvExported(blindMode));
  }

  function exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      job: displayJob,
      locale,
      blindMode,
      candidates: rankedCandidates.map((candidate, index) =>
        blindMode
          ? candidateForBlindExport(candidate, index + 1, locale)
          : candidate,
      ),
    };
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      copy.export.jsonFileName,
      "application/json",
    );
    setNotice(copy.dashboard.jsonExported(blindMode));
  }

  return (
    <div className="app-shell">
      <aside
        aria-label={
          isCompactLayout && mobileNavOpen
            ? copy.dashboard.primaryNavigation
            : undefined
        }
        aria-modal={isCompactLayout && mobileNavOpen ? true : undefined}
        aria-hidden={
          (isScreeningOpen ||
            (isCompactLayout && mobileDetailOpen) ||
            (isCompactLayout && !mobileNavOpen)) ||
          undefined
        }
        className={`sidebar ${mobileNavOpen ? "sidebar--open" : ""}`}
        inert={
          (isScreeningOpen ||
            (isCompactLayout && mobileDetailOpen) ||
            (isCompactLayout && !mobileNavOpen)) ||
          undefined
        }
        role={isCompactLayout && mobileNavOpen ? "dialog" : undefined}
      >
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            S<span />
          </span>
          <div>
            <strong>{copy.common.brand}</strong>
            <small>{copy.common.tagline}</small>
          </div>
          <button
            aria-label={copy.dashboard.closeNavigation}
            className="icon-button sidebar__close"
            data-nav-close
            onClick={() => {
              setMobileNavOpen(false);
              window.requestAnimationFrame(() => navigationTriggerRef.current?.focus());
            }}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <span>MS</span>
          <div>
            <small>{copy.dashboard.workspace}</small>
            <strong>{copy.dashboard.workspaceName}</strong>
          </div>
          <ChevronRight aria-hidden="true" size={15} />
        </div>

        <nav className="side-nav" aria-label={copy.dashboard.primaryNavigation}>
          <span className="side-nav__label">{copy.dashboard.workspace}</span>
          <a className="side-nav__item side-nav__item--active" href="#overview" onClick={() => setMobileNavOpen(false)}>
            <LayoutDashboard aria-hidden="true" size={17} />
            {copy.dashboard.overview}
          </a>
          <a className="side-nav__item" href="#candidates" onClick={() => setMobileNavOpen(false)}>
            <Users aria-hidden="true" size={17} />
            {copy.dashboard.candidates}
            <span>{formatNumber(candidates.length, locale)}</span>
          </a>
          <a className="side-nav__item" href="#method" onClick={() => setMobileNavOpen(false)}>
            <FlaskConical aria-hidden="true" size={17} />
            {copy.dashboard.methodAndEvals}
          </a>
          <span className="side-nav__label side-nav__label--spaced">{copy.dashboard.activeRole}</span>
          <a className="side-nav__item role-nav" href="#overview" onClick={() => setMobileNavOpen(false)}>
            <BriefcaseBusiness aria-hidden="true" size={17} />
            <span>
              <strong className="bidi-isolate" dir="auto">{displayJob.title}</strong>
              <small>{copy.dashboard.screenedCount(candidates.length)}</small>
            </span>
          </a>
        </nav>

        <div className="sidebar__spacer" />

        <section className="privacy-card">
          <LockKeyhole aria-hidden="true" size={18} />
          <div>
            <strong>{copy.dashboard.zeroRetention}</strong>
            <p>{copy.dashboard.zeroRetentionDescription}</p>
          </div>
        </section>

        <div className="builder-card">
          <div className="avatar avatar--builder">MS</div>
          <div>
            <strong>Mehdi Sharifi</strong>
            <span>{copy.dashboard.builderRole}</span>
          </div>
          <Code2 aria-hidden="true" size={16} />
        </div>
      </aside>

      <div
        className={`sidebar-scrim ${mobileNavOpen ? "sidebar-scrim--open" : ""}`}
        onClick={() => {
          setMobileNavOpen(false);
          window.requestAnimationFrame(() => navigationTriggerRef.current?.focus());
        }}
        role="presentation"
      />

      <main
        aria-hidden={
          (isScreeningOpen ||
            (isCompactLayout && (mobileDetailOpen || mobileNavOpen))) ||
          undefined
        }
        className="main-content"
        inert={
          (isScreeningOpen ||
            (isCompactLayout && (mobileDetailOpen || mobileNavOpen))) ||
          undefined
        }
      >
        <header className="topbar">
          <div className="topbar__left">
            <button
              aria-label={copy.dashboard.openNavigation}
              className="icon-button mobile-menu"
              onClick={() => setMobileNavOpen(true)}
              ref={navigationTriggerRef}
              type="button"
            >
              <Menu aria-hidden="true" size={19} />
            </button>
            <span className="breadcrumb">{copy.dashboard.roles}</span>
            <ChevronRight aria-hidden="true" size={14} />
            <strong className="bidi-isolate" dir="auto">{displayJob.title}</strong>
          </div>
          <div className="topbar__right">
            <div className="locale-switch" role="group" aria-label="Language / زبان">
              {(["en", "fa"] as const).map((value) => (
                <button
                  aria-pressed={locale === value}
                  className={`locale-switch__button ${
                    locale === value ? "locale-switch__button--active" : ""
                  }`}
                  key={value}
                  lang={value}
                  onClick={() => setLocale(value)}
                  type="button"
                >
                  {value === "en" ? "EN" : "فا"}
                </button>
              ))}
            </div>
            <span
              className={`system-status ${health.aiConfigured ? "system-status--live" : ""}`}
            >
              <i />
              {health.aiConfigured ? copy.dashboard.liveAiReady : copy.dashboard.seededDemo}
            </span>
            <button className="button button--subtle" onClick={exportJson} type="button">
              <Fingerprint aria-hidden="true" size={15} />
              {copy.dashboard.auditJson}
            </button>
            <button
              className="button button--dark"
              onClick={() => setIsScreeningOpen(true)}
              type="button"
            >
              <Plus aria-hidden="true" size={16} />
              {copy.dashboard.screenResumes}
            </button>
          </div>
        </header>

        <div className="page-content">
          <section className="hero" id="overview">
            <div className="hero__copy">
              <div className="eyebrow-row">
                <span className="eyebrow">{copy.dashboard.activeShortlist}</span>
                <span className="demo-pill">
                  <FlaskConical aria-hidden="true" size={12} />
                  {copy.dashboard.fictionalDemoData}
                </span>
              </div>
              <h1>
                {copy.dashboard.heroTitleLead}
                <br />
                <em>{copy.dashboard.heroTitleEmphasis}</em>
              </h1>
              <p>
                {copy.dashboard.heroDescription}
              </p>
              <div className="hero__actions">
                <button
                  className="button button--accent button--large"
                  onClick={() => setIsScreeningOpen(true)}
                  type="button"
                >
                  <Sparkles aria-hidden="true" size={17} />
                  {copy.dashboard.screenRealResume}
                </button>
                <a className="button button--text" href="#candidates">
                  {copy.dashboard.exploreEvaluation}
                  <ArrowRight aria-hidden="true" size={15} />
                </a>
              </div>
            </div>
            <div className="hero__signal" aria-label={copy.dashboard.evaluationSummary}>
              <div className="signal-orbit">
                <ScoreRing score={rankedCandidates[0]?.score ?? 0} size="large" />
                <span className="orbit orbit--one" />
                <span className="orbit orbit--two" />
                <div className="signal-float signal-float--top">
                  <CheckCircle2 aria-hidden="true" size={15} />
                  <span>
                    <strong>{formatNumber(evidenceCoverage / 100, locale, { style: "percent" })}</strong>
                    {copy.dashboard.evidenceCoverage}
                  </span>
                </div>
                <div className="signal-float signal-float--bottom">
                  <ShieldCheck aria-hidden="true" size={15} />
                  <span>
                    <strong>{copy.dashboard.blindByDefault}</strong>
                    {copy.dashboard.protectedSignalsIgnored}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="stats-grid" aria-label={copy.dashboard.shortlistMetrics}>
            <article className="stat-card">
              <span className="stat-card__icon stat-card__icon--green">
                <Users aria-hidden="true" size={18} />
              </span>
              <div>
                <span>{copy.dashboard.candidates}</span>
                <strong>{formatNumber(candidates.length, locale)}</strong>
                <small>{copy.dashboard.inThisEvaluation}</small>
              </div>
              <BarChart3 aria-hidden="true" className="stat-card__watermark" size={46} />
            </article>
            <article className="stat-card">
              <span className="stat-card__icon stat-card__icon--blue">
                <CircleGauge aria-hidden="true" size={18} />
              </span>
              <div>
                <span>{copy.dashboard.bestFit}</span>
                <strong>{formatNumber(rankedCandidates[0]?.score ?? 0, locale)}</strong>
                <small>{copy.dashboard.outOfWeighted}</small>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-card__icon stat-card__icon--yellow">
                <Sparkles aria-hidden="true" size={18} />
              </span>
              <div>
                <span>{copy.dashboard.recommended}</span>
                <strong>{formatNumber(recommendedCount, locale)}</strong>
                <small>{copy.dashboard.aiSignalNotDecision}</small>
              </div>
            </article>
            <article className="stat-card">
              <span className="stat-card__icon stat-card__icon--purple">
                <Clock3 aria-hidden="true" size={18} />
              </span>
              <div>
                <span>{copy.dashboard.medianLatency}</span>
                <strong>{formatDuration(averageLatency, locale)}</strong>
                <small>{copy.dashboard.perResumeInRun}</small>
              </div>
            </article>
          </section>

          <section className="shortlist-section" id="candidates">
            <header className="section-title-row">
              <div>
                <span className="eyebrow">{copy.dashboard.rankedEvidence}</span>
                <h2>{copy.dashboard.candidateShortlist}</h2>
                <p>{copy.dashboard.shortlistDescription}</p>
              </div>
              <div className="section-title-row__actions">
                <span className="session-badge">
                  <Clock3 aria-hidden="true" size={14} />
                  {copy.dashboard.sessionOnly}
                </span>
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
                    <strong>
                      {blindMode ? copy.dashboard.blindReviewOn : copy.dashboard.blindReviewOff}
                    </strong>
                    <small>{blindMode ? copy.dashboard.namesHidden : copy.dashboard.namesVisible}</small>
                  </span>
                  <i />
                </button>
                <button className="button button--subtle" onClick={exportCsv} type="button">
                  <ArrowDownToLine aria-hidden="true" size={15} />
                  {copy.dashboard.exportCsv}
                </button>
              </div>
            </header>

            <div className="candidate-toolbar">
              <label className="search-box">
                <Search aria-hidden="true" size={16} />
                <span className="visually-hidden">{copy.dashboard.searchCandidates}</span>
                <input
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label={copy.dashboard.searchCandidates}
                  placeholder={copy.dashboard.searchPlaceholder}
                  type="search"
                  value={query}
                />
              </label>
              <div className="filter-tabs" role="group" aria-label={copy.dashboard.filterCandidates}>
                {(
                  [
                    ["all", copy.common.all],
                    ["strong_match", copy.dashboard.filterStrong],
                    ["match", copy.dashboard.filterMatch],
                    ["review", copy.dashboard.filterReview],
                    ["decided", copy.dashboard.filterDecided(decidedCount)],
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
              <button aria-label={copy.dashboard.resetDemo} className="icon-button" onClick={resetDemo} title={copy.dashboard.resetDemo} type="button">
                <RotateCcw aria-hidden="true" size={16} />
              </button>
            </div>

            <div className="candidate-workspace">
              <div className="candidate-table-wrap">
                <table className="candidate-table">
                  <thead>
                    <tr>
                      <th scope="col">{copy.dashboard.rank}</th>
                      <th scope="col">{copy.common.candidate}</th>
                      <th scope="col">{copy.dashboard.fit}</th>
                      <th scope="col">{copy.dashboard.aiSignal}</th>
                      <th scope="col">{copy.dashboard.humanDecision}</th>
                      <th aria-label={copy.common.open} scope="col" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleCandidates.map((candidate) => {
                      const rank =
                        rankedCandidates.findIndex((item) => item.id === candidate.id) + 1;
                      const active = selectedCandidate?.id === candidate.id;
                      return (
                        <tr
                          aria-selected={active}
                          className={active ? "candidate-row--active" : ""}
                          key={candidate.id}
                        >
                          <td>
                            <span className="rank-number">
                              {formatNumber(rank, locale, { minimumIntegerDigits: 2 })}
                            </span>
                          </td>
                          <td>
                            <button
                              className="candidate-identity"
                              aria-pressed={active}
                              onClick={(event) => openCandidate(candidate.id, event.currentTarget)}
                              type="button"
                            >
                              <span className="avatar">
                                {candidateInitials(candidate, rank, blindMode, locale)}
                              </span>
                              <span>
                                <strong className="bidi-isolate" dir="auto">
                                  {candidateName(candidate, rank, blindMode, locale)}
                                </strong>
                                <small className="bidi-isolate" dir="auto">{candidate.profile.currentRole}</small>
                              </span>
                            </button>
                          </td>
                          <td>
                            <div className="table-score">
                              <ScoreRing score={candidate.score} size="small" />
                              <span>
                                <strong>{formatNumber(candidate.score, locale)}</strong>
                                <small>/{formatNumber(100, locale)}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`recommendation recommendation--${candidate.recommendation}`}
                            >
                              {copy.recommendationLabels[candidate.recommendation]}
                            </span>
                            <small className="confidence-line">
                              {copy.candidateDetail.confidenceLabel(copy.confidenceLabels[candidate.confidence])}
                            </small>
                          </td>
                          <td>
                            {candidate.humanDecision ? (
                              <span
                                className={`human-chip human-chip--${candidate.humanDecision}`}
                              >
                                {copy.decisionLabels[candidate.humanDecision]}
                              </span>
                            ) : (
                              <span className="human-chip human-chip--empty">{copy.export.unreviewed}</span>
                            )}
                          </td>
                          <td>
                            <button
                              aria-label={copy.dashboard.openCandidate(candidateName(candidate, rank, blindMode, locale))}
                              className="row-open"
                              onClick={(event) => openCandidate(candidate.id, event.currentTarget)}
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
                    <strong>{copy.dashboard.noCandidates}</strong>
                    <button
                      className="text-button"
                      onClick={() => {
                        setFilter("all");
                        setQuery("");
                      }}
                      type="button"
                    >
                      {copy.dashboard.clearFilters}
                    </button>
                  </div>
                ) : null}
                <footer className="table-footer">
                  <span>
                    {copy.dashboard.showingCandidates(visibleCandidates.length, candidates.length)}
                  </span>
                  <span>
                    <ShieldCheck aria-hidden="true" size={13} />
                    {copy.dashboard.protectedAttributesExcluded}
                  </span>
                </footer>
              </div>

              {selectedCandidate && !isCompactLayout ? (
                <div className="candidate-detail-wrap">
                  <CandidateDetail
                    blindMode={blindMode}
                    candidate={selectedCandidate}
                    onDecision={(decision) => updateDecision(selectedCandidate.id, decision)}
                    rank={selectedRank}
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="method-section" id="method">
            <header>
              <span className="eyebrow">{copy.dashboard.methodEyebrow}</span>
              <h2>{copy.dashboard.methodTitle}</h2>
            </header>
            <div className="method-grid">
              <article>
                <span>{formatNumber(1, locale, { minimumIntegerDigits: 2 })}</span>
                <FileText aria-hidden="true" size={22} />
                <h3>{copy.dashboard.groundClaimsTitle}</h3>
                <p>{copy.dashboard.groundClaimsDescription}</p>
              </article>
              <article>
                <span>{formatNumber(2, locale, { minimumIntegerDigits: 2 })}</span>
                <DatabaseZap aria-hidden="true" size={22} />
                <h3>{copy.dashboard.constrainModelTitle}</h3>
                <p>{copy.dashboard.constrainModelDescription}</p>
              </article>
              <article>
                <span>{formatNumber(3, locale, { minimumIntegerDigits: 2 })}</span>
                <ShieldCheck aria-hidden="true" size={22} />
                <h3>{copy.dashboard.keepHumanAgencyTitle}</h3>
                <p>{copy.dashboard.keepHumanAgencyDescription}</p>
              </article>
            </div>
            <div className="method-footer">
              <div>
                <Fingerprint aria-hidden="true" size={16} />
                <span>
                  {copy.common.prompt} <strong className="bidi-isolate">{health.promptVersion}</strong>
                </span>
              </div>
              <div>
                <CircleGauge aria-hidden="true" size={16} />
                <span>
                  {copy.common.model} <strong className="bidi-isolate">{health.model}</strong>
                </span>
              </div>
              <div>
                <LockKeyhole aria-hidden="true" size={16} />
                <span>
                  {copy.common.retention} <strong>{copy.dashboard.appStorageNone}</strong>
                </span>
              </div>
            </div>
          </section>

          <footer className="page-footer">
            <div className="brand brand--footer">
              <span className="brand__mark" aria-hidden="true">
                S<span />
              </span>
              <strong>{copy.common.brand}</strong>
            </div>
            <p>{copy.dashboard.footerDescription}</p>
            <span>{copy.dashboard.footerChallenge}</span>
          </footer>
        </div>
      </main>

      {selectedCandidate && isCompactLayout ? (
        <div
          className={`candidate-detail-wrap ${
            mobileDetailOpen ? "candidate-detail-wrap--mobile-open" : ""
          }`}
        >
          <CandidateDetail
            blindMode={blindMode}
            candidate={selectedCandidate}
            inactive={!mobileDetailOpen}
            mobileModal={mobileDetailOpen}
            onClose={closeCandidateDetail}
            onDecision={(decision) => updateDecision(selectedCandidate.id, decision)}
            rank={selectedRank}
          />
        </div>
      ) : null}

      {isCompactLayout && mobileDetailOpen ? (
        <button
          aria-label={copy.candidateDetail.closeDetail}
          className="candidate-detail-scrim"
          onClick={closeCandidateDetail}
          type="button"
        />
      ) : null}

      {isScreeningOpen ? (
        <ScreeningModal
          aiConfigured={health.aiConfigured}
          job={displayJob}
          model={health.model}
          onClose={() => setIsScreeningOpen(false)}
          onComplete={applyScreeningResults}
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

"use client";

import { useEffect, useRef } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  FileCheck2,
  Fingerprint,
  Gauge,
  Lightbulb,
  Minus,
  ShieldCheck,
  Share2,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

import {
  candidateInitials,
  candidateName,
} from "@/lib/presentation";
import type { HumanDecision, ScreeningResult } from "@/lib/types";
import { ScoreRing } from "@/components/score-ring";
import { useLocale } from "@/components/locale-provider";
import { formatDuration, formatNumber } from "@/lib/i18n";

const statusIcons = {
  met: CheckCircle2,
  partial: CircleHelp,
  missing: XCircle,
  unclear: AlertCircle,
};

export function CandidateDetail({
  candidate,
  rank,
  blindMode,
  onDecision,
  onShare,
  onClose,
  inactive = false,
  mobileModal = false,
}: {
  candidate: ScreeningResult;
  rank: number;
  blindMode: boolean;
  onDecision: (decision: HumanDecision) => void;
  onShare: () => void;
  onClose?: () => void;
  inactive?: boolean;
  mobileModal?: boolean;
}) {
  const { copy, locale } = useLocale();
  const detailCopy = copy.candidateDetail;
  const displayName = candidateName(candidate, rank, blindMode, locale);
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!mobileModal) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(
        detailRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trapFocus);
    return () => window.removeEventListener("keydown", trapFocus);
  }, [mobileModal]);

  return (
    <aside
      aria-hidden={inactive || undefined}
      aria-label={detailCopy.assessmentLabel(displayName)}
      aria-modal={mobileModal || undefined}
      className="candidate-detail"
      inert={inactive || undefined}
      ref={detailRef}
      role={mobileModal ? "dialog" : undefined}
    >
      <div className="candidate-detail__topline">
        <span className="detail-index">#{formatNumber(rank, locale, { minimumIntegerDigits: 2 })}</span>
        <div className="detail-topline__meta">
          <span className={`confidence confidence--${candidate.confidence}`}>
            {detailCopy.confidenceLabel(copy.confidenceLabels[candidate.confidence])}
          </span>
          {onClose ? (
            <button
              aria-label={detailCopy.closeDetail}
              className="icon-button detail-close"
              data-detail-close
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          ) : null}
        </div>
      </div>

      <header className="candidate-detail__header">
        <div className="avatar avatar--large">
          {candidateInitials(candidate, rank, blindMode, locale)}
        </div>
        <div className="candidate-detail__identity">
          <h2 className="bidi-isolate" dir="auto">{displayName}</h2>
          <p className="bidi-isolate" dir="auto">{candidate.profile.currentRole}</p>
          <span>{detailCopy.yearsExperience(candidate.profile.yearsExperience)}</span>
        </div>
        <ScoreRing score={candidate.score} size="large" />
      </header>

      <div className="verdict-card">
        <div className="verdict-card__top">
          <span className={`recommendation recommendation--${candidate.recommendation}`}>
            <Sparkles aria-hidden="true" size={13} />
            {detailCopy.aiPrefix} {copy.recommendationLabels[candidate.recommendation]}
          </span>
          <span className="verdict-card__score">
            {formatNumber(candidate.score, locale)}/{formatNumber(100, locale)}
          </span>
        </div>
        <strong className="bidi-isolate" dir="auto">{candidate.verdict}</strong>
        <p className="bidi-isolate" dir="auto">{candidate.summary}</p>
      </div>

      {candidate.parseQuality ? (
        <section className="parse-quality-card" aria-label={locale === "fa" ? "کیفیت خوانش رزومه" : "Resume parse quality"}>
          <div>
            <span><FileCheck2 aria-hidden="true" size={16} /></span>
            <div>
              <strong>{locale === "fa" ? "کیفیت خوانش رزومه" : "Resume parse quality"}</strong>
              <small>{locale === "fa" ? "جدا از امتیاز تناسب شغلی" : "Separate from job-fit scoring"}</small>
            </div>
          </div>
          <strong>{formatNumber(candidate.parseQuality.score, locale)}%</strong>
          <div className="parse-quality-card__bar" aria-hidden="true"><i style={{ width: `${candidate.parseQuality.score}%` }} /></div>
          <div className="parse-quality-card__checks">
            {(["contact", "experience", "skills", "dates"] as const).map((key) => (
              <span className={`parse-check parse-check--${candidate.parseQuality?.[key]}`} key={key}>
                <CheckCircle2 aria-hidden="true" size={12} />
                {key} · {candidate.parseQuality?.[key]}
              </span>
            ))}
          </div>
          {candidate.parseQuality.warnings.map((warning) => <p className="bidi-isolate" dir="auto" key={warning}><AlertCircle aria-hidden="true" size={12} />{warning}</p>)}
        </section>
      ) : null}

      <button className="team-review-action" onClick={onShare} type="button">
        <span className="team-review-action__icon"><Share2 aria-hidden="true" size={18} /></span>
        <span>
          <strong>{locale === "fa" ? "اشتراک‌گذاری با تیم" : "Share with hiring team"}</strong>
          <small>{locale === "fa" ? "پیوند خصوصی، بازخورد و تاریخچه بررسی" : "Private link, feedback, and review history"}</small>
        </span>
        <ArrowRight aria-hidden="true" size={17} />
      </button>

      <section className="detail-section" aria-labelledby="human-decision-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{detailCopy.humanInLoop}</span>
            <h3 id="human-decision-title">{detailCopy.yourDecision}</h3>
          </div>
          {candidate.humanDecision ? (
            <button
              className="text-button"
              onClick={() => onDecision(null)}
              type="button"
            >
              {copy.common.clear}
            </button>
          ) : null}
        </div>
        <div className="decision-group" role="group" aria-label={detailCopy.decisionGroup}>
          {(["advance", "hold", "decline"] as const).map((decision) => (
            <button
              aria-pressed={candidate.humanDecision === decision}
              className={`decision-button decision-button--${decision}`}
              key={decision}
              onClick={() => onDecision(decision)}
              type="button"
            >
              {decision === "advance" ? (
                <ArrowRight aria-hidden="true" size={15} />
              ) : decision === "hold" ? (
                <Minus aria-hidden="true" size={15} />
              ) : (
                <X aria-hidden="true" size={15} />
              )}
              {copy.decisionLabels[decision]}
            </button>
          ))}
        </div>
        <p className="decision-note">
          {detailCopy.decisionNote}
        </p>
      </section>

      <section className="detail-section" aria-labelledby="rubric-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{detailCopy.weightedEvidence}</span>
            <h3 id="rubric-title">{detailCopy.scoreBreakdown}</h3>
          </div>
          <span className="sum-chip">Σ {formatNumber(100, locale)}</span>
        </div>
        <div className="rubric-list">
          {candidate.rubric.map((item) => (
            <article className="rubric-item" key={item.key}>
              <div className="rubric-item__heading">
                <span>{copy.rubricLabels[item.key]}</span>
                <strong>
                  {formatNumber(item.score, locale)}<small>/{formatNumber(item.maxScore, locale)}</small>
                </strong>
              </div>
              <div className="rubric-bar" aria-hidden="true">
                <span
                  style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                />
              </div>
              <p className="bidi-isolate" dir="auto">{item.rationale}</p>
              {item.evidence.length ? (
                <div className="evidence-line">
                  <FileCheck2 aria-hidden="true" size={13} />
                  <q className="bidi-isolate" dir="auto">{item.evidence[0]}</q>
                </div>
              ) : (
                <div className="evidence-line evidence-line--missing">
                  <AlertCircle aria-hidden="true" size={13} />
                  {detailCopy.noEvidence}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="detail-section" aria-labelledby="must-have-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{detailCopy.criticalRequirements}</span>
            <h3 id="must-have-title">{detailCopy.mustHaveChecks}</h3>
          </div>
          <Check aria-hidden="true" size={18} />
        </div>
        <div className="must-have-list">
          {candidate.mustHaves.map((item) => {
            const StatusIcon = statusIcons[item.status];
            return (
              <article className="must-have" key={item.requirement}>
                <StatusIcon
                  aria-hidden="true"
                  className={`must-have__icon must-have__icon--${item.status}`}
                  size={18}
                />
                <div>
                  <div className="must-have__title">
                    <strong className="bidi-isolate" dir="auto">{item.requirement}</strong>
                    <span className={`status-chip status-chip--${item.status}`}>
                      {copy.mustHaveStatusLabels[item.status]}
                    </span>
                  </div>
                  <p className="bidi-isolate" dir="auto">{item.evidence}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="detail-two-column">
        <section className="detail-section detail-section--compact">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{detailCopy.signal}</span>
              <h3>{detailCopy.strengths}</h3>
            </div>
          </div>
          <ul className="signal-list signal-list--positive">
            {candidate.strengths.map((strength) => (
              <li key={strength}>
                <CheckCircle2 aria-hidden="true" size={15} />
                <span className="bidi-isolate" dir="auto">{strength}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="detail-section detail-section--compact">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{detailCopy.uncertainty}</span>
              <h3>{detailCopy.evidenceGaps}</h3>
            </div>
          </div>
          <ul className="signal-list signal-list--gap">
            {candidate.gaps.map((gap) => (
              <li key={gap}>
                <CircleHelp aria-hidden="true" size={15} />
                <span className="bidi-isolate" dir="auto">{gap}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {candidate.risks.length ? (
        <section className="detail-section" aria-labelledby="risk-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{detailCopy.validateDoNotAssume}</span>
              <h3 id="risk-title">{detailCopy.riskFlags}</h3>
            </div>
          </div>
          <div className="risk-list">
            {candidate.risks.map((item) => (
              <article className="risk-item" key={item.risk}>
                <AlertCircle aria-hidden="true" size={17} />
                <div>
                  <strong className="bidi-isolate" dir="auto">{item.risk}</strong>
                  <p className="bidi-isolate" dir="auto">{item.evidence}</p>
                </div>
                <span className={`severity severity--${item.severity}`}>
                  {copy.severityLabels[item.severity]}
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="detail-section" aria-labelledby="questions-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">{detailCopy.closeEvidenceGaps}</span>
            <h3 id="questions-title">{detailCopy.interviewPlan}</h3>
          </div>
          <Lightbulb aria-hidden="true" size={18} />
        </div>
        <ol className="question-list">
          {candidate.interviewQuestions.map((item, index) => (
            <li key={item.question}>
              <span>{formatNumber(index + 1, locale, { minimumIntegerDigits: 2 })}</span>
              <div>
                <strong className="bidi-isolate" dir="auto">{item.question}</strong>
                <p className="bidi-isolate" dir="auto">{item.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="fairness-card" aria-label={detailCopy.fairnessGuardrail}>
        <ShieldCheck aria-hidden="true" size={20} />
        <div>
          <strong>{detailCopy.fairnessApplied}</strong>
          <p className="bidi-isolate" dir="auto">{candidate.fairnessNote}</p>
        </div>
      </section>

      <footer className="audit-footer">
        <div>
          <Fingerprint aria-hidden="true" size={14} />
          <span className="bidi-isolate" dir="auto">{candidate.meta.promptVersion}</span>
        </div>
        <div>
          <Gauge aria-hidden="true" size={14} />
          <span className="bidi-isolate" dir="auto">{candidate.meta.model}</span>
        </div>
        <div>
          <Clock3 aria-hidden="true" size={14} />
          <span>{formatDuration(candidate.meta.durationMs, locale)}</span>
        </div>
      </footer>
    </aside>
  );
}

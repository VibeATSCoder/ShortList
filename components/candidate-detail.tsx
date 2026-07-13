"use client";

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
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

import {
  candidateInitials,
  candidateName,
  decisionLabels,
  formatDuration,
  recommendationLabels,
} from "@/lib/presentation";
import type { HumanDecision, ScreeningResult } from "@/lib/types";
import { ScoreRing } from "@/components/score-ring";

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
  onClose,
}: {
  candidate: ScreeningResult;
  rank: number;
  blindMode: boolean;
  onDecision: (decision: HumanDecision) => void;
  onClose?: () => void;
}) {
  const displayName = candidateName(candidate, rank, blindMode);

  return (
    <aside className="candidate-detail" aria-label={`${displayName} assessment`}>
      <div className="candidate-detail__topline">
        <span className="detail-index">#{String(rank).padStart(2, "0")}</span>
        <div className="detail-topline__meta">
          <span className={`confidence confidence--${candidate.confidence}`}>
            {candidate.confidence} confidence
          </span>
          {onClose ? (
            <button
              aria-label="Close candidate detail"
              className="icon-button detail-close"
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
          {candidateInitials(candidate, rank, blindMode)}
        </div>
        <div className="candidate-detail__identity">
          <h2>{displayName}</h2>
          <p>{candidate.profile.currentRole}</p>
          <span>{candidate.profile.yearsExperience} years reported experience</span>
        </div>
        <ScoreRing score={candidate.score} size="large" />
      </header>

      <div className="verdict-card">
        <div className="verdict-card__top">
          <span className={`recommendation recommendation--${candidate.recommendation}`}>
            <Sparkles aria-hidden="true" size={13} />
            AI: {recommendationLabels[candidate.recommendation]}
          </span>
          <span className="verdict-card__score">{candidate.score}/100</span>
        </div>
        <strong>{candidate.verdict}</strong>
        <p>{candidate.summary}</p>
      </div>

      <section className="detail-section" aria-labelledby="human-decision-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Human in the loop</span>
            <h3 id="human-decision-title">Your decision</h3>
          </div>
          {candidate.humanDecision ? (
            <button
              className="text-button"
              onClick={() => onDecision(null)}
              type="button"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="decision-group" role="group" aria-label="Human decision">
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
              {decisionLabels[decision]}
            </button>
          ))}
        </div>
        <p className="decision-note">
          AI suggests; you decide. Decisions never feed back into this candidate&apos;s score.
        </p>
      </section>

      <section className="detail-section" aria-labelledby="rubric-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Weighted evidence</span>
            <h3 id="rubric-title">Score breakdown</h3>
          </div>
          <span className="sum-chip">Σ 100</span>
        </div>
        <div className="rubric-list">
          {candidate.rubric.map((item) => (
            <article className="rubric-item" key={item.key}>
              <div className="rubric-item__heading">
                <span>{item.label}</span>
                <strong>
                  {item.score}<small>/{item.maxScore}</small>
                </strong>
              </div>
              <div className="rubric-bar" aria-hidden="true">
                <span
                  style={{ width: `${(item.score / item.maxScore) * 100}%` }}
                />
              </div>
              <p>{item.rationale}</p>
              {item.evidence.length ? (
                <div className="evidence-line">
                  <FileCheck2 aria-hidden="true" size={13} />
                  <q>{item.evidence[0]}</q>
                </div>
              ) : (
                <div className="evidence-line evidence-line--missing">
                  <AlertCircle aria-hidden="true" size={13} />
                  No supporting resume evidence
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="detail-section" aria-labelledby="must-have-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Critical requirements</span>
            <h3 id="must-have-title">Must-have checks</h3>
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
                    <strong>{item.requirement}</strong>
                    <span className={`status-chip status-chip--${item.status}`}>
                      {item.status}
                    </span>
                  </div>
                  <p>{item.evidence}</p>
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
              <span className="section-kicker">Signal</span>
              <h3>Strengths</h3>
            </div>
          </div>
          <ul className="signal-list signal-list--positive">
            {candidate.strengths.map((strength) => (
              <li key={strength}>
                <CheckCircle2 aria-hidden="true" size={15} />
                {strength}
              </li>
            ))}
          </ul>
        </section>
        <section className="detail-section detail-section--compact">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Uncertainty</span>
              <h3>Evidence gaps</h3>
            </div>
          </div>
          <ul className="signal-list signal-list--gap">
            {candidate.gaps.map((gap) => (
              <li key={gap}>
                <CircleHelp aria-hidden="true" size={15} />
                {gap}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {candidate.risks.length ? (
        <section className="detail-section" aria-labelledby="risk-title">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Validate, don&apos;t assume</span>
              <h3 id="risk-title">Risk flags</h3>
            </div>
          </div>
          <div className="risk-list">
            {candidate.risks.map((item) => (
              <article className="risk-item" key={item.risk}>
                <AlertCircle aria-hidden="true" size={17} />
                <div>
                  <strong>{item.risk}</strong>
                  <p>{item.evidence}</p>
                </div>
                <span className={`severity severity--${item.severity}`}>
                  {item.severity}
                </span>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="detail-section" aria-labelledby="questions-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">Close the evidence gaps</span>
            <h3 id="questions-title">Interview plan</h3>
          </div>
          <Lightbulb aria-hidden="true" size={18} />
        </div>
        <ol className="question-list">
          {candidate.interviewQuestions.map((item, index) => (
            <li key={item.question}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.question}</strong>
                <p>{item.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="fairness-card" aria-label="Fairness guardrail">
        <ShieldCheck aria-hidden="true" size={20} />
        <div>
          <strong>Fairness guardrail applied</strong>
          <p>{candidate.fairnessNote}</p>
        </div>
      </section>

      <footer className="audit-footer">
        <div>
          <Fingerprint aria-hidden="true" size={14} />
          <span>{candidate.meta.promptVersion}</span>
        </div>
        <div>
          <Gauge aria-hidden="true" size={14} />
          <span>{candidate.meta.model}</span>
        </div>
        <div>
          <Clock3 aria-hidden="true" size={14} />
          <span>{formatDuration(candidate.meta.durationMs)}</span>
        </div>
      </footer>
    </aside>
  );
}


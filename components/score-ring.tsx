export function ScoreRing({
  score,
  size = "medium",
}: {
  score: number;
  size?: "small" | "medium" | "large";
}) {
  return (
    <div
      className={`score-ring score-ring--${size}`}
      role="img"
      aria-label={`${score} out of 100 fit score`}
      style={{ "--score": score } as React.CSSProperties}
    >
      <svg aria-hidden="true" viewBox="0 0 44 44">
        <circle className="score-ring__track" cx="22" cy="22" r="18" />
        <circle
          className="score-ring__value"
          cx="22"
          cy="22"
          r="18"
          pathLength="100"
        />
      </svg>
      <span>{score}</span>
    </div>
  );
}


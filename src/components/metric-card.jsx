const toneClassNames = {
  positive: "metric-card--positive",
  warning: "metric-card--warning",
  danger: "metric-card--danger",
  neutral: "metric-card--neutral",
};

function MetricCard({ label, value, helper, tone = "neutral" }) {
  return (
    <article className={`metric-card ${toneClassNames[tone] || toneClassNames.neutral}`}>
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
      {helper ? <p className="metric-card__helper">{helper}</p> : null}
    </article>
  );
}

export default MetricCard;

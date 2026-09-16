import { cn } from "@/lib/utils";
import { scoreBand } from "@/lib/scoring";

export function bandColor(score: number) {
  if (score >= 80) return "var(--color-signal-strong)";
  if (score >= 65) return "var(--color-signal-good)";
  if (score >= 45) return "var(--color-signal-fair)";
  return "var(--color-signal-weak)";
}

/** The number the whole product hangs on — keep it legible and honest. */
export function ScoreRing({
  score,
  size = 88,
  label,
  sublabel,
}: {
  score: number;
  size?: number;
  label?: string;
  sublabel?: string;
}) {
  const stroke = size < 60 ? 5 : 7;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = bandColor(score);

  return (
    <div className="flex items-center gap-3">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="var(--border)" strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 500ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-semibold tabular-nums leading-none"
            style={{ fontSize: size * 0.3 }}
          >
            {Math.round(score)}
          </span>
        </div>
      </div>
      {label ? (
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted">{sublabel ?? scoreBand(score)}</p>
        </div>
      ) : null}
    </div>
  );
}

export function SignalBar({
  label,
  score,
  detail,
  className,
}: {
  label: string;
  score: number;
  detail?: string;
  className?: string;
}) {
  return (
    <div className={cn("group", className)}>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{Math.round(score)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-subtle)] border">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(2, Math.min(100, score))}%`,
            background: bandColor(score),
            transition: "width 420ms cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </div>
      {detail ? <p className="mt-1 text-xs text-muted">{detail}</p> : null}
    </div>
  );
}

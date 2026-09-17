/**
 * Hand-drawn accents. Deliberately imperfect paths — a slightly wobbly line
 * reads as a human mark, a perfect bezier reads as a template.
 */

export function DoodleLeft({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 160" className={className} fill="none" aria-hidden>
      <path
        d="M118 12c-30 8-58 30-66 62-6 24 8 44 30 46 16 1 26-12 20-24-6-11-24-8-30 4-8 18 6 40 32 46"
        className="stroke-clay-400"
        strokeWidth="2.6" strokeLinecap="round"
      />
      <path d="M124 6l-9 4 5 8" className="stroke-clay-400" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 28l3 7M14 40l7 1M30 44l-5 5" className="stroke-clay-400" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleRight({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 160" className={className} fill="none" aria-hidden>
      <path
        d="M20 148c6-36 22-70 52-92 20-15 44-16 56-4 9 9 4 22-8 22-13 0-16-16-6-24"
        className="stroke-clay-400"
        strokeWidth="2.6" strokeLinecap="round"
      />
      <path d="M14 140l6 10 10-5" className="stroke-clay-400" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="118" cy="120" r="3" className="fill-clay-400" />
      <path d="M104 134l4 5M126 100l5-3" className="stroke-clay-400" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function DoodleCta({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 90" className={className} fill="none" aria-hidden>
      <path
        d="M6 70c30-30 60-42 96-38 30 3 50 22 60 42"
        className="stroke-clay-400"
        strokeWidth="2.6" strokeLinecap="round" strokeDasharray="1 7"
      />
      <path d="M156 66l8 10 10-8" className="stroke-clay-400" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M196 18l4 8M210 30l-8 3M204 12l-6 6" className="stroke-clay-400" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 2c1 6 4 9 10 10-6 1-9 4-10 10-1-6-4-9-10-10 6-1 9-4 10-10z"
        className="fill-clay-400"
      />
    </svg>
  );
}

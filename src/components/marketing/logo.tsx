export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-lg bg-brand-600 text-white">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" aria-hidden>
          <path
            d="M3 14c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 3 4"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight">Postwave</span>
      )}
    </span>
  );
}

export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-[1.05em] w-[1.05em] shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M12 3.5 L13.6 10.4 L20.5 12 L13.6 13.6 L12 20.5 L10.4 13.6 L3.5 12 L10.4 10.4 Z" fill="currentColor" />
        <circle cx="12" cy="12" r="2" fill="#b3122e" />
      </svg>
      <span className="display-wide text-[0.95em] tracking-[0.28em]">{name}</span>
    </span>
  );
}

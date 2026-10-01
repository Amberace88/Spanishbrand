export function Wordmark({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="h-[1.6em] w-[1.6em] shrink-0" aria-hidden="true">
        <g transform="translate(16 16)">
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} d="M-1.6 -15 L0 -10.5 L1.6 -15 Z" fill="#ffc629" transform={`rotate(${i * 30})`} />
          ))}
          <circle r="9.5" fill="#c8102e" />
          <circle r="4.2" fill="#ffc629" />
        </g>
      </svg>
      <span className="text-[1.05em] font-extrabold tracking-[0.2em] [font-variation-settings:'wdth'_110]">{name}</span>
    </span>
  );
}

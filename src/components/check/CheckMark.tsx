/** Logo : une case cochee, la coche en indigo. */
export function CheckMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true" className="shrink-0">
      <rect x="3.75" y="3.75" width="14.5" height="14.5" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
      <path d="M6.75 11.25 9.75 14.25 15.5 7.75" fill="none" stroke="var(--color-check)" strokeWidth="2.25" strokeLinecap="square" />
    </svg>
  );
}

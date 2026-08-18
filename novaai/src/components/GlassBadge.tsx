interface GlassBadgeProps {
  children: React.ReactNode;
  className?: string;
}

export default function GlassBadge({ children, className = '' }: GlassBadgeProps) {
  return (
    <span
      className={`inline-block border-l-2 border-white bg-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-white/90 backdrop-blur-md ${className}`}
    >
      {children}
    </span>
  );
}

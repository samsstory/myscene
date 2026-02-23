interface SectionLabelProps {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
}

export default function SectionLabel({ children, glow = false, className = "" }: SectionLabelProps) {
  return (
    <h3
      className={`text-sm uppercase tracking-[0.12em] font-semibold text-white/35 ${className}`}
      style={glow ? { textShadow: "0 0 8px rgba(255,255,255,0.2)" } : undefined}
    >
      {children}
    </h3>
  );
}

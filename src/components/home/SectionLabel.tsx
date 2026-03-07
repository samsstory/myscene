interface SectionLabelProps {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
}

export default function SectionLabel({ children, glow = false, className = "" }: SectionLabelProps) {
  return (
    <h3
      className={`text-base uppercase tracking-[0.10em] font-bold text-white/70 ${className}`}
      style={glow ? { textShadow: "0 0 10px rgba(255,255,255,0.25)" } : undefined}
    >
      {children}
    </h3>
  );
}

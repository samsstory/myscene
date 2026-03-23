interface BrandTaglineProps {
  className?: string;
}

export default function BrandTagline({ className = "" }: BrandTaglineProps) {
  return (
    <p
      className={`text-center text-white text-sm ${className}`}
      style={{ textShadow: "0 0 20px rgba(255,255,255,0.1)" }}
    >
      Every concert you've ever Scene.
    </p>
  );
}

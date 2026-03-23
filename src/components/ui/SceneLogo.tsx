import { cn } from "@/lib/utils";

interface SceneLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
};

const SceneLogo = ({ className, size = "md" }: SceneLogoProps) => {
  return (
    <span
      className={cn(
        "text-white tracking-[0.35em] uppercase select-none",
        sizeClasses[size],
        className
      )}
      style={{
        fontFamily: "'Rajdhani', sans-serif",
        fontWeight: 700,
        textShadow: "0 0 8px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.2)"
      }}
    >
      Scene ✦
    </span>
  );
};

export default SceneLogo;

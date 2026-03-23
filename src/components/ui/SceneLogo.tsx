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
        "text-white tracking-[0.30em] uppercase select-none",
        sizeClasses[size],
        className
      )}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 900,
        textShadow: "0 0 10px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.15)"
      }}
    >
      Scene ✦
    </span>
  );
};

export default SceneLogo;

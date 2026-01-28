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
        "text-white/75 font-black tracking-[0.25em] uppercase select-none",
        sizeClasses[size],
        className
      )}
      style={{
        textShadow: "0 0 8px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.2)"
      }}
    >
      Scene ✦
    </span>
  );
};

export default SceneLogo;

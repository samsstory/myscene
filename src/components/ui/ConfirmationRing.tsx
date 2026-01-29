import { cn } from "@/lib/utils";

interface ConfirmationRingProps {
  percentage: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  labelPosition?: "inside" | "right";
  className?: string;
}

/**
 * A circular progress ring showing ranking confirmation percentage.
 * Uses brand gradient (cyan → coral) for the progress stroke.
 */
const ConfirmationRing = ({ 
  percentage, 
  size = "md", 
  showLabel = true,
  labelPosition = "right",
  className 
}: ConfirmationRingProps) => {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  
  // Size configurations
  const sizeConfig = {
    sm: { 
      dimension: 24, 
      strokeWidth: 3, 
      fontSize: "text-[9px]",
      labelSize: "text-xs"
    },
    md: { 
      dimension: 36, 
      strokeWidth: 4, 
      fontSize: "text-[11px]",
      labelSize: "text-sm"
    },
    lg: { 
      dimension: 48, 
      strokeWidth: 5, 
      fontSize: "text-sm",
      labelSize: "text-base"
    },
  };
  
  const config = sizeConfig[size];
  const radius = (config.dimension - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPercentage / 100) * circumference;
  
  // Unique gradient ID for this instance
  const gradientId = `confirmation-gradient-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className={cn(
      "flex items-center gap-2",
      labelPosition === "inside" && "flex-col gap-0",
      className
    )}>
      <div 
        className="relative flex-shrink-0"
        style={{ width: config.dimension, height: config.dimension }}
      >
        <svg 
          width={config.dimension} 
          height={config.dimension} 
          className="transform -rotate-90"
        >
          {/* Gradient definition */}
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          
          {/* Background circle */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={config.strokeWidth}
          />
          
          {/* Progress circle */}
          <circle
            cx={config.dimension / 2}
            cy={config.dimension / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500 ease-out"
            style={{
              filter: clampedPercentage >= 100 
                ? 'drop-shadow(0 0 4px hsl(var(--primary)))' 
                : 'none'
            }}
          />
        </svg>
        
        {/* Inside label (percentage only, no "%" symbol for cleaner look) */}
        {showLabel && labelPosition === "inside" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className={cn(
                "font-bold text-white/90",
                config.fontSize
              )}
              style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}
            >
              {Math.round(clampedPercentage)}
            </span>
          </div>
        )}
      </div>
      
      {/* Right label */}
      {showLabel && labelPosition === "right" && (
        <span 
          className={cn(
            "font-semibold text-white/80",
            config.labelSize
          )}
          style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
        >
          {Math.round(clampedPercentage)}% Ranked
        </span>
      )}
    </div>
  );
};

export default ConfirmationRing;

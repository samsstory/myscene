import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  showHand?: boolean;
  tilt?: "left" | "right" | "none";
}

const PhoneMockup = ({ children, className, showHand = true, tilt = "none" }: PhoneMockupProps) => {
  const tiltClasses = {
    left: "rotate-[-8deg]",
    right: "rotate-[8deg]",
    none: "",
  };

  return (
    <div className={cn("relative", className)}>
      {/* Hand illustration (simplified CSS-based) */}
      {showHand && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[120%] h-24 z-0">
          {/* Wrist/palm area */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-20 rounded-t-[40%] opacity-20"
            style={{
              background: "linear-gradient(180deg, hsl(30 30% 70%) 0%, hsl(30 25% 50%) 100%)",
            }}
          />
          {/* Fingers wrapping around phone */}
          <div className="absolute bottom-12 left-[15%] w-4 h-16 bg-white/10 rounded-full rotate-[-15deg]" />
          <div className="absolute bottom-14 left-[22%] w-3.5 h-14 bg-white/10 rounded-full rotate-[-10deg]" />
          <div className="absolute bottom-14 right-[22%] w-3.5 h-14 bg-white/10 rounded-full rotate-[10deg]" />
          <div className="absolute bottom-12 right-[15%] w-4 h-16 bg-white/10 rounded-full rotate-[15deg]" />
        </div>
      )}

      {/* Phone frame */}
      <div 
        className={cn(
          "relative z-10 rounded-[2.5rem] p-2 shadow-2xl",
          "bg-gradient-to-b from-zinc-700 to-zinc-900",
          "border border-zinc-600",
          tiltClasses[tilt]
        )}
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Inner bezel */}
        <div className="rounded-[2rem] bg-black p-1 overflow-hidden">
          {/* Dynamic Island / Notch */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-20" />
          
          {/* Screen content */}
          <div className="relative rounded-[1.75rem] overflow-hidden bg-background aspect-[9/19.5]">
            {children}
          </div>
        </div>
        
        {/* Side buttons */}
        <div className="absolute right-[-3px] top-28 w-1 h-12 bg-zinc-600 rounded-r-sm" />
        <div className="absolute left-[-3px] top-20 w-1 h-8 bg-zinc-600 rounded-l-sm" />
        <div className="absolute left-[-3px] top-32 w-1 h-16 bg-zinc-600 rounded-l-sm" />
      </div>
    </div>
  );
};

export default PhoneMockup;

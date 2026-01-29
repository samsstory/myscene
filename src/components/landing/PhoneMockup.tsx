import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  tilt?: "left" | "right" | "none";
}

const PhoneMockup = ({ children, className, tilt = "none" }: PhoneMockupProps) => {
  const tiltClasses = {
    left: "rotate-[-8deg]",
    right: "rotate-[8deg]",
    none: "",
  };

  return (
    <div className={cn("relative", className)}>
      {/* Simplified phone frame - minimal chrome */}
      <div 
        className={cn(
          "relative rounded-[2rem] overflow-hidden",
          tiltClasses[tilt]
        )}
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Dynamic Island / Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-20" />
        
        {/* Screen content */}
        <div className="relative overflow-hidden bg-background aspect-[9/19.5]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PhoneMockup;

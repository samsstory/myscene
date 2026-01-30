import { LucideIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ConfirmationRing from "@/components/ui/ConfirmationRing";

import { RefObject } from "react";

export type StatPillAction = 'rankings' | 'calendar' | 'rank-tab' | 'show-detail' | 'globe' | null;

export interface StatPill {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  highlight?: boolean;
  action?: StatPillAction;
  actionPayload?: string;
  // For confirmation ring special rendering
  isConfirmationRing?: boolean;
  confirmationPercentage?: number;
}

interface StatPillsProps {
  stats: StatPill[];
  isLoading?: boolean;
  onPillTap?: (action: StatPillAction, payload?: string) => void;
  // Tour-related props for Step 5
  showsTourActive?: boolean;
  showsRef?: RefObject<HTMLButtonElement>;
}

const StatPills = ({ stats, isLoading, onPillTap, showsTourActive, showsRef }: StatPillsProps) => {
  if (isLoading) {
    return (
      <div className="flex gap-2 pb-2 items-center">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-20 rounded-xl flex-shrink-0 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-2 items-center">
        {stats.map((stat) => {
          const isInteractive = stat.action !== null && stat.action !== undefined;
          
          // Special rendering for confirmation ring
          if (stat.isConfirmationRing) {
            return (
              <button
                key={stat.id}
                onClick={() => isInteractive && onPillTap?.(stat.action!, stat.actionPayload)}
                disabled={!isInteractive}
                className={cn(
                  "flex-shrink-0 px-3 py-2 rounded-xl transition-all",
                  "bg-white/[0.03] backdrop-blur-sm",
                  isInteractive && "hover:bg-white/[0.08] active:scale-95 cursor-pointer",
                  !isInteractive && "cursor-default"
                )}
              >
                <div className="flex items-center gap-2">
                  <ConfirmationRing 
                    percentage={stat.confirmationPercentage || 0} 
                    size="sm" 
                    showLabel={false}
                  />
                  <div className="flex flex-col items-start">
                    <span 
                      className="text-sm font-bold text-white/90"
                      style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
                    >
                      {Math.round(stat.confirmationPercentage || 0)}% Ranked
                    </span>
                  </div>
                </div>
              </button>
            );
          }
          
          const isShowsPill = stat.id === 'total-shows';
          
          return (
            <button
              key={stat.id}
              ref={isShowsPill ? showsRef : undefined}
              data-tour={isShowsPill && !showsTourActive ? 'stat-shows' : undefined}
              onClick={() => isInteractive && onPillTap?.(stat.action!, stat.actionPayload)}
              disabled={!isInteractive}
              className={cn(
                "flex-shrink-0 px-3 py-2 rounded-xl transition-all text-center",
                "bg-white/[0.03] backdrop-blur-sm",
                isInteractive && "hover:bg-white/[0.08] active:scale-95 cursor-pointer",
                !isInteractive && "cursor-default",
                isShowsPill && showsTourActive && "opacity-0"
              )}
            >
              <div className="flex items-center justify-center gap-1.5">
                {stat.icon && (
                  <stat.icon 
                    className="h-3 w-3 text-white/40" 
                    style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.2))" }}
                  />
                )}
                <span className="text-[9px] uppercase tracking-[0.15em] text-white/50 font-medium">
                  {stat.label}
                </span>
              </div>
              <div className="mt-0.5">
                <span 
                  className="text-lg font-bold text-white/90"
                  style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
                >
                  {stat.value}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
};

export default StatPills;

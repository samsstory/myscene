import { LucideIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ConfirmationRing from "@/components/ui/ConfirmationRing";
import { ChevronRight } from "lucide-react";

import { RefObject } from "react";

export type StatPillAction = 'rankings' | 'calendar' | 'rank-tab' | 'show-detail' | 'globe' | 'todo-sheet' | null;

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
  // For todo pill
  isTodo?: boolean;
  todoItems?: string[];
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
      <div className="flex gap-2.5 pb-2 items-stretch">
        {[1, 2, 3].map((i) =>
          <Skeleton key={i} className="h-16 flex-1 rounded-2xl bg-white/[0.03]" />
        )}
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-stretch">
      {stats.map((stat) => {
        const isInteractive = stat.action !== null && stat.action !== undefined;
        const isShowsPill = stat.id === 'total-shows';
        const isTodoPill = stat.isTodo;

        // Special rendering for confirmation ring
        if (stat.isConfirmationRing) {
          return (
            <button
              key={stat.id}
              onClick={() => isInteractive && onPillTap?.(stat.action!, stat.actionPayload)}
              disabled={!isInteractive}
              className={cn(
                "flex-1 px-3 py-2.5 rounded-2xl transition-all duration-300",
                "bg-white/[0.04] backdrop-blur-md border border-white/[0.06]",
                isInteractive && "hover:bg-white/[0.08] active:scale-[0.97] cursor-pointer hover:border-white/[0.12]",
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

        // To-Do pill with attention-grabbing design
        if (isTodoPill) {
          return (
            <button
              key={stat.id}
              onClick={() => isInteractive && onPillTap?.(stat.action!, stat.actionPayload)}
              disabled={!isInteractive}
              className={cn(
                "flex-1 relative overflow-hidden rounded-2xl transition-all duration-300",
                "bg-white/[0.06] backdrop-blur-md border border-white/[0.12]",
                isInteractive && "hover:bg-white/[0.10] hover:border-white/[0.18] active:scale-[0.97] cursor-pointer",
                "group"
              )}
            >
              {/* Animated shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              
              <div className="relative px-3 py-3 flex items-center justify-center gap-2">
                {/* Pulsing dot */}
                <div className="relative shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse" />
                  <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-white/30 animate-ping" />
                </div>
                <span className="text-xs font-semibold text-white/80 tracking-wide">
                  {stat.label}
                </span>
                <ChevronRight className="w-3 h-3 text-primary/50 shrink-0" />
              </div>
            </button>
          );
        }

        return (
          <button
            key={stat.id}
            ref={isShowsPill ? showsRef : undefined}
            data-tour={isShowsPill && !showsTourActive ? 'stat-shows' : undefined}
            onClick={() => isInteractive && onPillTap?.(stat.action!, stat.actionPayload)}
            disabled={!isInteractive}
            className={cn(
              "flex-1 relative overflow-hidden rounded-2xl transition-all duration-300",
              "bg-white/[0.04] backdrop-blur-md border border-white/[0.06]",
              isInteractive && "hover:bg-white/[0.08] active:scale-[0.97] cursor-pointer hover:border-white/[0.12]",
              !isInteractive && "cursor-default",
              isShowsPill && showsTourActive && "opacity-0",
              "group"
            )}
          >
            {/* Subtle hover shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            
            <div className="relative px-3 py-3 flex items-center justify-center gap-2">
              {stat.icon && (
                <stat.icon className="h-4 w-4 text-white/50 shrink-0" />
              )}
              <span className="text-xs font-semibold text-white/70 tracking-wide">
                {stat.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default StatPills;

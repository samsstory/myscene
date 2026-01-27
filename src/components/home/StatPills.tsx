import { LucideIcon, ChevronRight } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type StatPillAction = 'rankings' | 'calendar' | 'rank-tab' | 'show-detail' | 'globe' | null;

export interface StatPill {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  highlight?: boolean;
  action?: StatPillAction;
  actionPayload?: string;
}

interface StatPillsProps {
  stats: StatPill[];
  isLoading?: boolean;
  onPillTap?: (action: StatPillAction, payload?: string) => void;
}

const StatPills = ({ stats, isLoading, onPillTap }: StatPillsProps) => {
  if (isLoading) {
    return (
      <div className="flex gap-3 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-24 rounded-2xl flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-3 pb-2">
        {stats.map((stat) => {
          const isInteractive = stat.action !== null && stat.action !== undefined;
          
          return (
            <button
              key={stat.id}
              onClick={() => isInteractive && onPillTap?.(stat.action!, stat.actionPayload)}
              disabled={!isInteractive}
              className={cn(
                "flex-shrink-0 px-4 py-3 rounded-2xl bg-card border transition-all text-left",
                stat.highlight 
                  ? "border-primary/30 bg-gradient-to-br from-primary/10 to-card" 
                  : "border-border",
                isInteractive && "hover:border-primary/50 hover:bg-accent/50 active:scale-95 cursor-pointer",
                !isInteractive && "cursor-default"
              )}
            >
              <div className="flex items-center gap-2">
                {stat.icon && <stat.icon className="h-3.5 w-3.5 text-primary" />}
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className={cn(
                  "text-xl font-bold",
                  stat.highlight && "bg-gradient-primary bg-clip-text text-transparent"
                )}>
                  {stat.value}
                </span>
                {isInteractive && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                )}
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

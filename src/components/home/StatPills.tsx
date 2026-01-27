import { LucideIcon } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface StatPill {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  highlight?: boolean;
}

interface StatPillsProps {
  stats: StatPill[];
  isLoading?: boolean;
}

const StatPills = ({ stats, isLoading }: StatPillsProps) => {
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
        {stats.map((stat) => (
          <div
            key={stat.id}
            className={cn(
              "flex-shrink-0 px-4 py-3 rounded-2xl bg-card border transition-colors",
              stat.highlight 
                ? "border-primary/30 bg-gradient-to-br from-primary/10 to-card" 
                : "border-border"
            )}
          >
            <div className="flex items-center gap-2">
              {stat.icon && <stat.icon className="h-3.5 w-3.5 text-primary" />}
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <div className={cn(
              "text-xl font-bold mt-0.5",
              stat.highlight && "bg-gradient-primary bg-clip-text text-transparent"
            )}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" className="invisible" />
    </ScrollArea>
  );
};

export default StatPills;

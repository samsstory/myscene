import { Sparkles, Trophy, Flame, Target, Music2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightType = 
  | 'new_personal_best'
  | 'milestone_reached'
  | 'streak_active'
  | 'ranking_reminder'
  | 'welcome'
  | null;

export type InsightAction = 'rank-tab' | 'calendar' | 'rankings' | null;

export interface InsightData {
  type: InsightType;
  title: string;
  message: string;
  actionable?: boolean;
  action?: InsightAction;
}

interface DynamicInsightProps {
  insight: InsightData | null;
  onAction?: (action: InsightAction) => void;
}

const insightConfig: Record<NonNullable<InsightType>, { icon: typeof Sparkles; gradient: string }> = {
  new_personal_best: { 
    icon: Trophy, 
    gradient: "from-[hsl(45,93%,58%)]/20 to-transparent border-[hsl(45,93%,58%)]/30" 
  },
  milestone_reached: { 
    icon: Sparkles, 
    gradient: "from-primary/20 to-transparent border-primary/30" 
  },
  streak_active: { 
    icon: Flame, 
    gradient: "from-[hsl(var(--accent))]/20 to-transparent border-[hsl(var(--accent))]/30" 
  },
  ranking_reminder: { 
    icon: Target, 
    gradient: "from-secondary/20 to-transparent border-secondary/30" 
  },
  welcome: { 
    icon: Music2, 
    gradient: "from-primary/20 to-transparent border-primary/30" 
  },
};

const DynamicInsight = ({ insight, onAction }: DynamicInsightProps) => {
  if (!insight || !insight.type) return null;

  const config = insightConfig[insight.type];
  const Icon = config.icon;
  const isActionable = insight.actionable && insight.action;

  const content = (
    <div className={cn(
      "p-4 rounded-xl bg-gradient-to-r border transition-all",
      config.gradient,
      isActionable && "cursor-pointer hover:border-primary/50 active:scale-[0.98]"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium">{insight.title}</span>
        </div>
        {isActionable && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{insight.message}</p>
    </div>
  );

  if (isActionable) {
    return (
      <button 
        onClick={() => onAction?.(insight.action!)} 
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  return content;
};

export default DynamicInsight;

import { Sparkles, Trophy, Flame, Target, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightType = 
  | 'new_personal_best'
  | 'milestone_reached'
  | 'streak_active'
  | 'ranking_reminder'
  | 'welcome'
  | null;

export interface InsightData {
  type: InsightType;
  title: string;
  message: string;
}

interface DynamicInsightProps {
  insight: InsightData | null;
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

const DynamicInsight = ({ insight }: DynamicInsightProps) => {
  if (!insight || !insight.type) return null;

  const config = insightConfig[insight.type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "p-4 rounded-xl bg-gradient-to-r border",
      config.gradient
    )}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary flex-shrink-0" />
        <span className="text-sm font-medium">{insight.title}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{insight.message}</p>
    </div>
  );
};

export default DynamicInsight;

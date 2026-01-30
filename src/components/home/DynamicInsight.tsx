import { Sparkles, Trophy, Flame, Target, Music2, ChevronRight, Star, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightType = 
  | 'new_personal_best'
  | 'milestone_reached'
  | 'streak_active'
  | 'ranking_reminder'
  | 'incomplete_ratings'
  | 'missing_photos'
  | 'welcome'
  | null;

export type InsightAction = 'rank-tab' | 'calendar' | 'rankings' | 'incomplete-ratings' | 'missing-photos' | null;

export interface InsightData {
  type: InsightType;
  title: string;
  message: string;
  actionable?: boolean;
  action?: InsightAction;
}

interface DynamicInsightProps {
  insights: InsightData[];
  onAction?: (action: InsightAction) => void;
}

const insightConfig: Record<NonNullable<InsightType>, { icon: typeof Sparkles }> = {
  new_personal_best: { icon: Trophy },
  milestone_reached: { icon: Sparkles },
  streak_active: { icon: Flame },
  ranking_reminder: { icon: Target },
  incomplete_ratings: { icon: Star },
  missing_photos: { icon: Camera },
  welcome: { icon: Music2 },
};

const InsightCard = ({ 
  insight, 
  onAction 
}: { 
  insight: InsightData; 
  onAction?: (action: InsightAction) => void;
}) => {
  if (!insight.type) return null;

  const config = insightConfig[insight.type];
  const Icon = config.icon;
  const isActionable = insight.actionable && insight.action;

  const content = (
    <div className={cn(
      "px-4 py-3 rounded-xl transition-all",
      "bg-white/[0.03] backdrop-blur-sm",
      isActionable && "cursor-pointer hover:bg-white/[0.08] active:scale-[0.98]"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon 
            className="h-4 w-4 text-white/50 flex-shrink-0" 
            style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.3))" }}
          />
          <span 
            className="text-sm font-semibold text-white/90"
            style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}
          >
            {insight.title}
          </span>
        </div>
        {isActionable && (
          <ChevronRight 
            className="h-4 w-4 text-white/30" 
            style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.2))" }}
          />
        )}
      </div>
      <p 
        className="text-sm text-white/50 mt-1"
        style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}
      >
        {insight.message}
      </p>
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

const DynamicInsight = ({ insights, onAction }: DynamicInsightProps) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight, index) => (
        <InsightCard 
          key={`${insight.type}-${index}`} 
          insight={insight} 
          onAction={onAction} 
        />
      ))}
    </div>
  );
};

export default DynamicInsight;

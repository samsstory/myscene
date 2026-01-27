import { Calendar, Trophy, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type DiscoveryView = 'calendar' | 'rankings' | 'globe';

interface DiscoveryCardsProps {
  onNavigate: (view: DiscoveryView) => void;
}

const features: { id: DiscoveryView; icon: typeof Calendar; label: string }[] = [
  { id: 'calendar', icon: Calendar, label: 'Calendar' },
  { id: 'rankings', icon: Trophy, label: 'Rankings' },
  { id: 'globe', icon: Globe, label: 'Globe' },
];

const DiscoveryCards = ({ onNavigate }: DiscoveryCardsProps) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      {features.map((feature) => (
        <button
          key={feature.id}
          onClick={() => onNavigate(feature.id)}
          className={cn(
            "flex flex-col items-center p-4 rounded-xl",
            "bg-card border border-border",
            "hover:bg-accent/50 hover:border-primary/30 transition-all duration-200",
            "active:scale-95"
          )}
        >
          <feature.icon className="h-6 w-6 text-primary mb-2" />
          <span className="text-sm font-medium">{feature.label}</span>
        </button>
      ))}
    </div>
  );
};

export default DiscoveryCards;

import { cn } from "@/lib/utils";

interface MapHoverCardProps {
  title: string;
  subtitle: string;
  className?: string;
}

const MapHoverCard = ({ title, subtitle, className }: MapHoverCardProps) => {
  return (
    <div className={cn(
      "backdrop-blur-xl bg-black/50 border border-white/20 rounded-xl p-4 shadow-2xl",
      "animate-fade-in",
      className
    )}>
      <h3 className="font-semibold text-white text-lg">{title}</h3>
      <p className="text-sm text-white/70 mt-0.5">{subtitle}</p>
    </div>
  );
};

export default MapHoverCard;

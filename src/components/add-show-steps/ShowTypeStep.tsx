import { Music, Layers, Tent } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShowType = 'set' | 'show' | 'festival';

interface ShowTypeStepProps {
  onSelect: (type: ShowType) => void;
}

const types = [
  {
    value: 'set' as ShowType,
    icon: Music,
    label: 'Set',
    description: '1 artist, 1 performance.',
  },
  {
    value: 'show' as ShowType,
    icon: Layers,
    label: 'Show',
    description: 'Multiple sets, different artists, 1 event.',
  },
  {
    value: 'festival' as ShowType,
    icon: Tent,
    label: 'Festival',
    description: 'Multiple artists, multiple sets, multiple stages.',
  },
];

const ShowTypeStep = ({ onSelect }: ShowTypeStepProps) => {
  return (
    <div className="space-y-4 w-full">
      <p className="text-sm text-muted-foreground text-center">
        What are you logging?
      </p>

      <div className="grid grid-cols-3 gap-3">
        {types.map(({ value, icon: Icon, label, description }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className={cn(
              "flex flex-col items-center text-center p-4 rounded-xl gap-3 transition-all duration-200",
              "bg-white/[0.03] backdrop-blur-sm border border-white/[0.08]",
              "hover:border-primary/50 hover:bg-primary/5",
              "hover:shadow-[0_0_16px_hsl(189_94%_55%/0.2)]",
              "active:scale-[0.97]"
            )}
          >
            <Icon className="h-7 w-7 text-primary" />
            <div>
              <div className="font-semibold text-sm leading-tight">{label}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-snug">{description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ShowTypeStep;

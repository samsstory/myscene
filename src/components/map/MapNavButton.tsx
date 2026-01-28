import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapNavButtonProps {
  viewLevel: 'country' | 'city' | 'venue';
  onClick: () => void;
}

const MapNavButton = ({ 
  viewLevel, 
  onClick 
}: MapNavButtonProps) => {
  // Only show when drilled in (not at world level)
  if (viewLevel === 'country') {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-white",
        "backdrop-blur-xl bg-black/40 border border-white/10",
        "hover:bg-black/60 hover:scale-105 active:scale-95 cursor-pointer"
      )}
    >
      <Globe className="h-4 w-4" />
      <span className="font-medium">World</span>
    </button>
  );
};

export default MapNavButton;

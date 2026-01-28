import { ArrowLeft, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapNavButtonProps {
  viewLevel: 'country' | 'city' | 'venue';
  selectedCountry: string | null;
  selectedCity: string | null;
  hasHistory: boolean;
  onClick: () => void;
}

const MapNavButton = ({ 
  viewLevel, 
  selectedCountry, 
  selectedCity, 
  hasHistory,
  onClick 
}: MapNavButtonProps) => {
  // Determine button text and icon
  const getButtonContent = () => {
    if (viewLevel === 'venue' && selectedCity) {
      return { icon: ArrowLeft, text: selectedCity };
    }
    if (viewLevel === 'city' && selectedCountry) {
      return { icon: ArrowLeft, text: selectedCountry };
    }
    // World level
    return { icon: Globe, text: 'World' };
  };

  const { icon: Icon, text } = getButtonContent();
  const isClickable = viewLevel !== 'country' || hasHistory;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-white",
        "backdrop-blur-xl bg-black/40 border border-white/10",
        isClickable 
          ? "hover:bg-black/60 hover:scale-105 active:scale-95 cursor-pointer" 
          : "opacity-60 cursor-default"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{text}</span>
    </button>
  );
};

export default MapNavButton;

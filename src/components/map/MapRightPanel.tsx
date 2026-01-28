import { MapPin } from "lucide-react";

interface MapRightPanelProps {
  showsWithoutLocation: number;
  isLocationCardExpanded: boolean;
  onToggleLocationCard: () => void;
}

const MapRightPanel = ({
  showsWithoutLocation,
  isLocationCardExpanded,
  onToggleLocationCard,
}: MapRightPanelProps) => {
  // Only render if there are shows without location and card is minimized
  if (showsWithoutLocation === 0 || isLocationCardExpanded) {
    return null;
  }

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
      <button
        onClick={onToggleLocationCard}
        className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-full p-3 shadow-2xl flex items-center gap-2 transition-all hover:bg-black/60 hover:scale-105 active:scale-95"
      >
        <MapPin className="h-5 w-5 text-destructive" />
        <span className="text-sm font-bold text-destructive pr-1">
          {showsWithoutLocation}
        </span>
      </button>
    </div>
  );
};

export default MapRightPanel;

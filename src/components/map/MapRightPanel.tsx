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
        className="relative backdrop-blur-xl bg-black/40 border border-white/10 rounded-full p-3 shadow-2xl transition-all hover:bg-black/60 hover:scale-105 active:scale-95"
      >
        <MapPin className="h-6 w-6 text-white" />
        {/* Notification badge */}
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center px-1.5 text-xs font-bold text-white bg-destructive rounded-full shadow-lg">
          {showsWithoutLocation}
        </span>
      </button>
    </div>
  );
};

export default MapRightPanel;

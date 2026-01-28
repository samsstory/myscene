import { Globe, Building2, MapPin, Music } from "lucide-react";

interface MapRightPanelProps {
  totalShows: number;
  totalCountries: number;
  totalCities: number;
  totalVenues: number;
  showsWithoutLocation: number;
  isLocationCardExpanded: boolean;
  onToggleLocationCard: () => void;
}

const MapRightPanel = ({
  totalShows,
  totalCountries,
  totalCities,
  totalVenues,
  showsWithoutLocation,
  isLocationCardExpanded,
  onToggleLocationCard,
}: MapRightPanelProps) => {
  const stats = [
    { icon: Music, value: totalShows, label: "Shows" },
    { icon: Globe, value: totalCountries, label: "Countries" },
    { icon: Building2, value: totalCities, label: "Cities" },
    { icon: MapPin, value: totalVenues, label: "Venues" },
  ];

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
      <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-2xl p-3 shadow-2xl">
        {/* Location notification - only show when there are shows without location and card is minimized */}
        {showsWithoutLocation > 0 && !isLocationCardExpanded && (
          <button
            onClick={onToggleLocationCard}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-destructive/20 border border-destructive/30 mb-3 transition-colors hover:bg-destructive/30"
          >
            <MapPin className="h-4 w-4 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {showsWithoutLocation}
            </span>
          </button>
        )}

        {/* Vertical stats stack */}
        <div className="flex flex-col gap-3">
          {stats.map((stat, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="p-2 rounded-lg bg-primary/20">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-lg font-bold text-white leading-tight mt-1">
                {stat.value}
              </span>
              <span className="text-[9px] text-white/60 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapRightPanel;

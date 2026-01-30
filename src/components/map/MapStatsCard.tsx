interface MapStatsCardProps {
  totalShows: number;
  totalCountries: number;
  totalCities: number;
  totalVenues: number;
}

const MapStatsCard = ({ 
  totalShows, 
  totalCountries, 
  totalCities, 
  totalVenues 
}: MapStatsCardProps) => {
  return (
    <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-white/[0.03] backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <span className="text-white/70 text-[11px] font-medium">{totalCountries}</span>
        <span className="text-white/40 text-[10px]">countries</span>
      </div>
      <span className="text-white/20">·</span>
      <div className="flex flex-col items-center">
        <span className="text-white/70 text-[11px] font-medium">{totalCities}</span>
        <span className="text-white/40 text-[10px]">cities</span>
      </div>
      <span className="text-white/20">·</span>
      <div className="flex flex-col items-center">
        <span className="text-white/70 text-[11px] font-medium">{totalVenues}</span>
        <span className="text-white/40 text-[10px]">venues</span>
      </div>
      <span className="text-white/20">·</span>
      <div className="flex flex-col items-center">
        <span className="text-white/70 text-[11px] font-medium">{totalShows}</span>
        <span className="text-white/40 text-[10px]">shows</span>
      </div>
    </div>
  );
};

export default MapStatsCard;

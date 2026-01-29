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
    <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] backdrop-blur-sm">
      <span className="text-white/70 text-[11px] font-medium">
        {totalCountries} <span className="text-white/40">countries</span>
      </span>
      <span className="text-white/20">·</span>
      <span className="text-white/70 text-[11px] font-medium">
        {totalCities} <span className="text-white/40">cities</span>
      </span>
      <span className="text-white/20">·</span>
      <span className="text-white/70 text-[11px] font-medium">
        {totalVenues} <span className="text-white/40">venues</span>
      </span>
      <span className="text-white/20">·</span>
      <span className="text-white/70 text-[11px] font-medium">
        {totalShows} <span className="text-white/40">shows</span>
      </span>
    </div>
  );
};

export default MapStatsCard;

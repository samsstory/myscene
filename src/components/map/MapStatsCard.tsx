import { Globe, Building2, MapPin, Music } from "lucide-react";

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
  const stats = [
    { icon: Music, value: totalShows, label: "Shows" },
    { icon: Globe, value: totalCountries, label: "Countries" },
    { icon: Building2, value: totalCities, label: "Cities" },
    { icon: MapPin, value: totalVenues, label: "Venues" },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl p-3 shadow-2xl">
        <div className="flex items-center gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <stat.icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-lg font-bold text-white leading-none">{stat.value}</p>
                <p className="text-[10px] text-white/60 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapStatsCard;

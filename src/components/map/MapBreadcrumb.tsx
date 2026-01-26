import { ChevronRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapBreadcrumbProps {
  viewLevel: 'country' | 'city' | 'venue';
  selectedCountry: string | null;
  selectedCity: string | null;
  onNavigate: (level: 'country' | 'city') => void;
}

const MapBreadcrumb = ({ 
  viewLevel, 
  selectedCountry, 
  selectedCity, 
  onNavigate 
}: MapBreadcrumbProps) => {
  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onNavigate('country')}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
          viewLevel === 'country' 
            ? "text-primary font-medium" 
            : "text-muted-foreground hover:text-foreground hover:bg-white/10"
        )}
      >
        <Globe className="h-3.5 w-3.5" />
        <span>World</span>
      </button>

      {selectedCountry && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <button
            onClick={() => onNavigate('city')}
            className={cn(
              "px-2 py-1 rounded-md transition-colors",
              viewLevel === 'city'
                ? "text-primary font-medium"
                : viewLevel === 'venue'
                  ? "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  : "text-foreground font-medium"
            )}
          >
            {selectedCountry}
          </button>
        </>
      )}

      {selectedCity && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="px-2 py-1 text-primary font-medium">
            {selectedCity}
          </span>
        </>
      )}
    </div>
  );
};

export default MapBreadcrumb;

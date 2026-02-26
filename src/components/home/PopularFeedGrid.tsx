import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Zap, ChevronDown, MapPin, Globe, Map, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import type { PopularItem, ShowTypeFilter } from "@/hooks/usePopularShows";
import type { GeoScope } from "@/hooks/usePopularNearMe";

export interface CityOverride {
  name: string;
  lat: number;
  lng: number;
}

interface PopularFeedGridProps {
  items: PopularItem[];
  totalUsers: number;
  isLoading: boolean;
  showType: ShowTypeFilter;
  onShowTypeChange: (t: ShowTypeFilter) => void;
  onQuickAdd: (item: PopularItem) => void;
  emptyMessage?: string;
  geoScope: GeoScope;
  onGeoScopeChange: (scope: GeoScope) => void;
  cityName?: string | null;
  countryName?: string | null;
  onCityOverride?: (city: CityOverride | null) => void;
}

const TYPE_PILLS: { id: ShowTypeFilter; label: string }[] = [
  { id: "set", label: "Sets" },
  { id: "show", label: "Shows" },
  { id: "festival", label: "Festivals" },
];

const GEO_OPTIONS: { id: GeoScope; label: string; icon: typeof MapPin }[] = [
  { id: "city", label: "Nearby", icon: MapPin },
  { id: "country", label: "Country", icon: Map },
  { id: "world", label: "Worldwide", icon: Globe },
];

function getTitle(): string {
  return "The Scene Charts";
}

/** Extract short city name: "Los Angeles, California, United States" → "Los Angeles" */
function shortCity(full: string): string {
  return full.split(",")[0].trim() || full;
}

function getGeoLabel(geoScope: GeoScope, cityName?: string | null, countryName?: string | null): string {
  if (geoScope === "city" && cityName) return shortCity(cityName);
  if (geoScope === "country" && countryName) return countryName;
  return GEO_OPTIONS.find(g => g.id === geoScope)?.label ?? "Nearby";
}

function StatsLine({ item }: { item: PopularItem }) {
  const hasWinRate = item.winRate !== null && item.matchupCount > 0;

  if (!hasWinRate) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Users className="h-3 w-3" />
        <span>{item.userCount} {item.userCount === 1 ? "user" : "users"}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
      <span className="flex items-center gap-0.5 text-amber-400/90 font-medium">
        <Zap className="h-3 w-3" />
        {item.winRate}% wins
      </span>
      <span className="text-white/20">·</span>
      <span>{item.matchupCount} matchups</span>
      <span className="text-white/20">·</span>
      <span className="flex items-center gap-0.5">
        <Users className="h-3 w-3" />
        {item.userCount}
      </span>
    </span>
  );
}

function CommunityCard({ item, onQuickAdd }: { item: PopularItem; onQuickAdd: () => void }) {
  const name = item.type === "artist" ? item.artistName : item.eventName;
  const imageUrl = item.type === "artist" ? item.artistImageUrl : item.imageUrl;
  const venue = item.type === "artist" ? item.sampleVenueName : item.venueName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 py-3 group"
    >
      {/* Artist/Event image */}
      <div className="relative h-12 w-12 rounded-xl overflow-hidden shrink-0 border border-white/[0.08]">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-white/[0.06]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{name}</p>
        <p className="text-[11px] text-muted-foreground truncate leading-tight">{venue || ""}</p>
        <StatsLine item={item} />
      </div>

      {/* Add CTA */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
        className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white/50 text-[10px] font-medium hover:bg-primary/15 hover:text-primary hover:border-primary/30 transition-colors"
        aria-label="Add to My Scene"
      >
        <Plus className="h-3 w-3" />
        <span className="hidden sm:inline">Log</span>
      </motion.button>
    </motion.div>
  );
}

function GeoDropdown({
  geoScope,
  onChange,
  cityName,
  countryName,
  onCityOverride,
}: {
  geoScope: GeoScope;
  onChange: (s: GeoScope) => void;
  cityName?: string | null;
  countryName?: string | null;
  onCityOverride?: (city: CityOverride | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CityOverride[]>([]);
  const [searching, setSearching] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const label = getGeoLabel(geoScope, cityName, countryName);

  const searchCity = useCallback((q: string) => {
    setQuery(q);
    if (timeout.current) clearTimeout(timeout.current);
    if (q.length < 2) { setSuggestions([]); return; }
    timeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?types=place&limit=5&access_token=${MAPBOX_TOKEN}`
        );
        const data = await res.json();
        setSuggestions((data.features || []).map((f: any) => ({
          name: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        })));
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 300);
  }, []);

  const selectCity = (city: CityOverride) => {
    onCityOverride?.(city);
    onChange("city");
    setOpen(false);
    setQuery("");
    setSuggestions([]);
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setQuery(""); setSuggestions([]); } }}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.1em] font-semibold text-muted-foreground hover:text-foreground/60 transition-colors">
          Showing: {label}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1.5 bg-card border-border z-50" align="start" sideOffset={6}>
        {/* City search input */}
        <div className="relative mb-1.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => searchCity(e.target.value)}
            placeholder="Search city…"
            className="h-7 text-xs bg-muted/50 border-border text-foreground placeholder:text-muted-foreground pl-7 pr-3"
          />
        </div>

        {/* Search results */}
        {searching && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="mb-1.5 max-h-36 overflow-y-auto rounded-lg border border-border bg-background">
            {suggestions.map((city, i) => (
              <button
                key={i}
                onClick={() => selectCity(city)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-foreground/70 hover:bg-muted transition-colors border-b border-border last:border-b-0"
              >
                <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{city.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Geo scope options */}
        {GEO_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = geoScope === opt.id;
          const displayLabel = opt.id === "city" && cityName ? shortCity(cityName)
            : opt.id === "country" && countryName ? countryName
            : opt.label;
          return (
            <button
              key={opt.id}
              onClick={() => { onChange(opt.id); setOpen(false); setQuery(""); setSuggestions([]); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground/70"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {displayLabel}
            </button>
          );
        })}

        {/* Reset to home city */}
        {onCityOverride && (
          <button
            onClick={() => { onCityOverride(null); onChange("city"); setOpen(false); }}
            className="w-full text-[10px] text-primary/60 hover:text-primary py-1.5 transition-colors"
          >
            Reset to home city
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SubTabs({ active, onChange }: { active: ShowTypeFilter; onChange: (t: ShowTypeFilter) => void }) {
  return (
    <div className="flex gap-1.5">
      {TYPE_PILLS.map((pill) => (
        <button
          key={pill.id}
          onClick={() => onChange(pill.id)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-semibold border transition-colors",
            active === pill.id
              ? "bg-white/10 border-white/20 text-white/70"
              : "bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
          )}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}

export default function PopularFeedGrid({
  items,
  totalUsers,
  isLoading,
  showType,
  onShowTypeChange,
  onQuickAdd,
  emptyMessage,
  geoScope,
  onGeoScopeChange,
  cityName,
  countryName,
  onCityOverride,
}: PopularFeedGridProps) {
  const title = getTitle();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="text-[11px] text-muted-foreground">Shows that dominate their matchups</p>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <GeoDropdown geoScope={geoScope} onChange={onGeoScopeChange} cityName={cityName} countryName={countryName} onCityOverride={onCityOverride} />
        <div className="w-px h-4 bg-white/[0.08]" />
        <SubTabs active={showType} onChange={onShowTypeChange} />
      </div>

      {/* Empty message */}
      {emptyMessage && !isLoading && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>{emptyMessage}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="rounded-2xl border border-amber-500/[0.08] bg-amber-500/[0.02] px-3 space-y-0">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 py-3">
              <div className="h-12 w-12 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-28 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-2.5 w-20 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-2.5 w-36 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !emptyMessage && items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>No {showType === "set" ? "sets" : showType === "show" ? "shows" : "festivals"} found yet.</p>
        </div>
      )}

      {/* Cards list */}
      {!isLoading && items.length > 0 && (
        <div className="rounded-2xl border border-amber-500/[0.08] bg-amber-500/[0.02] divide-y divide-white/[0.05] px-3">
          {items.map((item) => (
            <CommunityCard
              key={item.type === "artist" ? item.artistName : item.eventName}
              item={item}
              onQuickAdd={() => onQuickAdd(item)}
            />
          ))}
        </div>
      )}

      {/* Community context */}
      {!isLoading && items.length > 0 && totalUsers > 0 && (
        <p className="text-[10px] text-white/25 text-center tracking-wide uppercase">
          Based on {totalUsers} {totalUsers === 1 ? "user" : "users"} in the Scene community
        </p>
      )}
    </div>
  );
}

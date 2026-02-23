import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Search, X, Loader2, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MAPBOX_TOKEN } from "@/lib/mapbox";

interface CityOverride {
  name: string;
  lat: number;
  lng: number;
}

interface InlineCityPickerProps {
  currentCity: string;
  onCityChange: (city: CityOverride | null) => void;
}

export default function InlineCityPicker({ currentCity, onCityChange }: InlineCityPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CityOverride[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const search = useCallback((q: string) => {
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

  const select = (city: CityOverride) => {
    onCityChange(city);
    setOpen(false);
    setQuery("");
    setSuggestions([]);
  };

  const reset = () => {
    onCityChange(null);
    setOpen(false);
    setQuery("");
    setSuggestions([]);
  };

  // Short display name: "Austin, TX, United States" → "Austin"
  const shortName = currentCity.split(",")[0].trim() || "Your City";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.10] text-[11px] text-white/50 hover:bg-white/[0.10] hover:text-white/70 transition-all"
      >
        <MapPin className="w-3 h-3" />
        {shortName}
        <ChevronDown className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search city…"
          className="h-8 text-xs bg-white/[0.04] border-white/[0.10] text-white/80 placeholder:text-white/25 focus:border-primary/40 pl-8 pr-8"
        />
        <button
          onClick={() => { setOpen(false); setQuery(""); setSuggestions([]); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2"
        >
          <X className="h-3.5 w-3.5 text-white/30 hover:text-white/60" />
        </button>
      </div>

      {searching && (
        <div className="flex justify-center py-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-xl bg-white/[0.06] border border-white/[0.10] overflow-hidden">
          {suggestions.map((city, i) => (
            <button
              key={i}
              onClick={() => select(city)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs text-white/70 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-b-0"
            >
              <MapPin className="h-3 w-3 text-white/25 shrink-0" />
              <span className="truncate">{city.name}</span>
            </button>
          ))}
        </div>
      )}

      {currentCity && (
        <button onClick={reset} className="text-[10px] text-primary/60 hover:text-primary transition-colors">
          Reset to home city
        </button>
      )}
    </div>
  );
}

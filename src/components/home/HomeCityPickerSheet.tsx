import { memo, useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Search, X, Loader2, Navigation } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CityResult {
  name: string;
  lat: number;
  lng: number;
}

interface HomeCityPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCitySaved: () => void;
}

function HomeCityPickerSheetInner({ open, onOpenChange, onCitySaved }: HomeCityPickerSheetProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setQuery("");
      setSuggestions([]);
    }
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
        setSuggestions((data.features || []).map((f: Record<string, unknown>) => ({
          name: (f as { place_name: string }).place_name,
          lat: (f as { center: number[] }).center[1],
          lng: (f as { center: number[] }).center[0],
        })));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const saveCity = useCallback(async (city: CityResult) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update({
          home_city: city.name,
          home_latitude: city.lat,
          home_longitude: city.lng,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success(`Home city set to ${city.name.split(",")[0]}`);
      onCitySaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to save city");
    } finally {
      setSaving(false);
    }
  }, [onCitySaved, onOpenChange]);

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Location not supported");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${pos.coords.longitude},${pos.coords.latitude}.json?types=place&limit=1&access_token=${MAPBOX_TOKEN}`
          );
          const data = await res.json();
          const feature = data.features?.[0];
          if (feature) {
            await saveCity({
              name: feature.place_name,
              lat: feature.center[1],
              lng: feature.center[0],
            });
          } else {
            toast.error("Could not detect city");
          }
        } catch {
          toast.error("Location lookup failed");
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        toast.error("Location permission denied");
        setDetectingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [saveCity]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh]">
        <SheetHeader>
          <SheetTitle className="text-base font-bold tracking-tight">Set Your Home City</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Auto-detect button */}
          <Button
            variant="glass"
            className="w-full gap-2 text-sm"
            onClick={detectLocation}
            disabled={detectingLocation || saving}
          >
            {detectingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
            Use my current location
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-muted-foreground uppercase tracking-wider">or search</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search for a city…"
              className="pl-9 pr-9 bg-white/[0.04] border-white/[0.10] text-foreground placeholder:text-muted-foreground/50"
              disabled={saving}
            />
            {query && (
              <button
                onClick={() => { setQuery(""); setSuggestions([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Loading */}
          {searching && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Results */}
          {suggestions.length > 0 && (
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
              {suggestions.map((city, i) => (
                <button
                  key={i}
                  onClick={() => saveCity(city)}
                  disabled={saving}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-b-0 disabled:opacity-50"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{city.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

const HomeCityPickerSheet = memo(HomeCityPickerSheetInner);
export default HomeCityPickerSheet;

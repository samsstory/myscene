import { memo, useState, useRef, useCallback } from "react";
import { MapPin, Search, X, Loader2, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/components/success/SuccessPrimitives";

interface CityResult {
  name: string;
  lat: number;
  lng: number;
}

interface ProfileSetupSheetProps {
  onComplete: () => void;
}

function ProfileSetupSheetInner({ onComplete }: ProfileSetupSheetProps) {
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchCity = useCallback((q: string) => {
    setCityQuery(q);
    setSelectedCity(null);
    if (timeout.current) clearTimeout(timeout.current);
    if (q.length < 2) {
      setCitySuggestions([]);
      return;
    }
    timeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?types=place&limit=5&access_token=${MAPBOX_TOKEN}`
        );
        const data = await res.json();
        setCitySuggestions(
          (data.features || []).map((f: Record<string, unknown>) => ({
            name: (f as { place_name: string }).place_name,
            lat: (f as { center: number[] }).center[1],
            lng: (f as { center: number[] }).center[0],
          }))
        );
      } catch {
        setCitySuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const pickCity = useCallback((city: CityResult) => {
    setSelectedCity(city);
    setCityQuery(city.name.split(",")[0]);
    setCitySuggestions([]);
  }, []);

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
            const city: CityResult = {
              name: feature.place_name,
              lat: feature.center[1],
              lng: feature.center[0],
            };
            pickCity(city);
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
  }, [pickCity]);

  const handleSave = useCallback(async () => {
    if (!selectedCity) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          home_city: selectedCity.name,
          home_latitude: selectedCity.lat,
          home_longitude: selectedCity.lng,
        })
        .eq("id", user.id);

      if (error) throw error;
      onComplete();
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }, [selectedCity, onComplete]);

  const isValid = selectedCity !== null;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="text-center space-y-6 py-4"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/[0.12] border border-primary/30 flex items-center justify-center">
          <MapPin className="h-7 w-7 text-primary" strokeWidth={1.5} />
        </div>
        <h2
          className="text-2xl font-bold tracking-tight"
          style={{ textShadow: "0 0 24px hsl(189 94% 55% / 0.25)" }}
        >
          Where's your scene?
        </h2>
        <p className="text-sm text-muted-foreground">
          Set your home city so you can discover shows nearby.
        </p>
      </motion.div>

      {/* Home City */}
      <motion.div variants={fadeUp} className="space-y-2 text-left">
        <Label htmlFor="home-city" className="text-xs text-muted-foreground uppercase tracking-wider">
          Home City
        </Label>

        {/* Auto-detect */}
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
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[11px] text-muted-foreground uppercase tracking-wider">
            or search
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={cityInputRef}
            id="home-city"
            value={cityQuery}
            onChange={(e) => searchCity(e.target.value)}
            placeholder="Search for a city…"
            className="pl-9 pr-9 bg-white/[0.04] border-white/[0.10] text-foreground placeholder:text-muted-foreground/50"
            disabled={saving}
          />
          {cityQuery && (
            <button
              onClick={() => {
                setCityQuery("");
                setCitySuggestions([]);
                setSelectedCity(null);
              }}
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
        {citySuggestions.length > 0 && (
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
            {citySuggestions.map((city, i) => (
              <button
                key={i}
                onClick={() => pickCity(city)}
                disabled={saving}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-b-0 disabled:opacity-50"
              >
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{city.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected city confirmation */}
        {selectedCity && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <MapPin className="h-3.5 w-3.5" />
            <span>{selectedCity.name.split(",")[0]}</span>
          </div>
        )}
      </motion.div>

      {/* CTA */}
      <motion.div variants={fadeUp} className="pt-2">
        <Button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Let's go
        </Button>
      </motion.div>
    </motion.div>
  );
}

const ProfileSetupSheet = memo(ProfileSetupSheetInner);
export default ProfileSetupSheet;

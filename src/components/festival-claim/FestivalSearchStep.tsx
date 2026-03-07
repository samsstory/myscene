import { useState } from "react";
import { Search, Music, MapPin, Calendar, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

export interface FestivalResult {
  id: string;
  event_name: string;
  year: number;
  venue_name: string | null;
  venue_location: string | null;
  date_start: string | null;
  date_end: string | null;
  venue_id: string | null;
  artists: { name: string; day?: string; stage?: string; matched?: boolean }[];
}

interface FestivalSearchStepProps {
  onSelect: (festival: FestivalResult) => void;
  onUploadFallback?: () => void;
}

const FestivalSearchStep = ({ onSelect, onUploadFallback }: FestivalSearchStepProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FestivalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from("festival_lineups")
      .select("id, event_name, year, venue_name, venue_location, date_start, date_end, venue_id, artists")
      .ilike("event_name", `%${value.trim()}%`)
      .order("year", { ascending: false })
      .limit(20);

    if (!error && data) {
      setResults(
        data.map((r) => ({
          ...r,
          artists: Array.isArray(r.artists) ? (r.artists as FestivalResult["artists"]) : [],
        }))
      );
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search festivals…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9 bg-white/[0.05] border-white/[0.09]"
          autoFocus
        />
      </div>

      {loading && (
        <p className="text-xs text-muted-foreground text-center py-4">Searching…</p>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {results.map((fest) => (
            <motion.button
              key={fest.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(fest)}
              className="w-full rounded-xl border border-white/[0.09] bg-white/[0.05] px-4 py-3 text-left transition-colors hover:bg-white/[0.08]"
            >
              <p className="text-sm font-semibold text-foreground">
                {fest.event_name}{" "}
                <span className="text-muted-foreground font-normal">{fest.year}</span>
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                {fest.venue_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {fest.venue_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {fest.artists.length} artists
                </span>
                {fest.date_start && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(fest.date_start + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-8 space-y-3">
          <p className="text-sm text-muted-foreground">
            No festivals found for "{query}"
          </p>
          {onUploadFallback && (
            <button
              type="button"
              onClick={onUploadFallback}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Camera className="h-3 w-3" />
              Upload a lineup photo to add it
            </button>
          )}
        </div>
      )}

      {!searched && !loading && (
        <p className="text-xs text-muted-foreground/60 text-center pt-4">
          Try "Coachella", "Tomorrowland", or "Lollapalooza"
        </p>
      )}
    </div>
  );
};

export default FestivalSearchStep;

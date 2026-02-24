import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { MAPBOX_TOKEN } from "@/lib/mapbox";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Star, MapPin, Music, Link2, Search, Building2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Suggestion {
  id: string;
  entity_type: string;
  entity_id: string | null;
  suggestion_type: string;
  title: string;
  details: Record<string, unknown>;
  status: string;
  created_at: string;
}

interface VenueRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}

const TYPE_COLORS: Record<string, string> = {
  duplicate: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  missing_data: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  name_mismatch: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const TYPE_ICONS: Record<string, typeof Star> = {
  duplicate: MapPin,
  missing_data: Link2,
  name_mismatch: Music,
};

export function SuggestionCard({
  suggestion: s,
  onResolve,
}: {
  suggestion: Suggestion;
  onResolve: (id: string, status: "approved" | "dismissed", edits?: Record<string, Partial<VenueRow>>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [merging, setMerging] = useState(false);
  const editsRef = useRef<Record<string, Partial<VenueRow>>>({});
  const Icon = TYPE_ICONS[s.suggestion_type] || Star;

  const handleApprove = async () => {
    setMerging(true);
    await onResolve(s.id, "approved", editsRef.current);
    setMerging(false);
  };

  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[s.suggestion_type] || ""}`}>
              {s.suggestion_type.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{s.entity_type}</Badge>
          </div>
          {renderHeader(s)}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {s.status === "pending" && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-300" onClick={handleApprove} disabled={merging}>
                {merging ? <div className="h-4 w-4 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onResolve(s.id, "dismissed")} disabled={merging}>
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      {expanded && renderExpanded(s, editsRef)}
    </div>
  );
}

// ─── Smart Combo: Google Places + Mapbox Cities ─────────────────────

interface GeoResult {
  name: string;
  fullAddress: string;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  source: "place" | "city";
}

async function fetchGooglePlaces(query: string): Promise<GeoResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke("search-places", {
      body: { query: query.trim() },
    });
    if (error) throw error;
    return ((data?.results || []) as Omit<GeoResult, "source">[]).slice(0, 5).map((r) => ({ ...r, source: "place" as const }));
  } catch {
    return [];
  }
}

async function fetchMapboxCities(query: string): Promise<GeoResult[]> {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=place,region,country&limit=4&access_token=${MAPBOX_TOKEN}`
    );
    const data = await res.json();
    return ((data.features || []) as any[]).map((f: any) => {
      const ctx = (f.context || []) as any[];
      const getCtx = (id: string) => ctx.find((c: any) => c.id?.startsWith(id))?.text || "";
      return {
        name: f.text,
        fullAddress: f.place_name,
        city: f.place_type?.includes("place") ? f.text : getCtx("place") || undefined,
        country: getCtx("country") || undefined,
        latitude: f.center[1],
        longitude: f.center[0],
        source: "city" as const,
      };
    });
  } catch {
    return [];
  }
}

function LocationSearchInput({
  value,
  onChange,
  onSelectGeo,
  venueName,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelectGeo: (r: GeoResult) => void;
  venueName?: string;
  placeholder?: string;
  className?: string;
}) {
  const [placeResults, setPlaceResults] = useState<GeoResult[]>([]);
  const [cityResults, setCityResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (value.length < 2) { setPlaceResults([]); setCityResults([]); return; }
    const placeQuery = venueName && !value.toLowerCase().includes(venueName.toLowerCase())
      ? `${venueName} ${value}`
      : value;
    // Only search cities if query doesn't look like a specific venue name
    const isGenericQuery = !venueName || !value.toLowerCase().includes(venueName.toLowerCase().split(" ")[0]);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      const [places, cities] = await Promise.all([
        fetchGooglePlaces(placeQuery),
        isGenericQuery ? fetchMapboxCities(value) : Promise.resolve([]),
      ]);
      setPlaceResults(places);
      setCityResults(cities);
      setOpen(true);
      setLoading(false);
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [value, venueName]);

  const hasResults = placeResults.length > 0 || cityResults.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-6 pr-6 ${className || ""}`}
          onFocus={() => hasResults && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {loading && <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 border border-muted-foreground/40 border-t-foreground rounded-full animate-spin" />}
      </div>
      {open && hasResults && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/[0.1] bg-popover shadow-lg max-h-56 overflow-y-auto">
          {cityResults.length > 0 && (
            <>
              <div className="px-2 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5" /> Cities
              </div>
              {cityResults.map((r, i) => (
                <button
                  key={`city-${i}`}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); onSelectGeo(r); setOpen(false); }}
                >
                  <div className="font-medium text-foreground">{r.name}</div>
                  <div className="text-muted-foreground text-[10px] truncate">{r.fullAddress}</div>
                </button>
              ))}
            </>
          )}
          {placeResults.length > 0 && (
            <>
              <div className="px-2 pt-1.5 pb-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5" /> Places
              </div>
              {placeResults.map((r, i) => (
                <button
                  key={`place-${i}`}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); onSelectGeo(r); setOpen(false); }}
                >
                  <div className="font-medium text-foreground">{r.name}</div>
                  <div className="text-muted-foreground text-[10px] truncate">{r.fullAddress}</div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Editable Venue Table ──────────────────────────────────────────────

function EditableVenueTable({ canonical, duplicates, editsRef }: { canonical: VenueRow; duplicates: VenueRow[]; editsRef: React.MutableRefObject<Record<string, Partial<VenueRow>>> }) {
  const allRows = [canonical, ...duplicates];
  const [edits, setEdits] = useState<Record<string, Partial<VenueRow>>>({});

  useEffect(() => { editsRef.current = edits; }, [edits, editsRef]);

  const getValue = (row: VenueRow, key: keyof VenueRow) => {
    return edits[row.id]?.[key] !== undefined ? edits[row.id][key] : row[key];
  };

  const setValue = (rowId: string, key: keyof VenueRow, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [key]: value || null },
    }));
  };

  const applyGeo = (rowId: string, r: GeoResult) => {
    setEdits((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        location: r.fullAddress,
        city: r.city || prev[rowId]?.city || null,
        country: r.country || prev[rowId]?.country || null,
        latitude: r.latitude || prev[rowId]?.latitude || null,
        longitude: r.longitude || prev[rowId]?.longitude || null,
      },
    }));
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Column headers */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "auto 1fr 2fr" }}>
        <div className="w-16" />
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">Name</div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">Location</div>
      </div>

      {allRows.map((row, idx) => {
        const isCanon = idx === 0;
        return (
          <div key={row.id} className={`rounded-md border p-2 ${
            isCanon ? "border-amber-500/30 bg-amber-500/5" : "border-white/[0.06] bg-white/[0.01]"
          }`}>
            <div className="grid gap-2 items-center" style={{ gridTemplateColumns: "auto 1fr 2fr" }}>
              {/* Label pill */}
              <div className="flex items-center gap-1 w-16">
                {isCanon && <Star className="h-3 w-3 text-amber-400 shrink-0" />}
                <span className={`text-[10px] font-medium uppercase tracking-wider ${isCanon ? "text-amber-400" : "text-muted-foreground"}`}>
                  {isCanon ? "Keep" : "Dup"}
                </span>
              </div>

              {/* Name — plain editable input */}
              <Input
                value={String(getValue(row, "name") ?? "")}
                onChange={(e) => setValue(row.id, "name", e.target.value)}
                placeholder="Name"
                className="h-6 text-xs bg-black/20 border-white/[0.08] px-1.5"
              />

              {/* Location — search combo input */}
              <LocationSearchInput
                value={String(getValue(row, "location") ?? "")}
                onChange={(val) => setValue(row.id, "location", val)}
                onSelectGeo={(r) => applyGeo(row.id, r)}
                venueName={String(getValue(row, "name") ?? "")}
                placeholder="Search venue or city…"
                className="h-6 text-xs bg-black/20 border-white/[0.08]"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Render helpers ────────────────────────────────────────────────────

function renderHeader(s: Suggestion) {
  const d = s.details as any;

  if (s.suggestion_type === "duplicate" && s.entity_type === "venue") {
    const count = (d.duplicates?.length || 0) + 1;
    return (
      <p className="text-sm font-medium">
        {count} records for "{d.canonical?.name || d.normalized_name}"
        <span className="text-muted-foreground font-normal ml-1.5 text-xs">
          · {d.duplicates?.length} to merge
        </span>
      </p>
    );
  }

  if (s.suggestion_type === "missing_data" && s.entity_type === "venue") {
    const missing = (d.missing_fields as string[]) || [];
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">"{d.venue_name}"</p>
        <div className="flex flex-wrap gap-1">
          {missing.map((f: string) => (
            <Badge key={f} variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
              missing {f}
            </Badge>
          ))}
        </div>
      </div>
    );
  }

  if (s.suggestion_type === "name_mismatch") {
    if (d.match_type === "exact_case") {
      const variants = (d.variants as Array<{ name: string; count: number }>) || [];
      const best = variants.reduce((a, b) => (b.count > a.count ? b : a), variants[0]);
      return (
        <div className="space-y-1">
          <p className="text-sm font-medium">Case mismatch</p>
          <div className="flex flex-wrap gap-1.5">
            {variants.map((v) => (
              <span key={v.name} className={`text-xs ${v.name === best?.name ? "text-foreground font-medium" : "text-muted-foreground line-through"}`}>
                "{v.name}" ×{v.count}
              </span>
            ))}
          </div>
        </div>
      );
    }
    return (
      <p className="text-sm font-medium">
        "{d.name_a}" ≈ "{d.name_b}" <span className="text-muted-foreground font-normal">({d.similarity}%)</span>
      </p>
    );
  }

  if (s.suggestion_type === "missing_data" && s.entity_type === "show") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">Unlinked: "{d.venue_name}"</p>
        <div className="flex items-center gap-1.5 text-xs">
          <Link2 className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400 font-medium">Link to:</span>
          <span className="text-foreground">"{d.candidate_venue_name}"</span>
        </div>
      </div>
    );
  }

  return <p className="text-sm font-medium">{s.title}</p>;
}

function renderExpanded(s: Suggestion, editsRef: React.MutableRefObject<Record<string, Partial<VenueRow>>>) {
  const d = s.details as any;

  if (s.suggestion_type === "duplicate" && s.entity_type === "venue" && d.canonical) {
    return <EditableVenueTable canonical={d.canonical} duplicates={d.duplicates || []} editsRef={editsRef} />;
  }

  return (
    <pre className="mt-3 text-xs text-muted-foreground bg-black/20 rounded p-2 overflow-x-auto">
      {JSON.stringify(d, null, 2)}
    </pre>
  );
}

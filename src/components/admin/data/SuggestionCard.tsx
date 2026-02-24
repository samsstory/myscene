import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Star, MapPin, Music, Link2, Search } from "lucide-react";
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
  onResolve: (id: string, status: "approved" | "dismissed") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[s.suggestion_type] || Star;

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
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-300" onClick={() => onResolve(s.id, "approved")}>
                <CheckCircle2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => onResolve(s.id, "dismissed")}>
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>
      {expanded && renderExpanded(s)}
    </div>
  );
}

// ─── Venue Search (Google Places + Foursquare via search-venues) ─────

interface VenueResult {
  name: string;
  location: string;
}

function VenueSearch({ onSelect }: { onSelect: (r: VenueResult) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VenueResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 3) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("search-venues", {
          body: { searchTerm: query, showType: "venue" },
        });
        if (error) throw error;
        const venues: VenueResult[] = (data?.primary || [])
          .concat(data?.other || [])
          .map((v: any) => ({ name: v.name, location: v.location }));
        setResults(venues.slice(0, 8));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search venue name…"
          className="h-7 text-xs pl-7 bg-black/20 border-white/[0.08]"
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {loading && <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 border border-muted-foreground/40 border-t-foreground rounded-full animate-spin" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/[0.1] bg-popover shadow-lg max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent/50 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); onSelect(r); setQuery(""); setOpen(false); }}
            >
              <div className="font-medium text-foreground">{r.name}</div>
              <div className="text-muted-foreground text-[10px] truncate">{r.location}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Editable Venue Table ──────────────────────────────────────────────

const VENUE_FIELDS: { key: keyof VenueRow; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "location", label: "Address" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
];

function EditableVenueTable({ canonical, duplicates }: { canonical: VenueRow; duplicates: VenueRow[] }) {
  const allRows = [canonical, ...duplicates];
  const [edits, setEdits] = useState<Record<string, Partial<VenueRow>>>({});

  const getValue = (row: VenueRow, key: keyof VenueRow) => {
    return edits[row.id]?.[key] !== undefined ? edits[row.id][key] : row[key];
  };

  const setValue = (rowId: string, key: keyof VenueRow, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [rowId]: { ...prev[rowId], [key]: value || null },
    }));
  };

  const applyVenue = async (rowId: string, r: VenueResult) => {
    // Look up the cached venue in the DB to get coordinates
    const { data: venue } = await supabase
      .from("venues")
      .select("name, location, city, country, latitude, longitude")
      .eq("name", r.name)
      .eq("location", r.location)
      .maybeSingle();

    setEdits((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        name: r.name,
        location: r.location,
        city: venue?.city || prev[rowId]?.city || null,
        country: venue?.country || prev[rowId]?.country || null,
        latitude: venue?.latitude ? Number(venue.latitude) : prev[rowId]?.latitude || null,
        longitude: venue?.longitude ? Number(venue.longitude) : prev[rowId]?.longitude || null,
      },
    }));
  };

  return (
    <div className="mt-2 space-y-3">
      {/* Table header */}
      <div className="grid gap-1" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr" }}>
        {VENUE_FIELDS.map((f) => (
          <div key={f.key} className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-1">
            {f.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      {allRows.map((row, idx) => {
        const isCanon = idx === 0;
        return (
          <div key={row.id} className={`rounded-md border p-2 space-y-1.5 ${
            isCanon ? "border-amber-500/30 bg-amber-500/5" : "border-white/[0.06] bg-white/[0.01]"
          }`}>
            {/* Row label */}
            <div className="flex items-center gap-1.5 mb-1">
              {isCanon && <Star className="h-3 w-3 text-amber-400" />}
              <span className={`text-[10px] font-medium uppercase tracking-wider ${isCanon ? "text-amber-400" : "text-muted-foreground"}`}>
                {isCanon ? "Keep" : "Duplicate"}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono ml-auto">{row.id.slice(0, 8)}…</span>
            </div>

            {/* Editable fields grid */}
            <div className="grid gap-1" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr" }}>
              {VENUE_FIELDS.map((f) => (
                <Input
                  key={f.key}
                  value={String(getValue(row, f.key) ?? "")}
                  onChange={(e) => setValue(row.id, f.key, e.target.value)}
                  placeholder={f.label}
                  className="h-6 text-xs bg-black/20 border-white/[0.08] px-1.5"
                />
              ))}
            </div>

            {/* Venue search */}
            <VenueSearch onSelect={(r) => applyVenue(row.id, r)} />
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

function renderExpanded(s: Suggestion) {
  const d = s.details as any;

  if (s.suggestion_type === "duplicate" && s.entity_type === "venue" && d.canonical) {
    return <EditableVenueTable canonical={d.canonical} duplicates={d.duplicates || []} />;
  }

  return (
    <pre className="mt-3 text-xs text-muted-foreground bg-black/20 rounded p-2 overflow-x-auto">
      {JSON.stringify(d, null, 2)}
    </pre>
  );
}

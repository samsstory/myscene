import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Star, MapPin, Music, Link2 } from "lucide-react";
import { useState } from "react";

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
          {renderBody(s, expanded)}
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
    </div>
  );
}

/** Renders a key-value field row */
function Field({ label, value, highlight }: { label: string; value: unknown; highlight?: boolean }) {
  const display = value === null || value === undefined ? "—" : String(value);
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="text-muted-foreground w-20 shrink-0 text-right">{label}</span>
      <span className={
        isEmpty ? "text-muted-foreground/50 italic" :
        highlight ? "text-foreground font-medium" : "text-foreground"
      }>
        {isEmpty ? "null" : display}
      </span>
    </div>
  );
}

/** Renders a full venue record like a DB row */
function VenueRecord({ data, isCanonical }: { data: any; isCanonical?: boolean }) {
  return (
    <div className={`rounded-md border p-2 space-y-0.5 ${
      isCanonical 
        ? "border-amber-500/30 bg-amber-500/5" 
        : "border-white/[0.06] bg-white/[0.01]"
    }`}>
      <div className="flex items-center gap-1.5 mb-1">
        {isCanonical && <Star className="h-3 w-3 text-amber-400" />}
        <span className={`text-[10px] font-medium uppercase tracking-wider ${isCanonical ? "text-amber-400" : "text-muted-foreground"}`}>
          {isCanonical ? "Keep (canonical)" : "Duplicate — will merge"}
        </span>
      </div>
      <Field label="id" value={data.id} />
      <Field label="name" value={data.name} highlight />
      <Field label="city" value={data.city} />
      <Field label="country" value={data.country} />
      <Field label="location" value={data.location} />
      <Field label="latitude" value={data.latitude} />
      <Field label="longitude" value={data.longitude} />
    </div>
  );
}

function renderBody(s: Suggestion, expanded: boolean) {
  const d = s.details as any;

  // Duplicate venues — show full DB records
  if (s.suggestion_type === "duplicate" && s.entity_type === "venue") {
    const dupeCount = (d.duplicates?.length || 0) + 1;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium">{dupeCount} records for "{d.canonical?.name || d.normalized_name}"</p>
        {expanded ? (
          <div className="space-y-2 mt-2">
            <VenueRecord data={d.canonical} isCanonical />
            {(d.duplicates || []).map((dup: any) => (
              <VenueRecord key={dup.id} data={dup} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Expand to see all {dupeCount} records · {d.duplicates?.length} will be merged
          </p>
        )}
      </div>
    );
  }

  // Missing venue metadata
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
        {expanded && (
          <div className="mt-2 rounded-md border border-white/[0.06] bg-white/[0.01] p-2 space-y-0.5">
            <Field label="id" value={d.venue_id} />
            <Field label="name" value={d.venue_name} highlight />
            {missing.map((f: string) => (
              <Field key={f} label={f} value={null} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Artist name mismatch
  if (s.suggestion_type === "name_mismatch") {
    if (d.match_type === "exact_case") {
      const variants = (d.variants as Array<{ name: string; count: number }>) || [];
      const best = variants.reduce((a, b) => (b.count > a.count ? b : a), variants[0]);
      return (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Case mismatch</p>
          <div className="space-y-0.5">
            {variants.map((v) => (
              <div key={v.name} className="flex items-center gap-1.5 text-xs">
                {v.name === best?.name && <Star className="h-3 w-3 text-amber-400" />}
                <span className={v.name === best?.name ? "text-foreground font-medium" : "text-muted-foreground line-through"}>
                  "{v.name}"
                </span>
                <span className="text-muted-foreground">×{v.count}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">
          "{d.name_a}" ≈ "{d.name_b}" <span className="text-muted-foreground font-normal">({d.similarity}%)</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {d.count_a} vs {d.count_b} occurrences — review if same artist
        </p>
      </div>
    );
  }

  // Unlinked show → venue
  if (s.suggestion_type === "missing_data" && s.entity_type === "show") {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium">Unlinked: "{d.venue_name}"</p>
        <div className="flex items-center gap-1.5 text-xs">
          <Link2 className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400 font-medium">Link to:</span>
          <span className="text-foreground">"{d.candidate_venue_name}"</span>
          <span className="text-muted-foreground font-mono">{truncateId(d.candidate_venue_id)}</span>
        </div>
      </div>
    );
  }

  return <p className="text-sm font-medium">{s.title}</p>;
}

function truncateId(id?: string) {
  if (!id) return "";
  return id.slice(0, 8) + "…";
}

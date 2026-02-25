import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Plus, X, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export interface LineupArtist {
  name: string;
  day?: string;
  stage?: string;
  /** false = OCR extracted but not matched to canonical DB (low confidence) */
  matched?: boolean;
}

interface LineupSelectionGridProps {
  artists: LineupArtist[];
  onConfirm: (selected: string[]) => void;
  festivalName?: string;
  isSubmitting?: boolean;
  initialSelected?: Set<string>;
  ctaLabel?: string;
}

const ArtistCard = ({
  name,
  selected,
  onToggle,
  lowConfidence,
}: {
  name: string;
  selected: boolean;
  onToggle: () => void;
  lowConfidence?: boolean;
}) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.95 }}
    onClick={onToggle}
    className={cn(
      "relative flex items-center gap-2 rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors min-h-[48px]",
      selected
        ? "bg-primary/20 border-primary text-foreground"
        : "bg-white/[0.04] border-white/[0.08] text-muted-foreground hover:bg-white/[0.08]"
    )}
  >
    {lowConfidence && (
      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
    )}
    <span className="truncate flex-1">{name}</span>
    {selected && (
      <div className="flex-shrink-0 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
        <Check className="h-2.5 w-2.5 text-primary-foreground" />
      </div>
    )}
  </motion.button>
);

const DayGroup = ({
  day,
  artists,
  selected,
  onToggle,
}: {
  day: string;
  artists: LineupArtist[];
  selected: Set<string>;
  onToggle: (name: string) => void;
}) => {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{day}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-2 gap-2 pb-3">
          {artists.map((a) => (
            <ArtistCard
              key={a.name}
              name={a.name}
              selected={selected.has(a.name)}
              onToggle={() => onToggle(a.name)}
              lowConfidence={a.matched === false}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const LineupSelectionGrid = ({
  artists,
  onConfirm,
  festivalName,
  isSubmitting,
  initialSelected,
  ctaLabel,
}: LineupSelectionGridProps) => {
  const [selected, setSelected] = useState<Set<string>>(initialSelected ?? new Set());
  const [customInput, setCustomInput] = useState("");
  const [customArtists, setCustomArtists] = useState<LineupArtist[]>([]);
  const [searchFilter, setSearchFilter] = useState("");

  const allArtists = useMemo(
    () => [...artists, ...customArtists].sort((a, b) => a.name.localeCompare(b.name)),
    [artists, customArtists]
  );

  const filteredArtists = useMemo(() => {
    if (!searchFilter.trim()) return allArtists;
    const q = searchFilter.toLowerCase();
    return allArtists.filter((a) => a.name.toLowerCase().includes(q));
  }, [allArtists, searchFilter]);

  const allNames = useMemo(
    () => allArtists.map((a) => a.name),
    [allArtists]
  );

  const allSelected = selected.size === allNames.length && allNames.length > 0;

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allNames));
    }
  };

  const addCustom = () => {
    const name = customInput.trim();
    if (!name || allNames.includes(name)) return;
    setCustomArtists((prev) => [...prev, { name }]);
    setSelected((prev) => new Set(prev).add(name));
    setCustomInput("");
  };

  // Group by day if any artist has a day field
  const hasDays = filteredArtists.some((a) => a.day);
  const grouped = useMemo(() => {
    if (!hasDays) return null;
    const map = new Map<string, LineupArtist[]>();
    for (const a of filteredArtists) {
      const key = a.day || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    // Sort day groups chronologically (Mon→Sun), with "Other" last
    const dayOrder: Record<string, number> = {
      monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
      friday: 4, saturday: 5, sunday: 6,
    };
    const parseDayRank = (label: string): number => {
      // Extract weekday name from labels like "Friday, June 20" or just "Friday"
      const first = label.split(/[,\s]/)[0].toLowerCase();
      return dayOrder[first] ?? 99;
    };
    const sorted = new Map(
      Array.from(map.entries()).sort(([a], [b]) => parseDayRank(a) - parseDayRank(b))
    );
    return sorted;
  }, [filteredArtists, hasDays]);

  return (
    <div className="flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selected.size} of {allNames.length} artists selected
        </p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-medium text-primary hover:underline"
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
      </div>

      {/* Search filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search artists…"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="pl-9 h-9 text-sm bg-white/[0.04] border-white/[0.08]"
        />
      </div>

      {/* Low confidence note */}
      {filteredArtists.some(a => a.matched === false) && (
        <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-400/[0.06] border border-amber-400/[0.12] rounded-lg px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Names with ⚠ couldn't be verified — double-check spelling</span>
        </div>
      )}

      {/* Artist grid / grouped */}
      <div className="max-h-[45vh] overflow-y-auto pr-1 -mr-1">
        {grouped ? (
          Array.from(grouped.entries()).map(([day, dayArtists]) => (
            <DayGroup
              key={day}
              day={day}
              artists={dayArtists}
              selected={selected}
              onToggle={toggle}
            />
          ))
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredArtists.map((a) => (
              <ArtistCard
                key={a.name}
                name={a.name}
                selected={selected.has(a.name)}
                onToggle={() => toggle(a.name)}
                lowConfidence={a.matched === false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add custom artist */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom artist…"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          className="h-9 text-sm bg-white/[0.04] border-white/[0.08]"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={addCustom}
          disabled={!customInput.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 pt-3 pb-1 bg-background/80 backdrop-blur-sm -mx-1 px-1">
        <Button
          className="w-full"
          disabled={selected.size === 0 || isSubmitting}
          onClick={() => onConfirm(Array.from(selected))}
        >
          {isSubmitting
            ? "Adding…"
            : ctaLabel || `Add ${selected.size} Show${selected.size !== 1 ? "s" : ""}`}
        </Button>
      </div>
    </div>
  );
};

export default LineupSelectionGrid;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Scan } from "lucide-react";
import { SuggestionCard } from "./SuggestionCard";

interface VenueRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}

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

export function SuggestionsQueue() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "dismissed" | "all">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    let query = supabase.from("data_suggestions").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    setSuggestions((data as unknown as Suggestion[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [filter]);

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-data-quality");
      if (error) throw error;
      toast({
        title: "Scan complete",
        description: `Found ${data.total} issues: ${data.duplicateVenues} duplicate venues, ${data.missingMetadata} missing metadata, ${data.artistVariants} artist variants, ${data.unlinkedShows} unlinked shows`,
      });
      fetch();
    } catch (err: any) {
      toast({ title: "Scan failed", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const resolve = async (id: string, status: "approved" | "dismissed", edits?: Record<string, Partial<VenueRow>>) => {
    // Find the suggestion to check if it's a venue duplicate that needs merging
    const suggestion = suggestions.find(s => s.id === id);
    
    if (status === "approved" && suggestion?.suggestion_type === "duplicate" && suggestion?.entity_type === "venue") {
      try {
        const d = suggestion.details as any;
        const canonical: VenueRow = d.canonical;
        const duplicates: VenueRow[] = d.duplicates || [];
        const canonicalId = canonical.id;
        const duplicateIds = duplicates.map((dup: VenueRow) => dup.id);

        // 1. Update canonical venue with any edits
        const canonEdits = edits?.[canonicalId];
        if (canonEdits && Object.keys(canonEdits).length > 0) {
          const updatePayload: Record<string, unknown> = {};
          if (canonEdits.name !== undefined) updatePayload.name = canonEdits.name;
          if (canonEdits.location !== undefined) updatePayload.location = canonEdits.location;
          if (canonEdits.city !== undefined) updatePayload.city = canonEdits.city;
          if (canonEdits.country !== undefined) updatePayload.country = canonEdits.country;
          if (canonEdits.latitude !== undefined) updatePayload.latitude = canonEdits.latitude;
          if (canonEdits.longitude !== undefined) updatePayload.longitude = canonEdits.longitude;

          const { error: updateErr } = await supabase
            .from("venues")
            .update(updatePayload)
            .eq("id", canonicalId);
          if (updateErr) throw updateErr;
        }

        // 2. Reassign shows from duplicates to canonical
        for (const dupId of duplicateIds) {
          await supabase
            .from("shows")
            .update({ venue_id: canonicalId } as any)
            .eq("venue_id", dupId);
        }

        // 3. Reassign user_venues: merge into canonical, delete duplicate entries
        for (const dupId of duplicateIds) {
          // Get user_venues pointing to this duplicate
          const { data: dupUserVenues } = await supabase
            .from("user_venues")
            .select("user_id, show_count, last_show_date")
            .eq("venue_id", dupId);

          if (dupUserVenues && dupUserVenues.length > 0) {
            for (const duv of dupUserVenues) {
              // Check if user already has a record for canonical
              const { data: existing } = await supabase
                .from("user_venues")
                .select("show_count, last_show_date")
                .eq("user_id", duv.user_id)
                .eq("venue_id", canonicalId)
                .maybeSingle();

              if (existing) {
                // Merge counts
                await supabase
                  .from("user_venues")
                  .update({
                    show_count: existing.show_count + duv.show_count,
                    last_show_date: duv.last_show_date && existing.last_show_date
                      ? (duv.last_show_date > existing.last_show_date ? duv.last_show_date : existing.last_show_date)
                      : duv.last_show_date || existing.last_show_date,
                  })
                  .eq("user_id", duv.user_id)
                  .eq("venue_id", canonicalId);
              } else {
                // Move to canonical
                await supabase
                  .from("user_venues")
                  .update({ venue_id: canonicalId })
                  .eq("user_id", duv.user_id)
                  .eq("venue_id", dupId);
              }
            }
            // Delete any remaining duplicate user_venues
            await supabase
              .from("user_venues")
              .delete()
              .eq("venue_id", dupId);
          }
        }

        // 4. Delete duplicate venues
        for (const dupId of duplicateIds) {
          await supabase.from("venues").delete().eq("id", dupId);
        }

        toast({ title: "Merge complete", description: `Merged ${duplicateIds.length} duplicate(s) into "${canonEdits?.name || canonical.name}".` });
      } catch (err: any) {
        toast({ title: "Merge failed", description: err.message, variant: "destructive" });
        return;
      }
    }

    // Mark suggestion as resolved
    const { data: { session } } = await supabase.auth.getSession();
    await (supabase.from("data_suggestions" as any).update({
      status,
      resolved_by: session?.user?.id,
      resolved_at: new Date().toISOString(),
    } as any).eq("id", id) as any);
    toast({ title: status === "approved" ? "Approved" : "Dismissed" });
    fetch();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {(["pending", "approved", "dismissed", "all"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm" className="text-xs capitalize" onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="glass" onClick={runScan} disabled={scanning}>
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Scan className="h-3.5 w-3.5" />}
          {scanning ? "Scanning…" : "Run Scan"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : suggestions.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          No suggestions yet. The AI agent will populate this queue.
        </div>
      ) : (
        <div className="space-y-2">
          {suggestions.map(s => (
            <SuggestionCard key={s.id} suggestion={s} onResolve={resolve} />
          ))}
        </div>
      )}
    </div>
  );
}

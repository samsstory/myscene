import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Scan } from "lucide-react";
import { SuggestionCard } from "./SuggestionCard";

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

  const resolve = async (id: string, status: "approved" | "dismissed") => {
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

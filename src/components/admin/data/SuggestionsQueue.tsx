import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Scan } from "lucide-react";

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
  merge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  broken_hierarchy: "bg-red-500/20 text-red-400 border-red-500/30",
};

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
            <div key={s.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[s.suggestion_type] || ""}`}>
                      {s.suggestion_type}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{s.entity_type}</Badge>
                  </div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1">
                  {s.status === "pending" && (
                    <>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400 hover:text-emerald-300" onClick={() => resolve(s.id, "approved")}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => resolve(s.id, "dismissed")}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                    {expanded === s.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              {expanded === s.id && (
                <pre className="mt-3 text-xs text-muted-foreground bg-black/20 rounded p-2 overflow-x-auto">
                  {JSON.stringify(s.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

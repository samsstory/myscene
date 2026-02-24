import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Eye, AlertCircle, Globe, Loader2 } from "lucide-react";

interface ParsedFestival {
  event_name: string;
  year: number;
  date_start?: string | null;
  date_end?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  venue_id?: string | null;
  source_url?: string | null;
  artists: { name: string; day?: string | null; stage?: string | null }[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FestivalImportDialog({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<"json" | "csv" | "scrape">("json");
  const [raw, setRaw] = useState("");
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [parsed, setParsed] = useState<ParsedFestival[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const queryClient = useQueryClient();

  const resetState = () => {
    setRaw("");
    setScrapeUrl("");
    setParsed(null);
    setError(null);
    setIsScraping(false);
  };

  // --- JSON parsing ---
  const parseJSON = () => {
    try {
      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : [data];
      const festivals: ParsedFestival[] = arr.map((item: any) => {
        if (!item.event_name || !item.year) {
          throw new Error(`Missing event_name or year in: ${JSON.stringify(item).slice(0, 60)}`);
        }
        return {
          event_name: String(item.event_name).trim(),
          year: Number(item.year),
          date_start: item.date_start || null,
          date_end: item.date_end || null,
          venue_name: item.venue_name || null,
          venue_location: item.venue_location || null,
          source_url: item.source_url || null,
          artists: Array.isArray(item.artists)
            ? item.artists.map((a: any) =>
                typeof a === "string" ? { name: a } : { name: a.name, day: a.day || null, stage: a.stage || null }
              )
            : [],
        };
      });
      setParsed(festivals);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setParsed(null);
    }
  };

  // --- CSV parsing ---
  const parseCSV = () => {
    try {
      const lines = raw.trim().split("\n").filter(Boolean);
      if (lines.length < 2) throw new Error("CSV needs a header row + at least one data row");

      const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const nameIdx = header.indexOf("event_name");
      const yearIdx = header.indexOf("year");
      const artistIdx = header.indexOf("artist_name");
      const dayIdx = header.indexOf("day");

      if (nameIdx === -1 || yearIdx === -1 || artistIdx === -1) {
        throw new Error("CSV must have columns: event_name, year, artist_name (and optionally day)");
      }

      const grouped = new Map<string, ParsedFestival>();

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        const eName = cols[nameIdx];
        const eYear = Number(cols[yearIdx]);
        const aName = cols[artistIdx];
        if (!eName || !eYear || !aName) continue;

        const key = `${eName.toLowerCase()}__${eYear}`;
        if (!grouped.has(key)) {
          grouped.set(key, { event_name: eName, year: eYear, artists: [] });
        }
        grouped.get(key)!.artists.push({
          name: aName,
          day: dayIdx !== -1 ? cols[dayIdx] || null : null,
        });
      }

      const festivals = Array.from(grouped.values());
      if (festivals.length === 0) throw new Error("No valid rows found");
      setParsed(festivals);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setParsed(null);
    }
  };

  // --- URL scraping ---
  const handleScrape = async () => {
    if (!scrapeUrl.trim()) return;
    setIsScraping(true);
    setError(null);
    setParsed(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("scrape-festival-lineup", {
        body: { url: scrapeUrl.trim() },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      const result = data.data;
      setParsed([{
        event_name: result.event_name,
        year: result.year,
        date_start: result.date_start || null,
        date_end: result.date_end || null,
        venue_name: result.venue_name || null,
        venue_location: result.venue_location || null,
        venue_id: result.venue_id || null,
        source_url: result.source_url || scrapeUrl.trim(),
        artists: result.artists || [],
      }]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsScraping(false);
    }
  };

  // --- Import mutation ---
  const importMutation = useMutation({
    mutationFn: async (festivals: ParsedFestival[]) => {
      for (const f of festivals) {
        const { error } = await (supabase as any)
          .from("festival_lineups")
          .upsert(
            {
              event_name: f.event_name,
              year: f.year,
              date_start: f.date_start,
              date_end: f.date_end,
              venue_name: f.venue_name,
              venue_location: f.venue_location,
              venue_id: f.venue_id || null,
              source_url: f.source_url,
              artists: f.artists,
              source: mode === "scrape" ? "firecrawl" : "manual",
            },
            { onConflict: "event_name,year", ignoreDuplicates: false }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-lineups"] });
      toast.success(`Imported ${parsed?.length} festival(s)`);
      resetState();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabTriggerClass = "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-white/[0.07] data-[state=active]:text-foreground";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Festival Lineups</DialogTitle>
          <DialogDescription>Paste JSON, CSV, or scrape a festival website to import lineups.</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => { setMode(v as typeof mode); resetState(); }}>
          <TabsList className="mb-3 gap-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-1 h-auto">
            <TabsTrigger value="json" className={tabTriggerClass}>JSON</TabsTrigger>
            <TabsTrigger value="csv" className={tabTriggerClass}>CSV</TabsTrigger>
            <TabsTrigger value="scrape" className={tabTriggerClass}>
              <Globe className="h-3.5 w-3.5 mr-1" /> Scrape URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json">
            <Textarea
              placeholder={`[\n  {\n    "event_name": "Coachella",\n    "year": 2024,\n    "artists": [\n      { "name": "Doja Cat", "day": "Friday" }\n    ]\n  }\n]`}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              className="font-mono text-xs bg-white/[0.03] border-white/[0.08]"
            />
          </TabsContent>

          <TabsContent value="csv">
            <Textarea
              placeholder={`event_name,year,artist_name,day\nCoachella,2024,Doja Cat,Friday`}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              className="font-mono text-xs bg-white/[0.03] border-white/[0.08]"
            />
          </TabsContent>

          <TabsContent value="scrape">
            <div className="space-y-3">
              <Input
                type="url"
                placeholder="https://www.coachella.com/lineup"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                className="bg-white/[0.03] border-white/[0.08] text-sm"
                disabled={isScraping}
              />
              <p className="text-[11px] text-muted-foreground">
                Paste a festival lineup page URL. We'll extract the artist list, dates, and venue automatically.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/10 rounded-md p-3">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Preview */}
        {parsed && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Preview: {parsed.length} festival(s)
            </p>
            <div className="max-h-48 overflow-y-auto space-y-2 rounded-md border border-white/[0.06] p-3">
              {parsed.map((f, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{f.event_name} ({f.year})</p>
                      {f.venue_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {f.venue_name}{f.venue_id ? " ✓" : ""}{f.venue_location ? ` · ${f.venue_location}` : ""}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px] border-white/[0.1]">
                      {f.artists.length} artists
                    </Badge>
                  </div>
                  {/* Show first few artist names */}
                  <p className="text-[11px] text-muted-foreground truncate">
                    {f.artists.slice(0, 8).map((a) => a.name).join(", ")}
                    {f.artists.length > 8 ? ` +${f.artists.length - 8} more` : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {!parsed ? (
            mode === "scrape" ? (
              <Button
                size="sm"
                variant="glass"
                disabled={!scrapeUrl.trim() || isScraping}
                onClick={handleScrape}
              >
                {isScraping ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Extracting…
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-1.5" /> Scrape & Preview
                  </>
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="glass"
                disabled={!raw.trim()}
                onClick={mode === "json" ? parseJSON : parseCSV}
              >
                <Eye className="h-4 w-4 mr-1.5" /> Preview
              </Button>
            )
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={resetState}>
                Back
              </Button>
              <Button
                size="sm"
                disabled={importMutation.isPending}
                onClick={() => importMutation.mutate(parsed)}
              >
                <Upload className="h-4 w-4 mr-1.5" />
                {importMutation.isPending ? "Importing…" : `Import ${parsed.length} festival(s)`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

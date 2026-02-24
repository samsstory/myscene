import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Search, Pencil, Loader2, Hash, MapPin, Link2 } from "lucide-react";

interface ShowRow {
  id: string;
  venue_name: string;
  venue_location: string | null;
  venue_id: string | null;
  event_name: string | null;
  show_date: string;
  show_type: string;
  user_id: string;
  photo_url: string | null;
  artists: string;
}

export function ShowsBrowser() {
  const [shows, setShows] = useState<ShowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, missingVenueId: 0, missingLocation: 0 });

  const [editShow, setEditShow] = useState<ShowRow | null>(null);
  const [editForm, setEditForm] = useState({ venue_name: "", venue_location: "", event_name: "", venue_id: "" });
  const [saving, setSaving] = useState(false);

  const fetchShows = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("shows").select("id, venue_name, venue_location, venue_id, event_name, show_date, show_type, user_id, photo_url").order("show_date", { ascending: false }).limit(200);
    if (search.trim()) {
      query = query.or(`venue_name.ilike.%${search}%,event_name.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) { toast({ title: "Error loading shows", description: error.message, variant: "destructive" }); setLoading(false); return; }

    // Get artists for these shows
    const ids = (data || []).map(s => s.id);
    let artistMap: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: artists } = await supabase.from("show_artists").select("show_id, artist_name, is_headliner").in("show_id", ids);
      if (artists) {
        const grouped: Record<string, string[]> = {};
        artists.forEach(a => {
          if (!grouped[a.show_id]) grouped[a.show_id] = [];
          grouped[a.show_id].push(a.artist_name);
        });
        Object.entries(grouped).forEach(([id, names]) => { artistMap[id] = names.join(", "); });
      }
    }

    setShows((data || []).map(s => ({ ...s, artists: artistMap[s.id] || "—" })));

    const { count: total } = await supabase.from("shows").select("*", { count: "exact", head: true });
    const { count: mv } = await supabase.from("shows").select("*", { count: "exact", head: true }).is("venue_id", null);
    const { count: ml } = await supabase.from("shows").select("*", { count: "exact", head: true }).is("venue_location", null);
    setStats({ total: total ?? 0, missingVenueId: mv ?? 0, missingLocation: ml ?? 0 });
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchShows, 300);
    return () => clearTimeout(t);
  }, [fetchShows]);

  const openEdit = (s: ShowRow) => {
    setEditShow(s);
    setEditForm({ venue_name: s.venue_name, venue_location: s.venue_location || "", event_name: s.event_name || "", venue_id: s.venue_id || "" });
  };

  const handleSave = async () => {
    if (!editShow) return;
    setSaving(true);
    const { error } = await supabase.from("shows").update({
      venue_name: editForm.venue_name,
      venue_location: editForm.venue_location || null,
      event_name: editForm.event_name || null,
      venue_id: editForm.venue_id || null,
    }).eq("id", editShow.id);
    setSaving(false);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Show updated" });
    setEditShow(null);
    fetchShows();
  };

  return (
    <div className="space-y-4">
      {/* Stat pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { icon: Hash, label: "Total", value: stats.total },
          { icon: Link2, label: "Missing Venue ID", value: stats.missingVenueId },
          { icon: MapPin, label: "Missing Location", value: stats.missingLocation },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs">
            <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{s.label}:</span>
            <span className="font-semibold text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search shows..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Artists</TableHead>
                <TableHead>Venue</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shows.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{s.artists}</TableCell>
                  <TableCell className="text-xs">
                    <div>{s.venue_name}</div>
                    {s.venue_location && <div className="text-muted-foreground">{s.venue_location}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{s.event_name || "—"}</TableCell>
                  <TableCell className="tabular-nums text-xs">{s.show_date}</TableCell>
                  <TableCell className="text-xs">{s.show_type}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {shows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No shows found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editShow} onOpenChange={open => !open && setEditShow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Show</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {([
              ["venue_name", "Venue Name"],
              ["venue_location", "Venue Location"],
              ["event_name", "Event Name"],
              ["venue_id", "Venue ID"],
            ] as const).map(([key, label]) => (
              <div key={key} className="grid gap-1.5">
                <Label className="text-xs">{label}</Label>
                <Input value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditShow(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

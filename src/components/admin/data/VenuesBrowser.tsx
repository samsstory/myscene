import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Search, Pencil, Merge, Loader2, MapPin, Globe, Hash } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  show_count: number;
}

export function VenuesBrowser() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, missingCountry: 0, missingCoords: 0 });

  // Edit state
  const [editVenue, setEditVenue] = useState<Venue | null>(null);
  const [editForm, setEditForm] = useState({ name: "", city: "", country: "", location: "", latitude: "", longitude: "" });
  const [saving, setSaving] = useState(false);

  // Merge state
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSource, setMergeSource] = useState<Venue | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [merging, setMerging] = useState(false);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("venues").select("*").order("name").limit(200);
    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) { toast({ title: "Error loading venues", description: error.message, variant: "destructive" }); setLoading(false); return; }

    // Get show counts per venue
    const venueIds = (data || []).map(v => v.id);
    let showCounts: Record<string, number> = {};
    if (venueIds.length > 0) {
      const { data: counts } = await supabase.from("shows").select("venue_id").in("venue_id", venueIds);
      if (counts) {
        counts.forEach(r => { showCounts[r.venue_id!] = (showCounts[r.venue_id!] || 0) + 1; });
      }
    }

    const mapped: Venue[] = (data || []).map(v => ({
      ...v,
      show_count: showCounts[v.id] || 0,
    }));
    setVenues(mapped);

    // Stats from full count
    const { count: total } = await supabase.from("venues").select("*", { count: "exact", head: true });
    const { count: mc } = await supabase.from("venues").select("*", { count: "exact", head: true }).is("country", null);
    const { count: ml } = await supabase.from("venues").select("*", { count: "exact", head: true }).is("latitude", null);
    setStats({ total: total ?? 0, missingCountry: mc ?? 0, missingCoords: ml ?? 0 });
    setLoading(false);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchVenues, 300);
    return () => clearTimeout(t);
  }, [fetchVenues]);

  const openEdit = (v: Venue) => {
    setEditVenue(v);
    setEditForm({
      name: v.name, city: v.city || "", country: v.country || "",
      location: v.location || "", latitude: v.latitude?.toString() || "", longitude: v.longitude?.toString() || "",
    });
  };

  const handleSave = async () => {
    if (!editVenue) return;
    setSaving(true);
    const { error } = await supabase.from("venues").update({
      name: editForm.name,
      city: editForm.city || null,
      country: editForm.country || null,
      location: editForm.location || null,
      latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
      longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,
    }).eq("id", editVenue.id);
    setSaving(false);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Venue updated" });
    setEditVenue(null);
    fetchVenues();
  };

  const handleMerge = async () => {
    if (!mergeSource || !mergeTargetId) return;
    setMerging(true);
    // Reassign shows
    await supabase.from("shows").update({ venue_id: mergeTargetId } as any).eq("venue_id", mergeSource.id);
    // Reassign user_venues
    await supabase.from("user_venues").update({ venue_id: mergeTargetId } as any).eq("venue_id", mergeSource.id);
    // Delete duplicate
    const { error } = await supabase.from("venues").delete().eq("id", mergeSource.id);
    setMerging(false);
    if (error) { toast({ title: "Merge failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Venues merged" });
    setMergeOpen(false);
    setMergeSource(null);
    setMergeTargetId("");
    fetchVenues();
  };

  return (
    <div className="space-y-4">
      {/* Stat pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { icon: Hash, label: "Total", value: stats.total },
          { icon: Globe, label: "Missing Country", value: stats.missingCountry },
          { icon: MapPin, label: "Missing Coords", value: stats.missingCoords },
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
        <Input placeholder="Search venues..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Shows</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venues.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{v.location || "—"}</TableCell>
                  <TableCell>{v.city || <span className="text-destructive/60 text-xs">missing</span>}</TableCell>
                  <TableCell>{v.country || <span className="text-destructive/60 text-xs">missing</span>}</TableCell>
                  <TableCell className="text-right tabular-nums">{v.show_count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setMergeSource(v); setMergeOpen(true); }}>
                        <Merge className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {venues.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No venues found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editVenue} onOpenChange={open => !open && setEditVenue(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Venue</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            {([
              ["name", "Name"],
              ["location", "Location"],
              ["city", "City"],
              ["country", "Country"],
              ["latitude", "Latitude"],
              ["longitude", "Longitude"],
            ] as const).map(([key, label]) => (
              <div key={key} className="grid gap-1.5">
                <Label className="text-xs">{label}</Label>
                <Input value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditVenue(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge Dialog */}
      <Dialog open={mergeOpen} onOpenChange={open => { if (!open) { setMergeOpen(false); setMergeSource(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Merge Venue</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Merging <span className="font-semibold text-foreground">{mergeSource?.name}</span> into another venue. All shows and user-venue records will be reassigned, then this venue will be deleted.
          </p>
          <div className="grid gap-1.5">
            <Label className="text-xs">Target Venue ID (canonical)</Label>
            <Input value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)} placeholder="Paste target venue UUID" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMergeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleMerge} disabled={merging || !mergeTargetId}>
              {merging && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Merge & Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

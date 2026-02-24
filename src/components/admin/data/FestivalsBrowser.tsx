import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, Upload, Trash2, ChevronDown, ChevronRight, Music, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { FestivalImportDialog } from "./FestivalImportDialog";
import { Badge } from "@/components/ui/badge";

interface FestivalArtist {
  name: string;
  day?: string | null;
  stage?: string | null;
}

interface FestivalLineup {
  id: string;
  event_name: string;
  year: number;
  date_start: string | null;
  date_end: string | null;
  venue_name: string | null;
  venue_location: string | null;
  venue_id: string | null;
  artists: FestivalArtist[];
  source: string | null;
  source_url: string | null;
  created_at: string;
  updated_at: string;
}

export function FestivalsBrowser() {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: festivals = [], isLoading } = useQuery({
    queryKey: ["admin-festival-lineups", search],
    queryFn: async () => {
      let query = (supabase as any)
        .from("festival_lineups")
        .select("*")
        .order("year", { ascending: false })
        .order("event_name", { ascending: true })
        .limit(200);

      if (search.trim()) {
        query = query.ilike("event_name", `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as FestivalLineup[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("festival_lineups")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-festival-lineups"] });
      toast.success("Festival deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalArtists = festivals.reduce((acc, f) => {
    const artists = Array.isArray(f.artists) ? f.artists : [];
    artists.forEach((a) => acc.add(typeof a === "object" ? a.name : a));
    return acc;
  }, new Set<string>()).size;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
          <CalendarDays className="h-3 w-3" /> {festivals.length} festivals
        </Badge>
        <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 text-xs">
          <Music className="h-3 w-3" /> {totalArtists} unique artists
        </Badge>
      </div>

      {/* Search + Import */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search festivals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.04] border-white/[0.08]"
          />
        </div>
        <Button variant="glass" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4 mr-1.5" /> Import
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : festivals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No festivals yet. Import some data to get started.
        </p>
      ) : (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="w-8" />
                <TableHead>Festival</TableHead>
                <TableHead className="w-20">Year</TableHead>
                <TableHead className="w-24">Artists</TableHead>
                <TableHead className="hidden sm:table-cell">Venue</TableHead>
                <TableHead className="w-20">Source</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {festivals.map((f) => {
                const artists = Array.isArray(f.artists) ? f.artists : [];
                const isExpanded = expandedId === f.id;
                return (
                  <TableRow
                    key={f.id}
                    className="border-white/[0.06] cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : f.id)}
                  >
                    <TableCell className="pr-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{f.event_name}</p>
                        {isExpanded && artists.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {artists.map((a, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0.5 border-white/[0.1]">
                                {typeof a === "object" ? a.name : a}
                                {typeof a === "object" && a.day && (
                                  <span className="ml-1 text-muted-foreground">· {a.day}</span>
                                )}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{f.year}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{artists.length}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs truncate max-w-[200px]">
                      {f.venue_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-white/[0.1]">
                        {f.source || "manual"}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete "{f.event_name} {f.year}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the festival lineup data permanently.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(f.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <FestivalImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

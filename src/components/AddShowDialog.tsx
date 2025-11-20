import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { CalendarIcon, X, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface AddShowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ratingEmojis = [
  { value: 1, emoji: "😞", label: "Terrible" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Great" },
  { value: 5, emoji: "🤩", label: "Amazing" },
];

interface ArtistSuggestion {
  id: string;
  name: string;
  disambiguation: string;
  country: string;
  type: string;
}

const AddShowDialog = ({ open, onOpenChange }: AddShowDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [datePrecision, setDatePrecision] = useState<string>("exact");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [venue, setVenue] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [artists, setArtists] = useState<Array<{ name: string; isHeadliner: boolean }>>([]);
  const [currentArtist, setCurrentArtist] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [artistSuggestions, setArtistSuggestions] = useState<ArtistSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [venueSuggestions, setVenueSuggestions] = useState<Array<{
    id?: string;
    name: string;
    location: string;
    scene_users_count: number;
    user_show_count: number;
  }>>([]);
  const [isSearchingVenues, setIsSearchingVenues] = useState(false);
  const [showVenueSuggestions, setShowVenueSuggestions] = useState(false);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  // Debounced artist search
  useEffect(() => {
    const searchArtists = async () => {
      if (currentArtist.trim().length < 2) {
        setArtistSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      setShowSuggestions(true);

      try {
        const { data, error } = await supabase.functions.invoke('search-artists', {
          body: { searchTerm: currentArtist.trim() }
        });

        if (error) throw error;

        setArtistSuggestions(data?.artists || []);
      } catch (error) {
        console.error('Error searching artists:', error);
        setArtistSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchArtists, 300);
    return () => clearTimeout(timer);
  }, [currentArtist]);

  // Debounced venue search
  useEffect(() => {
    const searchVenues = async () => {
      if (venue.trim().length < 2) {
        setVenueSuggestions([]);
        setShowVenueSuggestions(false);
        return;
      }

      setIsSearchingVenues(true);
      setShowVenueSuggestions(true);

      try {
        const { data, error } = await supabase.functions.invoke('search-venues', {
          body: { searchTerm: venue.trim() }
        });

        if (error) throw error;

        setVenueSuggestions(data?.suggestions || []);
      } catch (error) {
        console.error('Error searching venues:', error);
        setVenueSuggestions([]);
      } finally {
        setIsSearchingVenues(false);
      }
    };

    const timer = setTimeout(searchVenues, 300);
    return () => clearTimeout(timer);
  }, [venue]);

  const addArtist = (isHeadliner: boolean, artistName?: string) => {
    const nameToAdd = artistName || currentArtist.trim();
    if (nameToAdd) {
      setArtists([...artists, { name: nameToAdd, isHeadliner }]);
      setCurrentArtist("");
      setShowSuggestions(false);
      setArtistSuggestions([]);
    }
  };

  const removeArtist = (index: number) => {
    setArtists(artists.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!venue || artists.length === 0 || rating === null) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate date based on precision
    if (datePrecision === "exact" && !date) {
      toast.error("Please select a date");
      return;
    }
    if (datePrecision === "approximate" && (!selectedMonth || !selectedYear)) {
      toast.error("Please select a month and year");
      return;
    }
    if (datePrecision === "unknown" && !selectedYear) {
      toast.error("Please select a year");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to add shows");
        return;
      }

      // Determine the show date based on precision
      let showDate: string;
      if (datePrecision === "exact" && date) {
        showDate = date.toISOString().split('T')[0];
      } else if (datePrecision === "approximate" && selectedMonth && selectedYear) {
        // Use the first day of the selected month
        const monthIndex = months.indexOf(selectedMonth);
        const approximateDate = new Date(parseInt(selectedYear), monthIndex, 1);
        showDate = approximateDate.toISOString().split('T')[0];
      } else if (datePrecision === "unknown" && selectedYear) {
        // Use January 1st of the selected year
        const unknownDate = new Date(parseInt(selectedYear), 0, 1);
        showDate = unknownDate.toISOString().split('T')[0];
      } else {
        showDate = new Date().toISOString().split('T')[0];
      }

      // Insert the show
      const { data: show, error: showError } = await supabase
        .from("shows")
        .insert({
          user_id: user.id,
          venue_name: venue,
          venue_location: venueLocation || null,
          show_date: showDate,
          date_precision: datePrecision,
          rating: rating,
        })
        .select()
        .single();

      if (showError) throw showError;

      // Update venue cache if a venue ID was selected
      if (selectedVenueId) {
        const { error: venueError } = await supabase
          .from('user_venues')
          .upsert({
            user_id: user.id,
            venue_id: selectedVenueId,
            show_count: 1,
            last_show_date: showDate,
          }, {
            onConflict: 'user_id,venue_id',
            ignoreDuplicates: false,
          });

        if (venueError) {
          console.error('Error updating venue cache:', venueError);
        }
      }

      // Insert the artists
      const artistsToInsert = artists.map(artist => ({
        show_id: show.id,
        artist_name: artist.name,
        is_headliner: artist.isHeadliner,
      }));

      const { error: artistsError } = await supabase
        .from("show_artists")
        .insert(artistsToInsert);

      if (artistsError) throw artistsError;

      toast.success("Show added successfully! 🎉");
      onOpenChange(false);
      
      // Reset form
      setVenue("");
      setVenueLocation("");
      setSelectedVenueId(null);
      setArtists([]);
      setDate(undefined);
      setSelectedMonth("");
      setSelectedYear("");
      setRating(null);
      setDatePrecision("exact");
    } catch (error) {
      console.error("Error adding show:", error);
      toast.error("Failed to add show. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add a Show</DialogTitle>
          <DialogDescription>
            Log your concert experience and rate it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Venue */}
          <div className="space-y-2">
            <Label htmlFor="venue">Show *</Label>
            <Popover 
              open={showVenueSuggestions && (venueSuggestions.length > 0 || isSearchingVenues)} 
              onOpenChange={setShowVenueSuggestions}
            >
              <PopoverTrigger asChild>
                <div className="relative">
                  <Input
                    id="venue"
                    placeholder="Search or add Festival, concert, or other..."
                    value={venue}
                    onChange={(e) => {
                      setVenue(e.target.value);
                      setSelectedVenueId(null);
                      setVenueLocation("");
                    }}
                    onFocus={() => {
                      if (venue.trim().length >= 2) {
                        setShowVenueSuggestions(true);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setShowVenueSuggestions(false);
                      }
                    }}
                  />
                  {isSearchingVenues && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[--radix-popover-trigger-width] p-0" 
                align="start"
              >
                <Command>
                  <CommandList>
                    <CommandEmpty>
                      No venues found - type to add new
                    </CommandEmpty>
                    <CommandGroup heading="Venues">
                      {venueSuggestions.map((suggestion, index) => (
                        <CommandItem
                          key={`${suggestion.name}-${suggestion.location}-${index}`}
                          value={`${suggestion.name}-${suggestion.location}`}
                          onSelect={() => {
                            setVenue(suggestion.name);
                            setVenueLocation(suggestion.location);
                            setSelectedVenueId(suggestion.id || null);
                            setShowVenueSuggestions(false);
                          }}
                        >
                          <div className="flex flex-col w-full">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium">{suggestion.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-5 flex-wrap">
                              {suggestion.location && (
                                <span>{suggestion.location}</span>
                              )}
                              {suggestion.user_show_count > 0 && (
                                <span className="text-primary font-medium">
                                  • You've been {suggestion.user_show_count} time{suggestion.user_show_count !== 1 ? 's' : ''}
                                </span>
                              )}
                              {suggestion.scene_users_count > 0 && (
                                <span>
                                  • {suggestion.scene_users_count} Scene user{suggestion.scene_users_count !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <RadioGroup value={datePrecision} onValueChange={setDatePrecision}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exact" id="exact" />
                <Label htmlFor="exact" className="font-normal cursor-pointer">
                  Exact date
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="approximate" id="approximate" />
                <Label htmlFor="approximate" className="font-normal cursor-pointer">
                  Approximate (week/month)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unknown" id="unknown" />
                <Label htmlFor="unknown" className="font-normal cursor-pointer">
                  I forget
                </Label>
              </div>
            </RadioGroup>

            {datePrecision === "exact" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar 
                    mode="single" 
                    selected={date} 
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}

            {datePrecision === "approximate" && (
              <div className="flex gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {datePrecision === "unknown" && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Artists */}
          <div className="space-y-2">
            <Label htmlFor="artist">Artists *</Label>
            <Popover open={showSuggestions && (artistSuggestions.length > 0 || isSearching)} onOpenChange={setShowSuggestions}>
              <PopoverTrigger asChild>
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="artist"
                      placeholder="Search for artist name..."
                      value={currentArtist}
                      onChange={(e) => setCurrentArtist(e.target.value)}
                      onFocus={() => {
                        if (currentArtist.trim().length >= 2) {
                          setShowSuggestions(true);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !showSuggestions) {
                          e.preventDefault();
                          addArtist(artists.length === 0);
                        }
                        if (e.key === "Escape") {
                          setShowSuggestions(false);
                        }
                      }}
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <Button type="button" onClick={() => addArtist(artists.length === 0)}>
                    Add Headliner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addArtist(false)}
                  >
                    Add Opener
                  </Button>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-[600px] p-0" align="start">
                <Command>
                  <CommandList>
                    <CommandEmpty>
                      {currentArtist.trim() ? (
                        <div className="py-6 text-center text-sm">
                          No results found - press Enter or click button to add "{currentArtist.trim()}"
                        </div>
                      ) : (
                        <div className="py-6 text-center text-sm">Start typing to search...</div>
                      )}
                    </CommandEmpty>
                    {artistSuggestions.length > 0 && (
                      <CommandGroup heading="Suggested Artists">
                        {artistSuggestions.map((artist) => (
                          <CommandItem
                            key={artist.id}
                            value={`${artist.id}-${artist.name}`}
                            onSelect={() => {
                              addArtist(artists.length === 0, artist.name);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex flex-col gap-1">
                              <div className="font-medium">{artist.name}</div>
                              {(artist.disambiguation || artist.country || artist.type) && (
                                <div className="text-xs text-muted-foreground">
                                  {[artist.disambiguation, artist.type, artist.country]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {artists.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {artists.map((artist, index) => (
                  <Badge
                    key={index}
                    variant={artist.isHeadliner ? "default" : "secondary"}
                    className="pl-3 pr-2 py-1.5"
                  >
                    {artist.name}
                    <button
                      onClick={() => removeArtist(index)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <Label>How was the show? *</Label>
            <div className="flex gap-3 justify-center">
              {ratingEmojis.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRating(r.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-110",
                    rating === r.value
                      ? "border-primary shadow-glow"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-4xl">{r.emoji}</span>
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Add Show
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddShowDialog;

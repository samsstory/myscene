import { useState } from "react";
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
import { CalendarIcon, X } from "lucide-react";
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

const AddShowDialog = ({ open, onOpenChange }: AddShowDialogProps) => {
  const [date, setDate] = useState<Date>();
  const [datePrecision, setDatePrecision] = useState<string>("exact");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [venue, setVenue] = useState("");
  const [artists, setArtists] = useState<Array<{ name: string; isHeadliner: boolean }>>([]);
  const [currentArtist, setCurrentArtist] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  const addArtist = (isHeadliner: boolean) => {
    if (currentArtist.trim()) {
      setArtists([...artists, { name: currentArtist.trim(), isHeadliner }]);
      setCurrentArtist("");
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
          venue_location: "", // Can be added later
          show_date: showDate,
          date_precision: datePrecision,
          rating: rating,
        })
        .select()
        .single();

      if (showError) throw showError;

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
            <Input
              id="venue"
              placeholder="Search or add Festival, concert, or other..."
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            />
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
            <div className="flex gap-2">
              <Input
                id="artist"
                placeholder="Artist name..."
                value={currentArtist}
                onChange={(e) => setCurrentArtist(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addArtist(artists.length === 0);
                  }
                }}
              />
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

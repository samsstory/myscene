import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import VenueStep from "./add-show-steps/VenueStep";
import DateStep from "./add-show-steps/DateStep";
import ArtistsStep from "./add-show-steps/ArtistsStep";
import RatingStep from "./add-show-steps/RatingStep";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddShowFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editShow?: {
    id: string;
    venue: { name: string; location: string };
    date: string;
    datePrecision: string;
    artists: Array<{ name: string; isHeadliner: boolean }>;
    rating: number;
    artistPerformance?: number | null;
    sound?: number | null;
    lighting?: number | null;
    crowd?: number | null;
    venueVibe?: number | null;
    notes?: string | null;
    venueId?: string | null;
  } | null;
}

export interface ShowData {
  venue: string;
  venueLocation: string;
  venueId: string | null;
  showType: 'venue' | 'festival' | 'other';
  date: Date | undefined;
  datePrecision: "exact" | "approximate" | "unknown";
  selectedMonth: string;
  selectedYear: string;
  artists: Array<{ name: string; isHeadliner: boolean }>;
  rating: number | null;
  locationFilter: string;
  artistPerformance: number | null;
  sound: number | null;
  lighting: number | null;
  crowd: number | null;
  venueVibe: number | null;
  notes: string;
}

const AddShowFlow = ({ open, onOpenChange, editShow }: AddShowFlowProps) => {
  const [step, setStep] = useState(1);
  const [showData, setShowData] = useState<ShowData>({
    venue: "",
    venueLocation: "",
    venueId: null,
    showType: 'venue',
    date: undefined,
    datePrecision: "exact",
    selectedMonth: "",
    selectedYear: "",
    artists: [],
    rating: null,
    locationFilter: "",
    artistPerformance: null,
    sound: null,
    lighting: null,
    crowd: null,
    venueVibe: null,
    notes: "",
  });
  const [userHomeCity, setUserHomeCity] = useState<string>("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Populate form with edit data
  useEffect(() => {
    if (editShow && open) {
      const showDate = new Date(editShow.date);
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      setShowData({
        venue: editShow.venue.name,
        venueLocation: editShow.venue.location,
        venueId: editShow.venueId || null,
        showType: 'venue',
        date: editShow.datePrecision === 'exact' ? showDate : undefined,
        datePrecision: editShow.datePrecision as "exact" | "approximate" | "unknown",
        selectedMonth: months[showDate.getMonth()],
        selectedYear: showDate.getFullYear().toString(),
        artists: editShow.artists,
        rating: editShow.rating,
        locationFilter: "",
        artistPerformance: editShow.artistPerformance || null,
        sound: editShow.sound || null,
        lighting: editShow.lighting || null,
        crowd: editShow.crowd || null,
        venueVibe: editShow.venueVibe || null,
        notes: editShow.notes || "",
      });
      setStep(1);
    }
  }, [editShow, open]);

  // Fetch user's home city from profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('home_city')
          .eq('id', user.id)
          .single();

        if (profile?.home_city) {
          setUserHomeCity(profile.home_city);
          setShowData(prev => ({ ...prev, locationFilter: profile.home_city }));
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (open) {
      fetchUserProfile();
    }
  }, [open]);

  const updateShowData = (updates: Partial<ShowData>) => {
    setShowData(prev => ({ ...prev, ...updates }));
  };

  const updateShowType = (type: 'venue' | 'festival' | 'other') => {
    updateShowData({ showType: type });
  };

  const updateLocationFilter = async (newLocation: string) => {
    updateShowData({ locationFilter: newLocation });
    
    // Update user's home city in profile if changed
    if (newLocation !== userHomeCity && newLocation.trim()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            home_city: newLocation,
          });

        setUserHomeCity(newLocation);
        toast.success(`Home city updated to ${newLocation}`);
      } catch (error) {
        console.error('Error updating home city:', error);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleVenueSelect = (venue: string, location: string, venueId: string | null) => {
    updateShowData({ venue, venueLocation: location, venueId });
    setStep(2); // Auto-advance to date step
  };

  const handleDateSelect = () => {
    setStep(3); // Auto-advance to artists step
  };

  const handleArtistsComplete = () => {
    setStep(4); // Auto-advance to rating step
  };

  const handleSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please sign in to add shows");
        return;
      }
      const user = session.user;

      const isEditing = !!editShow;

      // Determine the show date based on precision
      const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      let showDate: string;
      if (showData.datePrecision === "exact" && showData.date) {
        showDate = showData.date.toISOString().split('T')[0];
      } else if (showData.datePrecision === "approximate" && showData.selectedMonth && showData.selectedYear) {
        const monthIndex = months.indexOf(showData.selectedMonth);
        const approximateDate = new Date(parseInt(showData.selectedYear), monthIndex, 1);
        showDate = approximateDate.toISOString().split('T')[0];
      } else if (showData.datePrecision === "unknown" && showData.selectedYear) {
        const unknownDate = new Date(parseInt(showData.selectedYear), 0, 1);
        showDate = unknownDate.toISOString().split('T')[0];
      } else {
        showDate = new Date().toISOString().split('T')[0];
      }

      // Insert or update the show
      let show;
      if (isEditing) {
        const { data: updatedShow, error: showError } = await supabase
          .from("shows")
          .update({
            venue_name: showData.venue,
            venue_location: showData.venueLocation || null,
            venue_id: showData.venueId || null,
            show_date: showDate,
            date_precision: showData.datePrecision,
            rating: showData.rating,
            artist_performance: showData.artistPerformance,
            sound: showData.sound,
            lighting: showData.lighting,
            crowd: showData.crowd,
            venue_vibe: showData.venueVibe,
            notes: showData.notes || null,
          })
          .eq('id', editShow.id)
          .select()
          .single();

        if (showError) throw showError;
        show = updatedShow;

        // Delete existing artists
        await supabase
          .from("show_artists")
          .delete()
          .eq('show_id', editShow.id);
      } else {
        const { data: newShow, error: showError } = await supabase
          .from("shows")
          .insert({
            user_id: user.id,
            venue_name: showData.venue,
            venue_location: showData.venueLocation || null,
            venue_id: showData.venueId || null,
            show_date: showDate,
            date_precision: showData.datePrecision,
            rating: showData.rating,
            artist_performance: showData.artistPerformance,
            sound: showData.sound,
            lighting: showData.lighting,
            crowd: showData.crowd,
            venue_vibe: showData.venueVibe,
            notes: showData.notes || null,
          })
          .select()
          .single();

        if (showError) throw showError;
        show = newShow;
      }

      // Update venue cache if a venue ID was selected
      if (showData.venueId) {
        const { error: venueError } = await supabase
          .from('user_venues')
          .upsert({
            user_id: user.id,
            venue_id: showData.venueId,
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
      const artistsToInsert = showData.artists.map(artist => ({
        show_id: show.id,
        artist_name: artist.name,
        is_headliner: artist.isHeadliner,
      }));

      const { error: artistsError } = await supabase
        .from("show_artists")
        .insert(artistsToInsert);

      if (artistsError) throw artistsError;

      toast.success(isEditing ? "Show updated successfully! 🎉" : "Show added successfully! 🎉");
      
      // Reset and close
      setShowData({
        venue: "",
        venueLocation: "",
        venueId: null,
        showType: 'venue',
        date: undefined,
        datePrecision: "exact",
        selectedMonth: "",
        selectedYear: "",
        artists: [],
        rating: null,
        locationFilter: "",
        artistPerformance: null,
        sound: null,
        lighting: null,
        crowd: null,
        venueVibe: null,
        notes: "",
      });
      setStep(1);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding show:", error);
      toast.error("Failed to add show. Please try again.");
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setShowData({
      venue: "",
      venueLocation: "",
      venueId: null,
      showType: 'venue',
      date: undefined,
      datePrecision: "exact",
      selectedMonth: "",
      selectedYear: "",
      artists: [],
      rating: null,
      locationFilter: "",
      artistPerformance: null,
      sound: null,
      lighting: null,
      crowd: null,
      venueVibe: null,
      notes: "",
    });
    setStep(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 bg-background">
        {/* Header with back button */}
        <div className="flex items-center gap-4 p-6 pb-4">
          {step > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="text-2xl font-bold">Add a Show</h2>
        </div>

        {/* Step content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {step === 1 && (
            <VenueStep
              value={showData.venue}
              location={showData.venueLocation}
              locationFilter={showData.locationFilter}
              showType={showData.showType}
              onSelect={handleVenueSelect}
              onLocationFilterChange={updateLocationFilter}
              onShowTypeChange={updateShowType}
              isLoadingDefaultCity={isLoadingProfile}
            />
          )}

          {step === 2 && (
            <DateStep
              date={showData.date}
              datePrecision={showData.datePrecision}
              selectedMonth={showData.selectedMonth}
              selectedYear={showData.selectedYear}
              onDateChange={(date) => updateShowData({ date })}
              onPrecisionChange={(precision) => updateShowData({ datePrecision: precision as "exact" | "approximate" | "unknown" })}
              onMonthChange={(month) => updateShowData({ selectedMonth: month })}
              onYearChange={(year) => updateShowData({ selectedYear: year })}
              onContinue={handleDateSelect}
            />
          )}

          {step === 3 && (
            <ArtistsStep
              artists={showData.artists}
              onArtistsChange={(artists) => updateShowData({ artists })}
              onContinue={handleArtistsComplete}
            />
          )}

          {step === 4 && (
            <RatingStep
              rating={showData.rating}
              onRatingChange={(rating) => updateShowData({ rating })}
              artistPerformance={showData.artistPerformance}
              sound={showData.sound}
              lighting={showData.lighting}
              crowd={showData.crowd}
              venueVibe={showData.venueVibe}
              notes={showData.notes}
              onDetailChange={(field, value) => updateShowData({ [field]: value })}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex gap-1 px-6 pb-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddShowFlow;

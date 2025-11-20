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
}

const AddShowFlow = ({ open, onOpenChange }: AddShowFlowProps) => {
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
  });
  const [userHomeCity, setUserHomeCity] = useState<string>("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to add shows");
        return;
      }

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

      // Insert the show
      const { data: show, error: showError } = await supabase
        .from("shows")
        .insert({
          user_id: user.id,
          venue_name: showData.venue,
          venue_location: showData.venueLocation || null,
          show_date: showDate,
          date_precision: showData.datePrecision,
          rating: showData.rating,
        })
        .select()
        .single();

      if (showError) throw showError;

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

      toast.success("Show added successfully! 🎉");
      
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

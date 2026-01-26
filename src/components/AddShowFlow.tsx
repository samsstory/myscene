import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Calendar, Music, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import UnifiedSearchStep, { SearchResultType } from "./add-show-steps/UnifiedSearchStep";
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
  venueLatitude?: number;
  venueLongitude?: number;
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

type EntryPoint = 'artist' | 'venue' | null;

const AddShowFlow = ({ open, onOpenChange, editShow }: AddShowFlowProps) => {
  const [step, setStep] = useState(1);
  const [entryPoint, setEntryPoint] = useState<EntryPoint>(null);
  const [showStepSelector, setShowStepSelector] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
      setShowStepSelector(true);
      setStep(0);
      setEntryPoint(null);
    } else if (open) {
      setShowStepSelector(false);
      setStep(1);
      setEntryPoint(null);
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

  // Get step count based on entry point
  const getTotalSteps = () => {
    return 4; // Search -> [Venue/Artists] -> Date -> Rating
  };

  // Get current step number for progress indicator
  const getCurrentStepNumber = () => {
    if (showStepSelector) return step;
    return step;
  };

  // Get step labels for progress
  const getStepLabels = () => {
    if (entryPoint === 'artist') {
      return ['Search', 'Venue', 'Date', 'Rating'];
    }
    return ['Search', 'Date', 'Artists', 'Rating'];
  };

  const handleBack = () => {
    if (step === 1) {
      // At unified search, just close
      return;
    }
    
    if (showStepSelector && step > 0) {
      setStep(0);
      return;
    }

    // Navigate back based on entry point
    if (entryPoint === 'artist') {
      // Artist flow: 1 (search) -> 2 (venue) -> 3 (date) -> 4 (rating)
      if (step === 2) setStep(1);
      else if (step === 3) setStep(2);
      else if (step === 4) setStep(3);
    } else {
      // Venue flow: 1 (search) -> 2 (date) -> 3 (artists) -> 4 (rating)
      if (step === 2) setStep(1);
      else if (step === 3) setStep(2);
      else if (step === 4) setStep(3);
    }
  };

  // Handle unified search selection
  const handleUnifiedSelect = (result: { type: SearchResultType; id: string; name: string; location?: string; latitude?: number; longitude?: number }) => {
    setHasUnsavedChanges(true);
    
    if (result.type === 'artist') {
      // Artist selected first
      setEntryPoint('artist');
      updateShowData({
        artists: [{ name: result.name, isHeadliner: true }],
      });
      setStep(2); // Go to venue step
    } else {
      // Venue selected first
      setEntryPoint('venue');
      updateShowData({
        venue: result.name,
        venueLocation: result.location || '',
        venueId: result.id.startsWith('manual-') ? null : result.id,
        venueLatitude: result.latitude,
        venueLongitude: result.longitude,
      });
      setStep(2); // Go to date step
    }
  };

  const handleVenueSelect = (venue: string, location: string, venueId: string | null, latitude?: number, longitude?: number) => {
    updateShowData({ 
      venue, 
      venueLocation: location, 
      venueId,
      venueLatitude: latitude,
      venueLongitude: longitude
    });
    setHasUnsavedChanges(true);
    
    if (showStepSelector) {
      setStep(0);
    } else if (entryPoint === 'artist') {
      setStep(3); // Go to date step
    } else {
      setStep(2); // Normal venue-first flow
    }
  };

  const handleDateSelect = () => {
    setHasUnsavedChanges(true);
    if (showStepSelector) {
      setStep(0);
    } else if (entryPoint === 'artist') {
      setStep(4); // Go to rating
    } else {
      setStep(3); // Go to artists
    }
  };

  const handleArtistsComplete = () => {
    setHasUnsavedChanges(true);
    if (showStepSelector) {
      setStep(0);
    } else {
      setStep(4); // Go to rating
    }
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

      // Handle venue
      let venueIdToUse = null;
      
      const isGooglePlaceId = showData.venueId && !showData.venueId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      
      if (isGooglePlaceId) {
        const { data: existingVenue } = await supabase
          .from('venues')
          .select('id')
          .eq('metadata->>google_place_id', showData.venueId)
          .maybeSingle();

        if (existingVenue) {
          venueIdToUse = existingVenue.id;
          
          await supabase
            .from('venues')
            .update({
              location: showData.venueLocation || null,
              latitude: showData.venueLatitude || null,
              longitude: showData.venueLongitude || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingVenue.id);
        } else {
          const { data: newVenue, error: venueError } = await supabase
            .from('venues')
            .insert({
              name: showData.venue,
              location: showData.venueLocation || null,
              latitude: showData.venueLatitude || null,
              longitude: showData.venueLongitude || null,
              metadata: { google_place_id: showData.venueId },
            })
            .select('id')
            .single();

          if (venueError) {
            console.error('Error creating venue:', venueError);
          } else if (newVenue) {
            venueIdToUse = newVenue.id;
          }
        }
      } else if (showData.venueId) {
        venueIdToUse = showData.venueId;
        
        const { error: venueError } = await supabase
          .from('venues')
          .update({
            location: showData.venueLocation || null,
            latitude: showData.venueLatitude || null,
            longitude: showData.venueLongitude || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', showData.venueId);

        if (venueError) {
          console.error('Error updating venue cache:', venueError);
        }
      } else if (showData.venue) {
        const { data: newVenue, error: venueError } = await supabase
          .from('venues')
          .insert({
            name: showData.venue,
            location: showData.venueLocation || null,
            latitude: showData.venueLatitude || null,
            longitude: showData.venueLongitude || null,
          })
          .select('id')
          .single();

        if (venueError) {
          console.error('Error creating venue cache:', venueError);
        } else if (newVenue) {
          venueIdToUse = newVenue.id;
        }
      }

      let show;
      if (isEditing) {
        const { data: updatedShow, error: showError } = await supabase
          .from("shows")
          .update({
            venue_name: showData.venue,
            venue_location: showData.venueLocation || null,
            venue_id: venueIdToUse || null,
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
            venue_id: venueIdToUse || null,
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

      if (venueIdToUse) {
        await supabase
          .from('user_venues')
          .upsert({
            user_id: user.id,
            venue_id: venueIdToUse,
            show_count: 1,
            last_show_date: showDate,
          }, {
            onConflict: 'user_id,venue_id',
            ignoreDuplicates: false,
          });
      }

      const artistsToInsert = showData.artists.map((artist, index) => ({
        show_id: show.id,
        artist_name: artist.name,
        is_headliner: index === 0, // First artist is headliner
      }));

      const { error: artistsError } = await supabase
        .from("show_artists")
        .insert(artistsToInsert);

      if (artistsError) throw artistsError;

      toast.success(isEditing ? "Show updated successfully! 🎉" : "Show added successfully! 🎉");
      
      resetAndClose();
    } catch (error) {
      console.error("Error adding show:", error);
      toast.error("Failed to add show. Please try again.");
    }
  };

  const resetAndClose = () => {
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
    setEntryPoint(null);
    setShowStepSelector(false);
    setHasUnsavedChanges(false);
    onOpenChange(false);
  };

  // Render step content based on entry point and current step
  const renderStepContent = () => {
    // Edit mode step selector
    if (step === 0 && showStepSelector) {
      return (
        <div className="space-y-3">
          <p className="text-muted-foreground mb-4">What would you like to edit?</p>
          
          <button
            onClick={() => setStep(1)}
            className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Venue</div>
                <div className="text-sm text-muted-foreground">{showData.venue}</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStep(2)}
            className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Date</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(editShow?.date || "").toLocaleDateString()}
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStep(3)}
            className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Artists</div>
                <div className="text-sm text-muted-foreground">
                  {showData.artists.map(a => a.name).join(", ")}
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => setStep(4)}
            className="w-full p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold">Rating & Notes</div>
                <div className="text-sm text-muted-foreground">
                  {["😴", "😐", "🙂", "😃", "🤩"][showData.rating ? showData.rating - 1 : 0]}
                </div>
              </div>
            </div>
          </button>

          {hasUnsavedChanges && (
            <div className="pt-4">
              <Button onClick={handleSubmit} className="w-full" size="lg">
                Save Changes
              </Button>
            </div>
          )}
        </div>
      );
    }

    // Step 1: Unified search (new flow) or VenueStep (edit mode)
    if (step === 1) {
      if (showStepSelector) {
        // Edit mode - show venue step directly
        return (
          <VenueStep
            value={showData.venue}
            location={showData.venueLocation}
            locationFilter={showData.locationFilter}
            showType={showData.showType}
            onSelect={handleVenueSelect}
            onLocationFilterChange={updateLocationFilter}
            onShowTypeChange={updateShowType}
            isLoadingDefaultCity={isLoadingProfile}
            isEditing={true}
            onSave={handleSubmit}
          />
        );
      }
      // New show - unified search
      return <UnifiedSearchStep onSelect={handleUnifiedSelect} />;
    }

    // After step 1, flow depends on entry point
    if (entryPoint === 'artist') {
      // Artist-first flow: Search -> Venue -> Date -> Rating
      if (step === 2) {
        return (
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
        );
      }
      if (step === 3) {
        return (
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
        );
      }
      if (step === 4) {
        return (
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
        );
      }
    } else {
      // Venue-first flow: Search -> Date -> Artists -> Rating
      if (step === 2) {
        if (showStepSelector) {
          return (
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
              isEditing={true}
              onSave={handleSubmit}
            />
          );
        }
        return (
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
        );
      }
      if (step === 3) {
        if (showStepSelector) {
          return (
            <ArtistsStep
              artists={showData.artists}
              onArtistsChange={(artists) => updateShowData({ artists })}
              onContinue={handleArtistsComplete}
              isEditing={true}
              onSave={handleSubmit}
            />
          );
        }
        return (
          <ArtistsStep
            artists={showData.artists}
            onArtistsChange={(artists) => updateShowData({ artists })}
            onContinue={handleArtistsComplete}
          />
        );
      }
      if (step === 4) {
        return (
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
        );
      }
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
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
          <h2 className="text-2xl font-bold">
            {editShow ? "Edit Show" : "Add a Show"}
          </h2>
        </div>

        {/* Step content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {renderStepContent()}
        </div>

        {/* Progress indicator - hide for step selector */}
        {step > 0 && !showStepSelector && (
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
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddShowFlow;

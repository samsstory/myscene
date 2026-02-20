import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, MapPin, Calendar, Music, Star, Camera, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import UnifiedSearchStep, { SearchResultType } from "./add-show-steps/UnifiedSearchStep";
import ShowTypeStep from "./add-show-steps/ShowTypeStep";
import type { ShowType } from "./add-show-steps/ShowTypeStep";
import VenueStep from "./add-show-steps/VenueStep";
import DateStep from "./add-show-steps/DateStep";
import ArtistsStep from "./add-show-steps/ArtistsStep";
import RatingStep from "./add-show-steps/RatingStep";
import QuickCompareStep from "./add-show-steps/QuickCompareStep";
import SuccessStep from "./add-show-steps/SuccessStep";
import GroupShowPrompt from "./home/GroupShowPrompt";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AddShowPrefill {
  showType: ShowType;
  artistName: string;
  artistImageUrl?: string | null;
  venueName?: string | null;
  venueLocation?: string | null;
  showDate?: string | null;
}

interface AddShowFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowAdded?: (show: AddedShowData) => void;
  onViewShowDetails?: (showId: string) => void;
  prefill?: AddShowPrefill | null;
  editShow?: {
    id: string;
    venue: {name: string;location: string;};
    date: string;
    datePrecision: string;
    artists: Array<{name: string;isHeadliner: boolean;}>;
    rating?: number | null;
    tags?: string[];
    notes?: string | null;
    venueId?: string | null;
    photo_url?: string | null;
    showType?: string;
  } | null;
}

export interface AddedShowData {
  id: string;
  artists: Array<{name: string;isHeadliner: boolean;}>;
  venue: {name: string;location: string;};
  date: string;
  rating?: number | null;
  tags?: string[];
}

export interface ShowData {
  venue: string;
  venueLocation: string;
  venueId: string | null;
  venueLatitude?: number;
  venueLongitude?: number;
  showType: ShowType;
  eventName: string;
  eventDescription: string;
  date: Date | undefined;
  datePrecision: "exact" | "approximate" | "unknown";
  selectedMonth: string;
  selectedYear: string;
  artists: Array<{name: string;isHeadliner: boolean;imageUrl?: string;spotifyId?: string;}>;
  rating?: number | null;
  locationFilter: string;
  tags: string[];
  notes: string;
}


type EntryPoint = 'artist' | 'venue' | null;

const AddShowFlow = ({ open, onOpenChange, onShowAdded, onViewShowDetails, editShow, prefill }: AddShowFlowProps) => {
  const [step, setStep] = useState(0);
  const [entryPoint, setEntryPoint] = useState<EntryPoint>(null);
  const [showStepSelector, setShowStepSelector] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [addedShow, setAddedShow] = useState<AddedShowData | null>(null);
  const [showData, setShowData] = useState<ShowData>({
    venue: "",
    venueLocation: "",
    venueId: null,
    showType: 'set',
    eventName: "",
    eventDescription: "",
    date: undefined,
    datePrecision: "exact",
    selectedMonth: "",
    selectedYear: "",
    artists: [],
    rating: null,
    locationFilter: "",
    tags: [],
    notes: ""
  });
  const [userHomeCity, setUserHomeCity] = useState<string>("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Track if we've already initialized edit data for this dialog open
  const [editInitialized, setEditInitialized] = useState(false);

  // Photo editing state for edit mode
  const [editPhotoUrl, setEditPhotoUrl] = useState<string | null>(null);
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  // Group show prompt state
  const [groupPromptOpen, setGroupPromptOpen] = useState(false);
  const [groupingSiblings, setGroupingSiblings] = useState<Array<{ id: string; artistName: string; artistImageUrl?: string | null }>>([]);
  const [groupingNewShowId, setGroupingNewShowId] = useState<string | null>(null);
  const [groupingMeta, setGroupingMeta] = useState<{ venueName: string; showDate: string; venueLocation: string | null; venueId: string | null; datePrecision: string; userId: string } | null>(null);
  const [isGrouping, setIsGrouping] = useState(false);

  // Populate form with edit data - only run ONCE when dialog opens with editShow
  useEffect(() => {
    if (editShow && open && !editInitialized) {
      const showDate = new Date(editShow.date);
      const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];


      setShowData({
        venue: editShow.venue.name,
        venueLocation: editShow.venue.location,
        venueId: editShow.venueId || null,
        showType: (editShow.showType as ShowType) || 'set',
        eventName: "",
        eventDescription: "",
        date: editShow.datePrecision === 'exact' ? showDate : undefined,
        datePrecision: editShow.datePrecision as "exact" | "approximate" | "unknown",
        selectedMonth: months[showDate.getMonth()],
        selectedYear: showDate.getFullYear().toString(),
        artists: editShow.artists,
        rating: editShow.rating,
        locationFilter: "",
        tags: editShow.tags || [],
        notes: editShow.notes || ""
      });
      setEditPhotoUrl(editShow.photo_url || null);
      setShowStepSelector(true);
      setStep(0);
      setEntryPoint(null);
      setEditInitialized(true);
    } else if (open && !editShow && prefill) {
      // "I was there" / quick-add: pre-fill type + artist + optional venue/date
      const prefillDate = prefill.showDate ? new Date(prefill.showDate) : undefined;
      setShowData(prev => ({
        ...prev,
        showType: prefill.showType,
        artists: [{ name: prefill.artistName, isHeadliner: true, imageUrl: prefill.artistImageUrl || undefined }],
        venue: prefill.venueName || "",
        venueLocation: prefill.venueLocation || "",
        date: prefillDate,
        datePrecision: prefillDate ? "exact" : prev.datePrecision,
      }));
      setEntryPoint('artist');
      // Skip steps that are already filled
      const hasVenue = !!prefill.venueName;
      const hasDate = !!prefill.showDate;
      if (hasVenue && hasDate) {
        setStep(4); // Skip to rating/details
      } else if (hasVenue) {
        setStep(3); // Skip to date
      } else {
        setStep(2); // Go to venue
      }
      setShowStepSelector(false);
      setEditInitialized(true);
    } else if (open && !editShow) {
      setShowStepSelector(false);
      setStep(0);
      setEntryPoint(null);
      setEditPhotoUrl(null);
      setEditInitialized(false);
    }
  }, [editShow, open, editInitialized, prefill]);

  // Reset editInitialized when dialog closes
  useEffect(() => {
    if (!open) {
      setEditInitialized(false);
    }
  }, [open]);

  // Fetch user's home city from profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase.
        from('profiles').
        select('home_city').
        eq('id', user.id).
        single();

        if (profile?.home_city) {
          setUserHomeCity(profile.home_city);
          setShowData((prev) => ({ ...prev, locationFilter: profile.home_city }));
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
    setShowData((prev) => ({ ...prev, ...updates }));
  };

  const updateShowType = (type: ShowType) => {
    updateShowData({ showType: type });
  };

  const updateLocationFilter = async (newLocation: string) => {
    updateShowData({ locationFilter: newLocation });

    if (newLocation !== userHomeCity && newLocation.trim()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.
        from('profiles').
        upsert({
          id: user.id,
          home_city: newLocation
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
    return 4; // Search -> [Venue/Artists] -> Date -> Rating/Details
  };

  // Get current step number for progress indicator
  const getCurrentStepNumber = () => {
    if (showStepSelector) return step;
    return step;
  };

  // Get step labels for progress
  const getStepLabels = () => {
    if (entryPoint === 'artist') {
      return ['Search', 'Venue', 'Date', 'Details'];
    }
    return ['Search', 'Date', 'Artists', 'Details'];
  };

  const handleBack = () => {
    if (step === 0) {
      // At type picker, close dialog
      onOpenChange(false);
      return;
    }
    if (step === 1 && !showStepSelector) {
      // Back from search → go to type picker
      setStep(0);
      return;
    }
    if (showStepSelector && step > 0) {
      setStep(0);
      return;
    }
    // Navigate back based on entry point
    if (entryPoint === 'artist') {
      if (step === 2) setStep(1);
      else if (step === 3) setStep(2);
      else if (step === 4) setStep(3);
    } else {
      if (step === 2) setStep(1);
      else if (step === 3) setStep(2);
      else if (step === 4) setStep(3);
    }
  };

  // Handle unified search selection — behavior depends on showType
  const handleUnifiedSelect = (result: {type: SearchResultType;id: string;name: string;imageUrl?: string;location?: string;latitude?: number;longitude?: number;eventId?: string;eventType?: string;venueName?: string;}) => {
    setHasUnsavedChanges(true);
    const isEventMode = showData.showType === 'show' || showData.showType === 'festival';

    if (!isEventMode && result.type === 'artist') {
      // Solo Show: artist selected → go to venue step
      setEntryPoint('artist');
      updateShowData({
        artists: [{ name: result.name, isHeadliner: true, imageUrl: result.imageUrl, spotifyId: result.id }]
      });
      setStep(2); // Go to venue step
    } else if (result.eventId && result.venueName) {
      // Event from registry: pre-fill venue info and skip venue step
      setEntryPoint('venue');
      updateShowData({
        eventName: result.name,
        venue: result.venueName,
        venueLocation: result.location || '',
        venueId: result.id.startsWith('event-') ? null : result.id,
        venueLatitude: result.latitude,
        venueLongitude: result.longitude
      });
      setStep(3); // Skip venue step, go directly to date
    } else {
      // Showcase/Festival: event/venue selected → stores eventName, go to venue step (optional)
      setEntryPoint('venue');
      updateShowData({
        eventName: result.name,
        venue: result.location ? result.name : showData.venue,
        venueLocation: result.location || '',
        venueId: result.id.startsWith('manual-') ? null : result.id,
        venueLatitude: result.latitude,
        venueLongitude: result.longitude
      });
      setStep(2); // Go to venue step
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
      // Artist flow: after date, go to rating step
      setStep(4);
    } else {
      setStep(3); // Go to artists
    }
  };

  const handleArtistsComplete = () => {
    setHasUnsavedChanges(true);
    if (showStepSelector) {
      setStep(0);
    } else {
      // After artists step, go to rating step
      setStep(4);
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
      "July", "August", "September", "October", "November", "December"];


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
        const { data: existingVenue } = await supabase.
        from('venues').
        select('id').
        eq('metadata->>google_place_id', showData.venueId).
        maybeSingle();

        if (existingVenue) {
          venueIdToUse = existingVenue.id;

          await supabase.
          from('venues').
          update({
            location: showData.venueLocation || null,
            latitude: showData.venueLatitude || null,
            longitude: showData.venueLongitude || null,
            updated_at: new Date().toISOString()
          }).
          eq('id', existingVenue.id);
        } else {
          const { data: newVenue, error: venueError } = await supabase.
          from('venues').
          insert({
            name: showData.venue,
            location: showData.venueLocation || null,
            latitude: showData.venueLatitude || null,
            longitude: showData.venueLongitude || null,
            metadata: { google_place_id: showData.venueId }
          }).
          select('id').
          single();

          if (venueError) {
            console.error('Error creating venue:', venueError);
          } else if (newVenue) {
            venueIdToUse = newVenue.id;
          }
        }
      } else if (showData.venueId) {
        venueIdToUse = showData.venueId;

        const { error: venueError } = await supabase.
        from('venues').
        update({
          location: showData.venueLocation || null,
          latitude: showData.venueLatitude || null,
          longitude: showData.venueLongitude || null,
          updated_at: new Date().toISOString()
        }).
        eq('id', showData.venueId);

        if (venueError) {
          console.error('Error updating venue cache:', venueError);
        }
      } else if (showData.venue) {
        const { data: newVenue, error: venueError } = await supabase.
        from('venues').
        insert({
          name: showData.venue,
          location: showData.venueLocation || null,
          latitude: showData.venueLatitude || null,
          longitude: showData.venueLongitude || null
        }).
        select('id').
        single();

        if (venueError) {
          console.error('Error creating venue cache:', venueError);
        } else if (newVenue) {
          venueIdToUse = newVenue.id;
        }
      }

      let show;
      if (isEditing) {
        const { data: updatedShow, error: showError } = await supabase.
        from("shows").
        update({
          venue_name: showData.venue,
          venue_location: showData.venueLocation || null,
          venue_id: venueIdToUse || null,
          show_date: showDate,
          date_precision: showData.datePrecision,
          rating: showData.rating,
          notes: showData.notes || null,
          show_type: showData.showType,
        }).
        eq('id', editShow.id).
        select().
        single();

        if (showError) throw showError;
        show = updatedShow;

        await supabase.
        from("show_artists").
        delete().
        eq('show_id', editShow.id);
      } else {
        const { data: newShow, error: showError } = await supabase.
        from("shows").
        insert({
          user_id: user.id,
          venue_name: showData.venue || showData.eventName,
          venue_location: showData.venueLocation || null,
          venue_id: venueIdToUse || null,
          show_date: showDate,
          date_precision: showData.datePrecision,
          rating: showData.rating,
          notes: showData.notes || null,
          show_type: showData.showType,
          event_name: showData.eventName || null,
          event_description: showData.eventDescription || null,
        }).
        select().
        single();

        if (showError) throw showError;
        show = newShow;

        // Auto-populate events registry for festivals/shows
        if (showData.eventName && (showData.showType === 'festival' || showData.showType === 'show')) {
          try {
            const showYear = new Date(showDate).getFullYear();
            await supabase
              .from('events')
              .upsert({
                name: showData.eventName,
                venue_name: showData.venue,
                venue_location: showData.venueLocation || null,
                venue_id: venueIdToUse,
                event_type: showData.showType,
                year: showYear,
                created_by_user_id: user.id,
              }, { onConflict: 'name,year', ignoreDuplicates: true });
          } catch (eventErr) {
            console.error('Error upserting event:', eventErr);
          }
        }
      }

      if (venueIdToUse) {
        await supabase.
        from('user_venues').
        upsert({
          user_id: user.id,
          venue_id: venueIdToUse,
          show_count: 1,
          last_show_date: showDate
        }, {
          onConflict: 'user_id,venue_id',
          ignoreDuplicates: false
        });
      }

      const artistsToInsert = showData.artists.map((artist, index) => ({
        show_id: show.id,
        artist_name: artist.name,
        is_headliner: index === 0,
        artist_image_url: artist.imageUrl || null,
        spotify_artist_id: artist.spotifyId || null
      }));

      const { error: artistsError } = await supabase.
      from("show_artists").
      insert(artistsToInsert);

      if (artistsError) throw artistsError;

      // Insert/update tags
      if (isEditing) {
        // Delete existing tags for this show
        await supabase.from("show_tags").delete().eq('show_id', show.id);
      }

      if (showData.tags.length > 0) {
        const { getCategoryForTag } = await import("@/lib/tag-constants");
        const tagsToInsert = showData.tags.map((tag) => ({
          show_id: show.id,
          tag,
          category: getCategoryForTag(tag) || "the_show"
        }));

        const { error: tagsError } = await supabase.
        from("show_tags").
        insert(tagsToInsert);

        if (tagsError) throw tagsError;
      }

      if (isEditing) {
        toast.success("Show updated successfully! 🎉");
        resetAndClose();
      } else {
        // For new shows, check for sibling sets at same venue+date
        const newShowData: AddedShowData = {
          id: show.id,
          artists: showData.artists,
          venue: { name: showData.venue, location: showData.venueLocation },
          date: showDate,
          rating: null,
          tags: showData.tags
        };
        setAddedShow(newShowData);

        // Only check siblings for sets (not shows/festivals)
        if (showData.showType === 'set') {
          try {
            const { data: siblings } = await supabase
              .from("shows")
              .select("id, show_artists(artist_name, artist_image_url, is_headliner)")
              .eq("user_id", user.id)
              .eq("show_date", showDate)
              .ilike("venue_name", showData.venue)
              .eq("show_type", "set")
              .is("parent_show_id", null)
              .neq("id", show.id);

            if (siblings && siblings.length > 0) {
              // Build sibling list including the new show
              const siblingList = [
                ...siblings.map((s: any) => {
                  const headliner = s.show_artists?.find((a: any) => a.is_headliner) || s.show_artists?.[0];
                  return {
                    id: s.id,
                    artistName: headliner?.artist_name || "Unknown",
                    artistImageUrl: headliner?.artist_image_url || null,
                  };
                }),
                {
                  id: show.id,
                  artistName: showData.artists[0]?.name || "Unknown",
                  artistImageUrl: showData.artists[0]?.imageUrl || null,
                },
              ];
              setGroupingSiblings(siblingList);
              setGroupingNewShowId(show.id);
              setGroupingMeta({
                venueName: showData.venue,
                showDate,
                venueLocation: showData.venueLocation || null,
                venueId: venueIdToUse,
                datePrecision: showData.datePrecision,
                userId: user.id,
              });
              setStep(5); // Go to success step
              setGroupPromptOpen(true); // Show group prompt on top
              return; // Don't go to success step yet — prompt is shown
            }
          } catch (err) {
            console.error("Error checking siblings:", err);
          }
        }

        setStep(5); // Success step
      }
    } catch (error) {
      console.error("Error adding show:", error);
      toast.error("Failed to add show. Please try again.");
    }
  };

  // Handle photo upload for the success step
  const handlePhotoUpload = async (file: File) => {
    if (!addedShow) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not authenticated");

    // Compress and upload
    const ext = file.type.split('/')[1] || 'jpg';
    const fileName = `${session.user.id}/${addedShow.id}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage.
    from('show-photos').
    upload(fileName, file, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) throw uploadError;

    // Get public URL and update show record
    const { data: { publicUrl } } = supabase.storage.
    from('show-photos').
    getPublicUrl(fileName);

    const { error: updateError } = await supabase.
    from('shows').
    update({ photo_url: publicUrl }).
    eq('id', addedShow.id);

    if (updateError) throw updateError;
  };

  // Handle photo upload for edit mode (step selector)
  const handleEditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editShow) return;

    setEditPhotoUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${editShow.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.
      from('show-photos').
      upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.
      from('show-photos').
      getPublicUrl(filePath);

      await supabase.from('shows').
      update({ photo_url: publicUrl }).
      eq('id', editShow.id);

      setEditPhotoUrl(publicUrl);
      setHasUnsavedChanges(true);
      toast.success("Photo updated!");
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error("Failed to upload photo");
    } finally {
      setEditPhotoUploading(false);
    }
  };

  const handleGroupShows = async () => {
    if (!groupingMeta || !groupingNewShowId) return;
    setIsGrouping(true);
    try {
      // Create parent Show record
      const { data: parentShow, error: parentError } = await supabase
        .from("shows")
        .insert({
          user_id: groupingMeta.userId,
          venue_name: groupingMeta.venueName,
          venue_location: groupingMeta.venueLocation,
          venue_id: groupingMeta.venueId,
          show_date: groupingMeta.showDate,
          date_precision: groupingMeta.datePrecision,
          show_type: "show",
        } as any)
        .select("id")
        .single();

      if (parentError) throw parentError;

      // Link all children
      const childIds = groupingSiblings.map((s) => s.id);
      const { error: linkError } = await supabase
        .from("shows")
        .update({ parent_show_id: parentShow.id } as any)
        .in("id", childIds);

      if (linkError) throw linkError;

      toast.success("Sets grouped into a Show! 🎉");
    } catch (err) {
      console.error("Error grouping shows:", err);
      toast.error("Failed to group shows");
    } finally {
      setIsGrouping(false);
      setGroupPromptOpen(false);
      setGroupingSiblings([]);
      setGroupingNewShowId(null);
      setGroupingMeta(null);
    }
  };

  const handleDismissGroup = () => {
    setGroupPromptOpen(false);
    setGroupingSiblings([]);
    setGroupingNewShowId(null);
    setGroupingMeta(null);
  };

  const resetAndClose = () => {
    setShowData({
      venue: "",
      venueLocation: "",
      venueId: null,
      showType: 'set',
      eventName: "",
      eventDescription: "",
      date: undefined,
      datePrecision: "exact",
      selectedMonth: "",
      selectedYear: "",
      artists: [],
      rating: null,
      locationFilter: "",
      tags: [],
      notes: ""
    });
    setStep(0);
    setEntryPoint(null);
    setShowStepSelector(false);
    setHasUnsavedChanges(false);
    setAddedShow(null);
    setEditPhotoUrl(null);
    setGroupPromptOpen(false);
    setGroupingSiblings([]);
    setGroupingNewShowId(null);
    setGroupingMeta(null);
    onOpenChange(false);
  };

  const handleShareShow = () => {
    if (addedShow && onShowAdded) {
      onShowAdded(addedShow);
    }
    resetAndClose();
  };

  // Render quick compare step
  const renderQuickCompareStep = () => {
    if (!addedShow) return null;

    return (
      <QuickCompareStep
        newShowId={addedShow.id}
        newShowArtists={addedShow.artists}
        newShowVenue={addedShow.venue.name}
        newShowDate={addedShow.date}
        onComplete={() => {
          toast.success("Show ranked! 🎉");
          if (onShowAdded) {
            onShowAdded(addedShow);
          }
          resetAndClose();
        }}
        onSkip={() => {
          toast.success("Show added! 🎉");
          if (onShowAdded) {
            onShowAdded(addedShow);
          }
          resetAndClose();
        }} />);


  };

  // Render step content based on entry point and current step
  const renderStepContent = () => {
    // Edit mode step selector
    if (step === 0 && showStepSelector) {
      return (
        <div className="space-y-3">
          <p className="text-muted-foreground mb-4">What would you like to edit?</p>
          
          {/* Photo Option - FIRST */}
          <button
            onClick={() => editPhotoInputRef.current?.click()}
            disabled={editPhotoUploading}
            className="w-full p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200 text-left disabled:opacity-50">
            <div className="flex items-center gap-3">
              {editPhotoUrl ?
              <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-primary/40 ring-offset-2 ring-offset-background">
                  <img src={editPhotoUrl} alt="Show photo" className="w-full h-full object-cover" />
                </div> :
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
              }
              <div>
                <div className="font-semibold">{editPhotoUploading ? "Uploading..." : "Photo"}</div>
                <div className="text-sm text-muted-foreground">{editPhotoUrl ? "Tap to change" : "Add a photo"}</div>
              </div>
            </div>
          </button>
          <input ref={editPhotoInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleEditPhotoUpload} />
          <button onClick={() => setStep(1)} className="w-full p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><MapPin className="h-5 w-5 text-primary" /></div>
              <div><div className="font-semibold">Venue</div><div className="text-sm text-muted-foreground">{showData.venue}</div></div>
            </div>
          </button>
          <button onClick={() => setStep(2)} className="w-full p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Calendar className="h-5 w-5 text-primary" /></div>
              <div><div className="font-semibold">Date</div><div className="text-sm text-muted-foreground">{new Date(editShow?.date || "").toLocaleDateString()}</div></div>
            </div>
          </button>
          <button onClick={() => setStep(3)} className="w-full p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Music className="h-5 w-5 text-primary" /></div>
              <div><div className="font-semibold">Artists</div><div className="text-sm text-muted-foreground">{showData.artists.map((a) => a.name).join(", ")}</div></div>
            </div>
          </button>
          <button onClick={() => setStep(7)} className="w-full p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Layers className="h-5 w-5 text-primary" /></div>
              <div>
                <div className="font-semibold">Show Type</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {{ set: "Set", show: "Show", festival: "Festival" }[showData.showType] || "Set"}
                </div>
              </div>
            </div>
          </button>
          <button onClick={() => setStep(4)} className="w-full p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center"><Star className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">Tags & My Take</div>
                <div className="text-sm text-muted-foreground truncate">{showData.notes ? showData.notes.length > 40 ? `${showData.notes.substring(0, 40)}...` : showData.notes : "Optional details"}</div>
              </div>
            </div>
          </button>
          {hasUnsavedChanges && <div className="pt-4"><Button onClick={handleSubmit} className="w-full py-6 text-base font-semibold rounded-xl bg-gradient-to-r from-[hsl(189,94%,55%)] via-primary to-[hsl(17,88%,60%)] shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01] transition-all duration-200" size="lg">Save Changes</Button></div>}
        </div>);
    }

    // Step 0 (new show only): Type picker
    if (step === 0 && !showStepSelector) {
      return (
        <ShowTypeStep
          onSelect={(type) => {
            updateShowData({ showType: type, eventName: "", venue: "", artists: [] });
            setStep(1);
          }}
        />
      );
    }

    // Step 1: Unified search (new flow) or VenueStep (edit mode)
    if (step === 1) {
      if (showStepSelector) {
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
            onSave={handleSubmit} />);
      }
      // New show - unified search, context-aware
      return <UnifiedSearchStep onSelect={handleUnifiedSelect} showType={showData.showType} />;
    }

    // After step 1, flow depends on entry point
    if (entryPoint === 'artist') {
      // Artist-first flow: Search -> Venue -> Date -> Rating
      if (step === 2) {
        // Get headliner name for dynamic header
        const headliner = showData.artists.find((a) => a.isHeadliner);
        const artistName = headliner?.name || showData.artists[0]?.name;

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
            selectedArtistName={artistName}
            onSelectAsEvent={(eventName, eventDescription) => {
              updateShowData({
                eventName,
                eventDescription,
                venue: eventName,
                venueLocation: '',
                venueId: null,
              });
              setStep(3);
            }}
            onEventRegistrySelect={(event) => {
              updateShowData({
                eventName: event.eventName,
                venue: event.venueName || event.eventName,
                venueLocation: event.venueLocation || '',
                venueId: event.venueId,
              });
              setHasUnsavedChanges(true);
              setStep(3); // Skip to date step
            }} />);


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
            onContinue={handleDateSelect} />);


      }
      if (step === 4) {
        // Show RatingStep for both new shows and edit mode
        return (
          <RatingStep
            tags={showData.tags}
            onTagsChange={(tags) => updateShowData({ tags })}
            notes={showData.notes}
            onNotesChange={(notes) => updateShowData({ notes })}
            onSubmit={handleSubmit}
            onSkip={handleSubmit}
            isEditMode={showStepSelector} />);


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
              onSave={handleSubmit} />);


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
            onContinue={handleDateSelect} />);


      }
      if (step === 3) {
        if (showStepSelector) {
          return (
            <ArtistsStep
              artists={showData.artists}
              onArtistsChange={(artists) => updateShowData({ artists })}
              onContinue={handleArtistsComplete}
              isEditing={true}
              onSave={handleSubmit} />);


        }
        return (
          <ArtistsStep
            artists={showData.artists}
            onArtistsChange={(artists) => updateShowData({ artists })}
            onContinue={handleArtistsComplete} />);


      }
      if (step === 4) {
        // Show RatingStep for both new shows and edit mode
        return (
          <RatingStep
            tags={showData.tags}
            onTagsChange={(tags) => updateShowData({ tags })}
            notes={showData.notes}
            onNotesChange={(notes) => updateShowData({ notes })}
            onSubmit={handleSubmit}
            onSkip={handleSubmit}
            isEditMode={showStepSelector} />);


      }
    }

    // Edit mode: Show Type picker (step 7)
    if (step === 7 && showStepSelector) {
      return (
        <ShowTypeStep
          onSelect={async (type) => {
            if (!editShow) return;
            updateShowData({ showType: type });
            setHasUnsavedChanges(true);
            // Save directly to avoid stale-state race condition
            const { error } = await supabase
              .from("shows")
              .update({ show_type: type })
              .eq("id", editShow.id);
            if (error) {
              toast.error("Failed to update show type");
            } else {
              toast.success("Show type updated!");
              setStep(0);
            }
          }}
        />
      );
    }

    // Success step (step 5 for new shows)
    if (step === 5 && addedShow) {
      return (
        <SuccessStep
          show={addedShow}
          onAddPhoto={handlePhotoUpload}
          onShare={handleShareShow}
          onViewDetails={() => {
            if (onViewShowDetails) {
              onViewShowDetails(addedShow.id);
            }
            resetAndClose();
          }}
          onDone={() => {
            toast.success("Show added! 🎉");
            if (onShowAdded) {
              onShowAdded(addedShow);
            }
            resetAndClose();
          }} />);


    }

    // Quick compare step (step 6 for new shows)
    if (step === 6 && addedShow) {
      return renderQuickCompareStep();
    }

    return null;
  };

  // SVG noise texture for tactile feel
  const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  return (
    <>
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 bg-background relative max-h-[65vh] sm:max-h-[85vh] flex flex-col fixed top-[max(4.5rem,env(safe-area-inset-top,4.5rem))] sm:top-[50%] left-[50%] translate-x-[-50%] sm:translate-y-[-50%] translate-y-0 overflow-hidden">
        {/* Mesh gradient background - Scene aesthetic */}
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <div
            className="absolute inset-0 animate-pulse-glow"
            style={{ background: "radial-gradient(ellipse at 20% 10%, hsl(189 94% 55% / 0.06) 0%, transparent 50%)" }} />

          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(ellipse at 80% 90%, hsl(17 88% 60% / 0.06) 0%, transparent 50%)" }} />

          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: noiseTexture }} />

        </div>

        {/* Back button - absolute positioned (hide on success/quick compare steps) */}
        {step > 1 && step < 5 &&
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8 absolute left-4 top-4 z-20">

            <ArrowLeft className="h-5 w-5" />
          </Button>
        }

        {/* Step content - scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4 min-h-0 relative z-10">
          <div className="flex flex-col items-center">
            {step !== 5 &&
            <h2 className="text-xl font-bold text-center mb-4">
                {editShow ? "Edit Show" : "Add a Show"}
              </h2>
            }
            <div className="w-full">
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* Progress indicator - hide for step selector and success/quick compare steps */}
        {step > 0 && step < 5 && !showStepSelector &&
        <div className="flex gap-1.5 px-6 pb-4 pt-2 border-t border-white/[0.06] bg-transparent relative z-10">
            {[1, 2, 3, 4].map((i) =>
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i <= step ?
            "bg-primary shadow-[0_0_8px_hsl(189_94%_55%/0.6)]" :
            "bg-white/20"}`
            } />

          )}
          </div>
        }
      </DialogContent>
    </Dialog>

    <GroupShowPrompt
      open={groupPromptOpen}
      onOpenChange={setGroupPromptOpen}
      venueName={groupingMeta?.venueName || ""}
      showDate={groupingMeta?.showDate || ""}
      siblingShows={groupingSiblings}
      onGroup={handleGroupShows}
      onDismiss={handleDismissGroup}
      isGrouping={isGrouping}
    />
    </>
  );

};

export default AddShowFlow;
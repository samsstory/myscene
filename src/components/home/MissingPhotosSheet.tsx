import { useState, useEffect, useMemo, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Check, ImagePlus, X, Sparkles, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO, isSameDay, differenceInDays } from "date-fns";
import { extractExifData } from "@/lib/exif-utils";

interface ShowWithoutPhoto {
  id: string;
  artistName: string;
  artistImageUrl?: string | null;
  venueName: string;
  showDate: string;
}

interface SelectedPhoto {
  file: File;
  previewUrl: string;
  extractedDate: Date | null;
}

interface PhotoShowMatch {
  photo: SelectedPhoto;
  assignedShowId: string | null;
}

interface MissingPhotosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

type Step = 'select-photos' | 'match-photos';

export const MissingPhotosSheet = ({ 
  open, 
  onOpenChange,
  onComplete 
}: MissingPhotosSheetProps) => {
  const [shows, setShows] = useState<ShowWithoutPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('select-photos');
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [matches, setMatches] = useState<PhotoShowMatch[]>([]);
  const [saving, setSaving] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [leaveNakedIds, setLeaveNakedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch shows without photos when sheet opens
  useEffect(() => {
    if (open) {
      fetchShowsWithoutPhotos();
      setStep('select-photos');
      setSelectedPhotos([]);
      setMatches([]);
      setActivePhotoIndex(null);
      setLeaveNakedIds(new Set());
    }
  }, [open]);

  const fetchShowsWithoutPhotos = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch shows without photos (excluding declined ones)
      const { data: showsData, error } = await supabase
        .from('shows')
        .select('id, venue_name, show_date')
        .eq('user_id', user.id)
        .is('photo_url', null)
        .eq('photo_declined', false)
        .order('show_date', { ascending: false });

      if (error) throw error;

      // Fetch headliner artist for each show
      const showsWithArtists = await Promise.all((showsData || []).map(async (show) => {
        const { data: artistData } = await supabase
          .from('show_artists')
          .select('artist_name, artist_image_url')
          .eq('show_id', show.id)
          .eq('is_headliner', true)
          .limit(1);

        return {
          id: show.id,
          artistName: artistData?.[0]?.artist_name || 'Unknown Artist',
          artistImageUrl: artistData?.[0]?.artist_image_url || null,
          venueName: show.venue_name,
          showDate: show.show_date,
        };
      }));

      setShows(showsWithArtists);
    } catch (error) {
      console.error('Error fetching shows without photos:', error);
      toast.error('Failed to load shows');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const photos: SelectedPhoto[] = [];

    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      
      // Extract EXIF date
      let extractedDate: Date | null = null;
      try {
        const exifData = await extractExifData(file);
        extractedDate = exifData.date;
      } catch (error) {
        console.error('Error extracting metadata:', error);
      }

      photos.push({ file, previewUrl, extractedDate });
    }

    setSelectedPhotos(photos);
    
    // Auto-match photos to shows by date
    const autoMatches = autoMatchPhotosToShows(photos, shows);
    setMatches(autoMatches);
    setStep('match-photos');
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const autoMatchPhotosToShows = (photos: SelectedPhoto[], availableShows: ShowWithoutPhoto[]): PhotoShowMatch[] => {
    const usedShowIds = new Set<string>();
    
    return photos.map(photo => {
      if (!photo.extractedDate) {
        return { photo, assignedShowId: null };
      }

      // Find best matching show by date (same day or within 1 day)
      let bestMatch: ShowWithoutPhoto | null = null;
      let bestDiff = Infinity;

      for (const show of availableShows) {
        if (usedShowIds.has(show.id)) continue;

        const showDate = parseISO(show.showDate);
        const diff = Math.abs(differenceInDays(photo.extractedDate, showDate));

        if (diff <= 1 && diff < bestDiff) {
          bestMatch = show;
          bestDiff = diff;
        }
      }

      if (bestMatch) {
        usedShowIds.add(bestMatch.id);
        return { photo, assignedShowId: bestMatch.id };
      }

      return { photo, assignedShowId: null };
    });
  };

  const assignPhotoToShow = async (photoIndex: number, showId: string | null) => {
    setMatches(prev => {
      const updated = [...prev];
      updated[photoIndex] = { ...updated[photoIndex], assignedShowId: showId };
      return updated;
    });
    setActivePhotoIndex(null);
  };

  const toggleLeaveNaked = (showId: string) => {
    setLeaveNakedIds(prev => {
      const updated = new Set(prev);
      if (updated.has(showId)) {
        updated.delete(showId);
      } else {
        updated.add(showId);
      }
      return updated;
    });
  };

  const saveLeaveNakedShows = async () => {
    if (leaveNakedIds.size === 0) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('shows')
        .update({ photo_declined: true })
        .in('id', Array.from(leaveNakedIds));

      if (error) throw error;

      // Remove from local shows list
      setShows(prev => prev.filter(s => !leaveNakedIds.has(s.id)));
      
      // Remove any matches pointing to these shows
      setMatches(prev => prev.map(m => 
        m.assignedShowId && leaveNakedIds.has(m.assignedShowId) 
          ? { ...m, assignedShowId: null } 
          : m
      ));

      toast.success(`${leaveNakedIds.size} ${leaveNakedIds.size === 1 ? 'show' : 'shows'} marked as "Leave Naked"`);
      setLeaveNakedIds(new Set());
    } catch (error) {
      console.error('Error marking shows as declined:', error);
      toast.error('Failed to update shows');
    } finally {
      setSaving(false);
    }
  };

  const getAvailableShows = (currentPhotoIndex: number): ShowWithoutPhoto[] => {
    const assignedShowIds = new Set(
      matches
        .filter((m, i) => i !== currentPhotoIndex && m.assignedShowId)
        .map(m => m.assignedShowId!)
    );
    return shows.filter(s => !assignedShowIds.has(s.id));
  };

  const matchedCount = useMemo(() => {
    return matches.filter(m => m.assignedShowId !== null).length;
  }, [matches]);

  const handleSaveAll = async () => {
    const matchesToSave = matches.filter(m => m.assignedShowId !== null);
    if (matchesToSave.length === 0) {
      toast.error('No photos matched to shows');
      return;
    }

    setSaving(true);
    let successCount = 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      for (const match of matchesToSave) {
        try {
          // Upload photo to storage
          const fileExt = match.photo.file.name.split('.').pop();
          const fileName = `${user.id}/${match.assignedShowId}-${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('show-photos')
            .upload(fileName, match.photo.file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('show-photos')
            .getPublicUrl(fileName);

          // Update show with photo URL
          const { error: updateError } = await supabase
            .from('shows')
            .update({ photo_url: urlData.publicUrl })
            .eq('id', match.assignedShowId);

          if (updateError) throw updateError;

          successCount++;
        } catch (error) {
          console.error('Error uploading photo:', error);
        }
      }

      if (successCount > 0) {
        toast.success(`Added ${successCount} photo${successCount !== 1 ? 's' : ''} to your shows!`);
      }

      // Clean up preview URLs
      selectedPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));

      onOpenChange(false);
      onComplete?.();
    } catch (error) {
      console.error('Error saving photos:', error);
      toast.error('Failed to save photos');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    // Clean up preview URLs
    selectedPhotos.forEach(p => URL.revokeObjectURL(p.previewUrl));
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl"
      >
        <SheetHeader className="flex-shrink-0 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={step === 'match-photos' && selectedPhotos.length > 0 
                ? () => setStep('select-photos') 
                : handleClose}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-lg font-bold">
              {step === 'select-photos' ? 'Add Photos to Shows' : 'Match Photos'}
            </SheetTitle>
          </div>
          
          {/* Progress indicator for matching step */}
          {step === 'match-photos' && matches.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">
                  {matchedCount} of {matches.length} matched
                </span>
                <span className="text-white/40">
                  {Math.round((matchedCount / matches.length) * 100)}%
                </span>
              </div>
              <Progress 
                value={(matchedCount / matches.length) * 100} 
                className="h-1.5 bg-white/10"
              />
            </div>
          )}
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse text-white/40">Loading shows...</div>
            </div>
          ) : step === 'select-photos' ? (
            /* Photo Selection Step */
            <div className="space-y-6">
              {shows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Check className="h-10 w-10 text-primary mb-2" />
                  <p className="text-white/60">All your shows have photos!</p>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <p className="text-white/60 text-sm">
                      {shows.length} {shows.length === 1 ? 'show needs' : 'shows need'} a photo
                    </p>
                    <p className="text-white/40 text-xs">
                      Select photos from your camera roll — we'll auto-match by date
                    </p>
                  </div>

                  {/* Photo selection button */}
                  <div className="flex justify-center">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      size="lg"
                      className="gap-2 shadow-glow"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-5 w-5" />
                      Select Photos
                    </Button>
                  </div>

                  {/* List of shows without photos */}
                  <div className="space-y-2 mt-6">
                    <div className="flex items-center justify-between px-1">
                      <h4 className="text-xs uppercase tracking-wider text-white/40 font-medium">
                        Shows Without Photos
                      </h4>
                      {leaveNakedIds.size > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-white/20"
                          onClick={saveLeaveNakedShows}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : `Leave ${leaveNakedIds.size} Naked`}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-white/40 px-1 mb-2">
                      Check shows you'll never have a photo for
                    </p>
                    {shows.slice(0, 10).map(show => {
                      const isChecked = leaveNakedIds.has(show.id);
                      return (
                        <div
                          key={show.id}
                          className={cn(
                            "w-full p-3 rounded-lg flex items-center gap-3 transition-all",
                            isChecked 
                              ? "bg-white/[0.08] border border-white/20" 
                              : "bg-white/[0.03] border border-white/[0.08]"
                          )}
                        >
                          <button onClick={() => toggleLeaveNaked(show.id)} className="flex-shrink-0">
                            <Checkbox 
                              checked={isChecked}
                              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          </button>
                          <button 
                            onClick={() => toggleLeaveNaked(show.id)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className={cn(
                              "font-medium truncate transition-opacity",
                              isChecked ? "text-white/50 line-through" : "text-white/80"
                            )}>
                              {show.artistName}
                            </div>
                            <div className="text-sm text-white/50 truncate">
                              {show.venueName} • {format(parseISO(show.showDate), 'MMM d, yyyy')}
                            </div>
                          </button>
                          {show.artistImageUrl && !isChecked && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const { error } = await supabase
                                    .from('shows')
                                    .update({ photo_url: show.artistImageUrl })
                                    .eq('id', show.id);
                                  if (error) throw error;
                                  toast.success(`Artist photo added for ${show.artistName}`);
                                  setShows(prev => prev.filter(s => s.id !== show.id));
                                } catch (err) {
                                  console.error('Error setting artist photo:', err);
                                  toast.error('Failed to set photo');
                                }
                              }}
                              className="flex-shrink-0 h-8 w-8 rounded-full overflow-hidden ring-2 ring-primary/40 hover:ring-primary/70 transition-all"
                              title="Use artist photo"
                            >
                              <img src={show.artistImageUrl} alt="" className="h-full w-full object-cover" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {shows.length > 10 && (
                      <p className="text-xs text-white/40 text-center pt-2">
                        And {shows.length - 10} more...
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Photo Matching Step */
            <div className="space-y-4">
              {/* Active photo selection panel */}
              {activePhotoIndex !== null && (
                <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl p-4 overflow-y-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setActivePhotoIndex(null)}
                      className="h-9 w-9"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <span className="font-semibold">Select a Show</span>
                  </div>

                  {/* Photo preview */}
                  <div className="mb-4 flex justify-center">
                    <div className="w-32 h-32 rounded-lg overflow-hidden">
                      <img 
                        src={matches[activePhotoIndex].photo.previewUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {matches[activePhotoIndex].photo.extractedDate && (
                    <p className="text-center text-sm text-white/50 mb-4">
                      Photo taken: {format(matches[activePhotoIndex].photo.extractedDate, 'MMM d, yyyy')}
                    </p>
                  )}

                  {/* Show list */}
                  <div className="space-y-2">
                    {/* Leave unmatched (just for this session) */}
                    <button
                      onClick={() => assignPhotoToShow(activePhotoIndex, null)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-all",
                        "bg-white/[0.03] border border-dashed border-white/20",
                        "hover:bg-white/[0.08]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <X className="h-5 w-5 text-white/40" />
                        <span className="text-white/60">Skip this photo</span>
                      </div>
                    </button>

                    {getAvailableShows(activePhotoIndex).map(show => {
                      const isDateMatch = matches[activePhotoIndex].photo.extractedDate &&
                        isSameDay(matches[activePhotoIndex].photo.extractedDate, parseISO(show.showDate));

                      return (
                        <button
                          key={show.id}
                          onClick={() => assignPhotoToShow(activePhotoIndex, show.id)}
                          className={cn(
                            "w-full p-3 rounded-lg transition-all text-left",
                            "bg-white/[0.03] border border-white/[0.08]",
                            isDateMatch && "border-primary/50 bg-primary/10"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-white/80">{show.artistName}</div>
                              <div className="text-sm text-white/50">
                                {show.venueName} • {format(parseISO(show.showDate), 'MMM d, yyyy')}
                              </div>
                            </div>
                            {isDateMatch && (
                              <div className="flex items-center gap-1 text-xs text-primary">
                                <Sparkles className="h-3 w-3" />
                                Date match
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Photo-Show match list */}
              {matches.map((match, index) => {
                const assignedShow = shows.find(s => s.id === match.assignedShowId);
                
                return (
                  <button
                    key={index}
                    onClick={() => setActivePhotoIndex(index)}
                    className="w-full text-left"
                  >
                    <div className={cn(
                      "flex items-center gap-3 p-3 rounded-xl transition-all",
                      "bg-white/[0.03] border",
                      match.assignedShowId 
                        ? "border-primary/30" 
                        : "border-white/10 border-dashed"
                    )}>
                      {/* Photo thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 relative">
                        <img 
                          src={match.photo.previewUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {match.assignedShowId && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <Check className="h-6 w-6 text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Show info or unmatched status */}
                      <div className="flex-1 min-w-0">
                        {assignedShow ? (
                          <>
                            <div className="font-medium text-white/90 truncate">
                              {assignedShow.artistName}
                            </div>
                            <div className="text-sm text-white/50 truncate">
                              {assignedShow.venueName}
                            </div>
                            <div className="text-xs text-white/40">
                              {format(parseISO(assignedShow.showDate), 'MMM d, yyyy')}
                            </div>
                          </>
                        ) : (
                          <div className="text-white/40">
                            <span className="font-medium">Tap to match</span>
                            {match.photo.extractedDate && (
                              <div className="text-xs mt-0.5">
                                Photo: {format(match.photo.extractedDate, 'MMM d, yyyy')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-white/30 flex-shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Save button */}
        {step === 'match-photos' && matches.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-white/10">
            <Button
              className="w-full"
              size="lg"
              disabled={matchedCount === 0 || saving}
              onClick={handleSaveAll}
            >
              {saving ? 'Saving...' : `Save ${matchedCount} Photo${matchedCount !== 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MissingPhotosSheet;

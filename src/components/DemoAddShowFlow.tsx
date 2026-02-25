import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, UserPlus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import UnifiedSearchStep from "./add-show-steps/UnifiedSearchStep";
import VenueStep from "./add-show-steps/VenueStep";
import DateStep from "./add-show-steps/DateStep";
import ArtistsStep from "./add-show-steps/ArtistsStep";
import RatingStep from "./add-show-steps/RatingStep";
import { Badge } from "./ui/badge";
import { useDemoMode, DemoLocalShow } from "@/contexts/DemoContext";
import { toast } from "sonner";
import {
  staggerContainer,
  fadeUp,
  fireConfetti,
  SuccessRing,
  ActionButton,
} from "@/components/success/SuccessPrimitives";

interface DemoAddShowFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowAdded?: () => void;
}

interface ShowData {
  venue: string;
  venueLocation: string;
  venueId: string | null;
  venueLatitude?: number;
  venueLongitude?: number;
  showType: 'set' | 'show' | 'festival';
  eventName: string;
  date: Date | undefined;
  datePrecision: "exact" | "approximate" | "unknown";
  selectedMonth: string;
  selectedYear: string;
  artists: Array<{ name: string; isHeadliner: boolean }>;
  rating?: number | null;
  locationFilter: string;
  tags: string[];
  notes: string;
}

type EntryPoint = 'artist' | 'venue' | null;

const DemoAddShowFlow = ({ open, onOpenChange, onShowAdded }: DemoAddShowFlowProps) => {
  const navigate = useNavigate();
  const { addDemoShow, getDemoShowCount } = useDemoMode();
  
  const [step, setStep] = useState(1);
  const [entryPoint, setEntryPoint] = useState<EntryPoint>(null);
  const [showData, setShowData] = useState<ShowData>({
    venue: "",
    venueLocation: "",
    venueId: null,
    showType: 'set',
    eventName: "",
    date: undefined,
    datePrecision: "exact",
    selectedMonth: "",
    selectedYear: "",
    artists: [],
    rating: null,
    locationFilter: "",
    tags: [],
    notes: "",
  });

  const resetFlow = () => {
    setStep(1);
    setEntryPoint(null);
    setShowData({
      venue: "",
      venueLocation: "",
      venueId: null,
      showType: 'set',
      eventName: "",
      date: undefined,
      datePrecision: "exact",
      selectedMonth: "",
      selectedYear: "",
      artists: [],
      rating: null,
      locationFilter: "",
      tags: [],
      notes: "",
    });
  };

  const handleClose = () => {
    resetFlow();
    onOpenChange(false);
  };

  // Step 1: Unified search result selected
  const handleSearchResultSelected = (result: { type: 'artist' | 'venue'; id: string; name: string; location?: string }) => {
    if (result.type === 'artist') {
      setEntryPoint('artist');
      setShowData(prev => ({
        ...prev,
        artists: [{ name: result.name, isHeadliner: true }],
      }));
      setStep(2);
    } else {
      setEntryPoint('venue');
      setShowData(prev => ({
        ...prev,
        venue: result.name,
        venueLocation: result.location || "",
        venueId: result.id || null,
      }));
      setStep(3);
    }
  };

  // Step 2: Venue selected (artist-first flow)
  const handleVenueSelect = (venue: string, location: string, venueId: string | null, latitude?: number, longitude?: number) => {
    setShowData(prev => ({
      ...prev,
      venue,
      venueLocation: location,
      venueId: venueId || null,
      venueLatitude: latitude,
      venueLongitude: longitude,
    }));
    setStep(3);
  };

  // Save show to demo context
  const saveShow = () => {
    const currentCount = getDemoShowCount();
    if (currentCount >= 5) {
      toast.error("Demo limit reached! Sign up to add unlimited shows.");
      return;
    }

    let showDate: string;
    if (showData.datePrecision === "exact" && showData.date) {
      showDate = showData.date.toISOString().split('T')[0];
    } else if (showData.datePrecision === "approximate" && showData.selectedYear) {
      const monthIndex = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(showData.selectedMonth);
      const month = monthIndex >= 0 ? String(monthIndex + 1).padStart(2, '0') : "01";
      showDate = `${showData.selectedYear}-${month}-01`;
    } else if (showData.selectedYear) {
      showDate = `${showData.selectedYear}-01-01`;
    } else {
      showDate = new Date().toISOString().split('T')[0];
    }

    const demoShow: DemoLocalShow = {
      id: `demo-${crypto.randomUUID()}`,
      artists: showData.artists,
      venue: {
        name: showData.venue || 'Unknown Venue',
        location: showData.venueLocation || '',
      },
      date: showDate,
      rating: showData.rating ?? 3,
      datePrecision: showData.datePrecision,
      tags: showData.tags,
      notes: showData.notes,
      venueId: showData.venueId,
      photo_url: null,
      isLocalDemo: true,
    };

    addDemoShow(demoShow);
    toast.success("Show added to your demo collection!");
    fireConfetti();
    setStep(6);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setEntryPoint(null);
    } else if (step === 3) {
      setStep(entryPoint === 'artist' ? 2 : 1);
    } else if (step === 4) {
      setStep(3);
    } else if (step === 5) {
      setStep(entryPoint === 'venue' ? 4 : 3);
    }
  };

  const handleSignUp = () => {
    handleClose();
    navigate('/auth');
  };

  const getTitle = () => {
    switch (step) {
      case 1: return "Add a Show";
      case 2: return showData.artists[0]?.name ? `Where'd you see ${showData.artists[0].name}?` : "Select Venue";
      case 3: return "When was the show?";
      case 4: return "Who'd you see?";
      case 5: return "What stood out?";
      case 6: return "Success!";
      default: return "Add a Show";
    }
  };

  const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  const renderSuccessStep = () => (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-6 py-4 relative">
      <motion.div variants={fadeUp} className="space-y-3">
        <SuccessRing />
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight" style={{ textShadow: "0 0 24px hsl(189 94% 55% / 0.25)" }}>
            Show Added!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {showData.artists.map(a => a.name).join(', ')} @ {showData.venue}
          </p>
        </motion.div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
          Demo Mode - Not Saved
        </Badge>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-2.5 pt-1">
        <ActionButton onClick={handleSignUp} icon={UserPlus} label="Sign Up to Save Your Shows" variant="primary" />
        <p className="text-xs text-muted-foreground">
          Shows in demo mode won't be saved after you leave
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="flex gap-2 pt-2">
        <button onClick={() => resetFlow()} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]">
          <Plus className="h-3.5 w-3.5" />
          Add Another
        </button>
        <button onClick={handleClose} className="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]">
          Done
        </button>
      </motion.div>
    </motion.div>
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) handleClose();
      else onOpenChange(true);
    }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto pb-8 top-1/4 translate-y-0">
        <div className="relative">
          {/* Mesh gradient background */}
          <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
            <div className="absolute inset-0 animate-pulse-glow" style={{ background: "radial-gradient(ellipse at 20% 10%, hsl(189 94% 55% / 0.06) 0%, transparent 50%)" }} />
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 90%, hsl(17 88% 60% / 0.06) 0%, transparent 50%)" }} />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: noiseTexture }} />
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              {step > 1 && step < 6 && (
                <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-lg font-semibold flex-1">{getTitle()}</h1>
              <Badge variant="outline" className="text-xs">Demo</Badge>
            </div>

            {/* Step content */}
            {step === 1 && <UnifiedSearchStep onSelect={handleSearchResultSelected} />}

            {step === 2 && (
              <VenueStep
                value={showData.venue}
                location={showData.venueLocation}
                locationFilter={showData.locationFilter}
                showType={showData.showType}
                onSelect={handleVenueSelect}
                onLocationFilterChange={(filter) => setShowData(prev => ({ ...prev, locationFilter: filter }))}
                onShowTypeChange={(type) => setShowData(prev => ({ ...prev, showType: type }))}
                selectedArtistName={showData.artists[0]?.name}
              />
            )}

            {step === 3 && (
              <DateStep
                date={showData.date}
                datePrecision={showData.datePrecision}
                selectedMonth={showData.selectedMonth}
                selectedYear={showData.selectedYear}
                onDateChange={(date) => setShowData(prev => ({ ...prev, date }))}
                onPrecisionChange={(precision) => setShowData(prev => ({ ...prev, datePrecision: precision as ShowData['datePrecision'] }))}
                onMonthChange={(month) => setShowData(prev => ({ ...prev, selectedMonth: month }))}
                onYearChange={(year) => setShowData(prev => ({ ...prev, selectedYear: year }))}
                onContinue={() => {
                  if (entryPoint === 'venue') {
                    setStep(4);
                  } else {
                    setStep(5);
                  }
                }}
              />
            )}

            {step === 4 && (
              <ArtistsStep
                artists={showData.artists}
                onArtistsChange={(artists) => setShowData(prev => ({ ...prev, artists }))}
                onContinue={() => setStep(5)}
              />
            )}

            {step === 5 && (
              <RatingStep
                tags={showData.tags}
                onTagsChange={(tags) => setShowData(prev => ({ ...prev, tags }))}
                notes={showData.notes}
                onNotesChange={(notes) => setShowData(prev => ({ ...prev, notes }))}
                onSubmit={saveShow}
              />
            )}

            {step === 6 && renderSuccessStep()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DemoAddShowFlow;

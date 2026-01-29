import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WaitlistFollowUpProps {
  waitlistId: string;
  onComplete: () => void;
}

const DISCOVERY_OPTIONS = [
  { value: "invited", label: "I was invited" },
  { value: "social", label: "Instagram/TikTok" },
  { value: "friend", label: "Friend told me" },
  { value: "other", label: "Other" },
];

const FREQUENCY_OPTIONS = [
  { value: "1-3", label: "1-3" },
  { value: "4-10", label: "4-10" },
  { value: "11-20", label: "11-20" },
  { value: "20+", label: "20+" },
];

const WaitlistFollowUp = ({ waitlistId, onComplete }: WaitlistFollowUpProps) => {
  const [discoverySource, setDiscoverySource] = useState<string | null>(null);
  const [showsPerYear, setShowsPerYear] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSelection = discoverySource || showsPerYear;

  const handleSubmit = async () => {
    if (!hasSelection) {
      onComplete();
      return;
    }

    setIsSubmitting(true);

    try {
      await supabase
        .from("waitlist")
        .update({
          discovery_source: discoverySource,
          shows_per_year: showsPerYear,
        })
        .eq("id", waitlistId);
    } catch (error) {
      console.error("Error updating waitlist:", error);
    }

    onComplete();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Question 1: Discovery Source */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          How did you hear about us? <span className="opacity-60">(optional)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {DISCOVERY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDiscoverySource(
                discoverySource === option.value ? null : option.value
              )}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                "border backdrop-blur-sm",
                discoverySource === option.value
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/5 border-white/10 text-foreground hover:bg-white/10"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Question 2: Show Frequency */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          How many shows do you go to per year?
        </p>
        <div className="flex flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setShowsPerYear(
                showsPerYear === option.value ? null : option.value
              )}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                "border backdrop-blur-sm",
                showsPerYear === option.value
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-white/5 border-white/10 text-foreground hover:bg-white/10"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="ghost"
          onClick={onComplete}
          className="text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
        {hasSelection && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="shadow-glow"
          >
            Done →
          </Button>
        )}
      </div>
    </div>
  );
};

export default WaitlistFollowUp;

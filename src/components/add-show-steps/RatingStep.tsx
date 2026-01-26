import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface RatingStepProps {
  rating: number | null;
  onRatingChange: (rating: number) => void;
  artistPerformance: number | null;
  sound: number | null;
  lighting: number | null;
  crowd: number | null;
  venueVibe: number | null;
  notes: string;
  onDetailChange: (field: string, value: number | string) => void;
  onSubmit: () => void;
}

const ratingLabels = ["Terrible", "Bad", "Okay", "Great", "Amazing"];

// Large tappable button for overall rating
const RatingButton = ({ 
  value, 
  selected, 
  onClick 
}: { 
  value: number; 
  selected: boolean; 
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200",
      "border-2 min-w-[60px]",
      selected 
        ? "border-primary bg-primary/10 scale-105" 
        : "border-border bg-card hover:border-muted-foreground/50 hover:bg-muted/50"
    )}
  >
    <span className={cn(
      "text-xl font-bold transition-colors",
      selected ? "text-primary" : "text-foreground"
    )}>
      {value}
    </span>
    <span className={cn(
      "text-[10px] mt-1 transition-colors",
      selected ? "text-primary" : "text-muted-foreground"
    )}>
      {ratingLabels[value - 1]}
    </span>
  </button>
);

// Compact pill buttons for detail ratings
const DetailRatingPills = ({ 
  value, 
  onChange,
  label 
}: { 
  value: number | null; 
  onChange: (val: number) => void;
  label: string;
}) => (
  <div className="space-y-2">
    <Label className="text-sm text-muted-foreground">{label}</Label>
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={cn(
            "w-10 h-8 rounded-full text-sm font-medium transition-all duration-150",
            value === num
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {num}
        </button>
      ))}
    </div>
  </div>
);

const RatingStep = ({
  rating, 
  onRatingChange, 
  artistPerformance,
  sound,
  lighting,
  crowd,
  venueVibe,
  notes,
  onDetailChange,
  onSubmit 
}: RatingStepProps) => {
  return (
    <div className="space-y-8">
      {/* Overall Rating - Large tappable buttons */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">What'd ya think?</Label>
        <div className="flex justify-between gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <RatingButton
              key={value}
              value={value}
              selected={rating === value}
              onClick={() => onRatingChange(value)}
            />
          ))}
        </div>
      </div>

      {/* More to Say section */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="details" className="border-border">
          <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground">
            More to Say
          </AccordionTrigger>
          <AccordionContent className="space-y-5 pt-4">
            <DetailRatingPills
              label="Artist Performance"
              value={artistPerformance}
              onChange={(val) => onDetailChange("artistPerformance", val)}
            />
            <DetailRatingPills
              label="Sound"
              value={sound}
              onChange={(val) => onDetailChange("sound", val)}
            />
            <DetailRatingPills
              label="Lighting"
              value={lighting}
              onChange={(val) => onDetailChange("lighting", val)}
            />
            <DetailRatingPills
              label="Crowd"
              value={crowd}
              onChange={(val) => onDetailChange("crowd", val)}
            />
            <DetailRatingPills
              label="Venue Vibe"
              value={venueVibe}
              onChange={(val) => onDetailChange("venueVibe", val)}
            />

            {/* My Take */}
            <div className="space-y-2 pt-2">
              <Label className="text-sm text-muted-foreground">My Take</Label>
              <Textarea
                placeholder="Add your thoughts..."
                value={notes}
                onChange={(e) => onDetailChange("notes", e.target.value)}
                maxLength={500}
                className="min-h-[80px] resize-none bg-muted/30 border-border"
              />
              <p className="text-xs text-muted-foreground text-right">
                {notes.length}/500
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Submit button */}
      <Button
        onClick={onSubmit}
        disabled={rating === null}
        className="w-full h-12 text-base"
      >
        Add Show
      </Button>
    </div>
  );
};

export default RatingStep;

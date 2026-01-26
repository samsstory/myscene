import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  isEditMode?: boolean;
}

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
  onSubmit,
  isEditMode = false
}: RatingStepProps) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          {isEditMode ? "Edit Details" : "Add Details (Optional)"}
        </Label>
        <p className="text-sm text-muted-foreground">
          Rate specific aspects of the show for your own reference.
        </p>
      </div>

      {/* Detail ratings - always shown */}
      <div className="space-y-5">
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
      </div>

      {/* Submit button */}
      <Button
        onClick={onSubmit}
        className="w-full h-12 text-base"
      >
        {isEditMode ? "Save Changes" : "Done"}
      </Button>
    </div>
  );
};

export default RatingStep;

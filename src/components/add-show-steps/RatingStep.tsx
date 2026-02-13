import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TAG_CATEGORIES } from "@/lib/tag-constants";

interface RatingStepProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  onSkip?: () => void;
  isEditMode?: boolean;
  // Legacy props kept for backward compat (ignored)
  rating?: number | null;
  onRatingChange?: (rating: number) => void;
  artistPerformance?: number | null;
  sound?: number | null;
  lighting?: number | null;
  crowd?: number | null;
  venueVibe?: number | null;
  onDetailChange?: (field: string, value: number | string) => void;
}

const RatingStep = ({
  tags,
  onTagsChange,
  notes,
  onNotesChange,
  onSubmit,
  onSkip,
  isEditMode = false,
}: RatingStepProps) => {
  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      onTagsChange(tags.filter(t => t !== tag));
    } else {
      onTagsChange([...tags, tag]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          {isEditMode ? "Edit Moments" : "What stood out?"}
        </Label>
        <p className="text-sm text-muted-foreground">
          Tag the moments that made this show memorable.
        </p>
      </div>

      {/* Tag categories */}
      <div className="space-y-5">
        {TAG_CATEGORIES.map((category) => (
          <div key={category.id} className="space-y-2.5">
            <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">
              {category.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {category.tags.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                      "border backdrop-blur-sm",
                      isSelected
                        ? "bg-primary/20 border-primary/50 text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                        : "bg-white/[0.04] border-white/[0.1] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
                    )}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* My Take */}
        <div className="space-y-2 pt-2">
          <Label className="text-sm text-muted-foreground">My Take (optional)</Label>
          <Textarea
            placeholder="Add your thoughts..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            maxLength={500}
            className="min-h-[80px] resize-none bg-muted/30 border-border"
          />
          <p className="text-xs text-muted-foreground text-right">
            {notes.length}/500
          </p>
        </div>
      </div>

      {/* Submit buttons */}
      <div className="space-y-2">
        <Button
          onClick={onSubmit}
          className="w-full h-12 text-base"
        >
          {isEditMode ? "Save Changes" : "Save Show"}
        </Button>
        {!isEditMode && onSkip && (
          <Button
            onClick={onSkip}
            variant="ghost"
            className="w-full h-10 text-base text-muted-foreground"
          >
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
};

export default RatingStep;

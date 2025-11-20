import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

const ratingEmojis = [
  { value: 1, emoji: "😞", label: "Terrible" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Great" },
  { value: 5, emoji: "🤩", label: "Amazing" },
];

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
  const getRatingLabel = (value: number) => {
    const labels = ["Terrible", "Bad", "Okay", "Great", "Amazing"];
    return labels[value - 1];
  };
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">What'd ya think?</Label>
      </div>

      {/* Rating buttons */}
      <div className="grid grid-cols-5 gap-2">
        {ratingEmojis.map((item) => (
          <button
            key={item.value}
            onClick={() => onRatingChange(item.value)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
              ${
                rating === item.value
                  ? "border-primary bg-primary/10 scale-105"
                  : "border-border hover:border-primary/50 hover:bg-accent"
              }
            `}
          >
            <span className="text-4xl">{item.emoji}</span>
            <span className="text-xs font-medium text-center">{item.label}</span>
          </button>
        ))}
      </div>

      {/* More to Say section */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="details" className="border-border">
          <AccordionTrigger className="text-sm font-medium">
            More to Say
          </AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            {/* Artist Performance */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Artist Performance</Label>
                <span className="text-xs text-muted-foreground">
                  {artistPerformance ? getRatingLabel(artistPerformance) : "Not rated"}
                </span>
              </div>
              <Slider
                value={[artistPerformance || 3]}
                onValueChange={(value) => onDetailChange("artistPerformance", value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            {/* Sound */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Sound</Label>
                <span className="text-xs text-muted-foreground">
                  {sound ? getRatingLabel(sound) : "Not rated"}
                </span>
              </div>
              <Slider
                value={[sound || 3]}
                onValueChange={(value) => onDetailChange("sound", value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            {/* Lighting */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Lighting</Label>
                <span className="text-xs text-muted-foreground">
                  {lighting ? getRatingLabel(lighting) : "Not rated"}
                </span>
              </div>
              <Slider
                value={[lighting || 3]}
                onValueChange={(value) => onDetailChange("lighting", value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            {/* Crowd */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Crowd</Label>
                <span className="text-xs text-muted-foreground">
                  {crowd ? getRatingLabel(crowd) : "Not rated"}
                </span>
              </div>
              <Slider
                value={[crowd || 3]}
                onValueChange={(value) => onDetailChange("crowd", value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            {/* Venue Vibe */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm">Venue Vibe</Label>
                <span className="text-xs text-muted-foreground">
                  {venueVibe ? getRatingLabel(venueVibe) : "Not rated"}
                </span>
              </div>
              <Slider
                value={[venueVibe || 3]}
                onValueChange={(value) => onDetailChange("venueVibe", value[0])}
                min={1}
                max={5}
                step={1}
                className="w-full"
              />
            </div>

            {/* My Take */}
            <div className="space-y-3">
              <Label className="text-sm">My Take</Label>
              <Textarea
                placeholder="Add your thoughts..."
                value={notes}
                onChange={(e) => onDetailChange("notes", e.target.value)}
                maxLength={500}
                className="min-h-[100px] resize-none"
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
        Add Show 🎉
      </Button>
    </div>
  );
};

export default RatingStep;

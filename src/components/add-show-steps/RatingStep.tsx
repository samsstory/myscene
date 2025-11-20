import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface RatingStepProps {
  rating: number | null;
  onRatingChange: (rating: number) => void;
  onSubmit: () => void;
}

const ratingEmojis = [
  { value: 1, emoji: "😞", label: "Terrible" },
  { value: 2, emoji: "😕", label: "Bad" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Great" },
  { value: 5, emoji: "🤩", label: "Amazing" },
];

const RatingStep = ({ rating, onRatingChange, onSubmit }: RatingStepProps) => {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">How was it?</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Rate your experience
        </p>
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

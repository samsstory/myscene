import { CheckCircle2, PartyPopper, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkSuccessStepProps {
  addedCount: number;
  onAddMore: () => void;
  onDone: () => void;
}

const BulkSuccessStep = ({ addedCount, onAddMore, onDone }: BulkSuccessStepProps) => {
  return (
    <div className="text-center space-y-6 py-8">
      {/* Success icon */}
      <div className="relative inline-block">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <PartyPopper className="absolute -top-2 -right-2 h-8 w-8 text-yellow-500 animate-bounce" />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          {addedCount} show{addedCount !== 1 ? 's' : ''} added!
        </h2>
        <p className="text-muted-foreground">
          Your concert memories have been saved to your collection.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-4">
        <Button onClick={onAddMore} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add More Shows
        </Button>
        <Button onClick={onDone} className="w-full">
          Done
        </Button>
      </div>
    </div>
  );
};

export default BulkSuccessStep;

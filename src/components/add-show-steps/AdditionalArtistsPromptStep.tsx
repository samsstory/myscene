import { Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdditionalArtistsPromptStepProps {
  onAddArtists: () => void;
  onSkip: () => void;
}

const AdditionalArtistsPromptStep = ({ onAddArtists, onSkip }: AdditionalArtistsPromptStepProps) => {
  return (
    <div className="space-y-6 w-full">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold tracking-tight">
          Did you see any other artists at this event?
        </h3>
        <p className="text-sm text-muted-foreground">
          Support acts, surprise guests, co-headliners — anyone else on the bill.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={onAddArtists}
          className={cn(
            "w-full h-12 text-base font-semibold",
            "bg-primary/20 text-primary border border-primary/40",
            "hover:bg-primary/30 hover:border-primary/60"
          )}
          variant="outline"
        >
          Yes, add more artists
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <Button
          onClick={onSkip}
          variant="ghost"
          className="w-full h-12 text-base text-muted-foreground hover:text-foreground"
        >
          No, just the one
        </Button>
      </div>
    </div>
  );
};

export default AdditionalArtistsPromptStep;

import { useState } from "react";
import { Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventNamePromptStepProps {
  onContinue: (eventName: string) => void;
  onSkip: () => void;
}

const EventNamePromptStep = ({ onContinue, onSkip }: EventNamePromptStepProps) => {
  const [eventName, setEventName] = useState("");

  return (
    <div className="space-y-6 w-full">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Ticket className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-lg font-bold tracking-tight">
          Did this event have a special name?
        </h3>
        <p className="text-sm text-muted-foreground">
          e.g. Elrow, Mayan Warrior, Circoloco, Printworks Closing
        </p>
      </div>

      <Input
        placeholder="Event name (optional)"
        value={eventName}
        onChange={(e) => setEventName(e.target.value)}
        className={cn(
          "h-12 text-base",
          "bg-white/[0.03] border-white/[0.1] transition-all duration-200",
          "focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
          "focus:shadow-[0_0_16px_hsl(189_94%_55%/0.2)]"
        )}
        autoFocus
      />

      <div className="space-y-3">
        <Button
          onClick={() => onContinue(eventName.trim())}
          disabled={!eventName.trim()}
          className="w-full h-12 text-base"
        >
          Continue
        </Button>

        <Button
          onClick={onSkip}
          variant="ghost"
          className="w-full h-12 text-base text-muted-foreground hover:text-foreground"
        >
          Skip
        </Button>
      </div>
    </div>
  );
};

export default EventNamePromptStep;

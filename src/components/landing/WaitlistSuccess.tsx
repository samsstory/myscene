import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import confetti from "canvas-confetti";
import WaitlistFollowUp from "./WaitlistFollowUp";

interface WaitlistSuccessProps {
  waitlistId: string;
}

const WaitlistSuccess = ({ waitlistId }: WaitlistSuccessProps) => {
  const [showQuestions, setShowQuestions] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    // Fire confetti on mount
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3"],
    });

    // Show follow-up questions after delay
    const timer = setTimeout(() => {
      setShowQuestions(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (isDone) {
    return (
      <div className="flex items-center gap-3 animate-in fade-in duration-300">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Check className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">Thanks! See you soon 🎸</p>
          <p className="text-sm text-muted-foreground">We'll text you when Scene launches.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="flex items-center gap-3 animate-in zoom-in-50 duration-300">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center animate-in zoom-in duration-500">
          <Check className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-foreground">You're in!</p>
          <p className="text-sm text-muted-foreground">We'll text you when Scene launches.</p>
        </div>
      </div>

      {/* Follow-up Questions */}
      {showQuestions && (
        <WaitlistFollowUp
          waitlistId={waitlistId}
          onComplete={() => setIsDone(true)}
        />
      )}
    </div>
  );
};

export default WaitlistSuccess;

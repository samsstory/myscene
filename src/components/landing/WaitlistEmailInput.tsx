import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WaitlistEmailInputProps {
  source: string;
  onSuccess: (waitlistId: string) => void;
}

const WaitlistEmailInput = ({ source, onSuccess }: WaitlistEmailInputProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      const waitlistId = crypto.randomUUID();
      const { error: insertError } = await supabase
        .from("waitlist")
        .insert(
          { id: waitlistId, email: trimmed, phone_number: "", source } as any,
          { returning: "minimal" } as any,
        );

      if (insertError) {
        if (insertError.code === "23505") {
          setError("You're already on the list! 🎉");
        } else {
          setError("Something went wrong. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }
      onSuccess(waitlistId);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="sm:flex-row items-center justify-center flex flex-col gap-[8px]">
        <div className="flex-[1.5] min-w-[200px]">
          <Input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="your@email.com"
            className="rounded-lg border border-white/10 bg-white/[0.03] backdrop-blur-sm py-2.5 text-base focus-visible:ring-2 focus-visible:ring-primary/50"
            disabled={isSubmitting}
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || !email.trim()}
          className="shadow-glow py-5 hover:scale-105 transition-transform whitespace-nowrap px-6"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Get Early Access"}
        </Button>
      </div>
      {error && (
        <p className={`mt-2 text-sm ${error.includes("already") ? "text-primary" : "text-destructive"}`}>
          {error}
        </p>
      )}
    </form>
  );
};

export default WaitlistEmailInput;

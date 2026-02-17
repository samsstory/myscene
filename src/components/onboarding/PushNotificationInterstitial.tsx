import { useState } from "react";
import { Bell, BellOff, Sparkles } from "lucide-react";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PushNotificationInterstitialProps {
  onComplete: () => void;
}

type Phase = "prompt" | "loading" | "denied" | "done";

const PushNotificationInterstitial = ({ onComplete }: PushNotificationInterstitialProps) => {
  const { subscribe } = usePushSubscription();
  const [phase, setPhase] = useState<Phase>("prompt");

  const markDone = async () => {
    localStorage.setItem("scene-push-prompt-seen", "true");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ onboarding_step: "push_done" })
          .eq("id", user.id);
      }
    } catch {
      // non-blocking
    }
  };

  const handleEnable = async () => {
    setPhase("loading");
    try {
      // Request browser permission first
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await subscribe();
        await markDone();
        setPhase("done");
        // Small delay so the success state is visible before closing
        setTimeout(onComplete, 1200);
      } else {
        // Denied or dismissed
        await markDone();
        setPhase("denied");
      }
    } catch {
      await markDone();
      setPhase("denied");
    }
  };

  const handleSkip = async () => {
    await markDone();
    onComplete();
  };

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-semibold">You're in. 🎉</p>
          <p className="text-sm text-muted-foreground">We'll keep it rare and useful.</p>
        </div>
      </div>
    );
  }

  if (phase === "denied") {
    return (
      <div className="flex flex-col items-center gap-5 py-6 text-center">
        <div className="h-16 w-16 rounded-full bg-white/[0.06] border border-white/[0.10] flex items-center justify-center">
          <BellOff className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-semibold text-foreground">No worries at all.</p>
          <p className="text-sm text-muted-foreground">
            You can always enable notifications later in your Profile settings whenever you're ready.
          </p>
        </div>
        <button
          onClick={onComplete}
          className="w-full py-3 px-4 rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.10] text-sm font-medium text-foreground transition-all hover:bg-white/[0.10] hover:border-white/[0.18] active:scale-[0.98]"
        >
          Continue to my shows →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bell className="h-10 w-10 text-primary" />
          </div>
          <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-3 text-center">
        <h2 className="text-xl font-bold tracking-tight">A small ask from us 🙏</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          As one of our first users, we're requesting that you allow push notifications. 
          Don't worry — we won't bug you. The goal is to learn how we can help you keep 
          track of your favorite shows.
        </p>
        <p className="text-xs text-muted-foreground/70 italic">
          You can turn this off any time.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2.5">
        <button
          onClick={handleEnable}
          disabled={phase === "loading"}
          className={cn(
            "w-full py-3.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]",
            "bg-primary/[0.12] border border-primary/[0.30] text-primary/90",
            "hover:bg-primary/[0.18] hover:border-primary/[0.45] hover:shadow-[0_0_20px_hsl(var(--primary)/0.20)]",
            "disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {phase === "loading" ? "Enabling…" : "Enable Notifications"}
        </button>

        <button
          onClick={handleSkip}
          disabled={phase === "loading"}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-white/[0.04] disabled:opacity-50"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
};

export default PushNotificationInterstitial;

import { User, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const FriendTeaser = () => {
  const handleTap = () => {
    toast({
      title: "Friend features dropping soon ✦",
      description: "You'll be able to see who else was at your shows.",
    });
  };

  return (
    <button
      onClick={handleTap}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition-all active:scale-[0.98] hover:bg-white/[0.06]"
    >
      {/* Overlapping avatar placeholders */}
      <div className="flex -space-x-2.5 shrink-0">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full bg-white/10 border border-white/[0.12] flex items-center justify-center"
          >
            <User className="w-3.5 h-3.5 text-white/30" />
          </div>
        ))}
      </div>

      {/* Text */}
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-white/90">See who else was there</p>
        <p className="text-xs text-primary/70 mt-0.5" style={{ textShadow: "0 0 12px hsl(189 94% 55% / 0.4)" }}>
          Coming soon
        </p>
      </div>

      <Sparkles className="w-4 h-4 text-primary/50 shrink-0" />
    </button>
  );
};

export default FriendTeaser;

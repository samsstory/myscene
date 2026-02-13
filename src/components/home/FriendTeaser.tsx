import { toast } from "@/hooks/use-toast";

const avatars = ["/images/waitlist-1.png", "/images/waitlist-2.png", "/images/waitlist-3.png"];

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
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] transition-all active:scale-[0.98]"
    >
      <div className="flex -space-x-2 shrink-0">
        {avatars.map((src, i) => (
          <div
            key={i}
            className="w-6 h-6 rounded-full border border-white/[0.1] bg-cover bg-center"
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}
      </div>

      <div className="flex-1 text-left">
        <p className="text-xs text-white/40">See who else was there</p>
        <p className="text-[10px] text-white/20 mt-0.5">Coming soon...</p>
      </div>

      
    </button>
  );
};

export default FriendTeaser;

import { useFollowers } from "@/hooks/useFollowers";

const FriendTeaser = () => {
  const { following, isLoading } = useFollowers();

  if (isLoading) return null;

  const count = following.length;

  return (
    <div className="flex items-center justify-center gap-2 py-2 opacity-40">
      {count > 0 ? (
        <>
          <div className="flex -space-x-1.5">
            {following.slice(0, 3).map((friend) => (
              friend.avatar_url ? (
                <img
                  key={friend.id}
                  src={friend.avatar_url}
                  alt={friend.username ?? "Friend"}
                  className="w-4 h-4 rounded-full border border-white/[0.1] object-cover"
                />
              ) : (
                <div
                  key={friend.id}
                  className="w-4 h-4 rounded-full border border-white/[0.1] bg-primary/50 flex items-center justify-center"
                >
                  <span className="text-[6px] font-bold text-primary-foreground leading-none">
                    {(friend.username ?? friend.full_name ?? "?")[0].toUpperCase()}
                  </span>
                </div>
              )
            ))}
          </div>
          <span className="text-[10px] text-white/40">
            {count === 1 ? "Following 1 friend" : `Following ${count} friends`}
          </span>
        </>
      ) : (
        <>
          <div className="flex -space-x-1.5">
            {["/images/waitlist-1.png", "/images/waitlist-2.png", "/images/waitlist-3.png"].map((src, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-white/[0.1] bg-cover bg-center"
                style={{ backgroundImage: `url('${src}')` }}
              />
            ))}
          </div>
          <span className="text-[10px] text-white/40">Find friends on Scene</span>
        </>
      )}
    </div>
  );
};

export default FriendTeaser;

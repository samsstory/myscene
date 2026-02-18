import { useFollowers } from "@/hooks/useFollowers";

const FriendTeaser = () => {
  const { followers, isLoading } = useFollowers();

  if (isLoading) return null;

  const count = followers.length;

  return (
    <div className="flex items-center justify-center gap-2 py-2 opacity-40">
      {count > 0 ? (
        <>
          <div className="flex -space-x-1.5">
            {followers.slice(0, 3).map((follower, i) => (
              follower.avatar_url ? (
                <img
                  key={follower.id}
                  src={follower.avatar_url}
                  alt={follower.username ?? "Friend"}
                  className="w-4 h-4 rounded-full border border-white/[0.1] object-cover"
                />
              ) : (
                <div
                  key={follower.id}
                  className="w-4 h-4 rounded-full border border-white/[0.1] bg-primary/50 flex items-center justify-center"
                >
                  <span className="text-[6px] font-bold text-primary-foreground leading-none">
                    {(follower.username ?? follower.full_name ?? "?")[0].toUpperCase()}
                  </span>
                </div>
              )
            ))}
          </div>
          <span className="text-[10px] text-white/40">
            {count === 1 ? "1 friend following you" : `${count} friends following you`}
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

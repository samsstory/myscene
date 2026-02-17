const FriendTeaser = () => {
  return (
    <div className="flex items-center justify-center gap-2 py-2 opacity-30">
      <div className="flex -space-x-1.5">
        {["/images/waitlist-1.png", "/images/waitlist-2.png", "/images/waitlist-3.png"].map((src, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded-full border border-white/[0.1] bg-cover bg-center"
            style={{ backgroundImage: `url('${src}')` }}
          />
        ))}
      </div>
      <span className="text-[10px] text-white/40">Friends coming soon</span>
    </div>
  );
};

export default FriendTeaser;

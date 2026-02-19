import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Calendar, Star, Users, Zap, Music2, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FriendActivityItem } from "@/hooks/useFriendActivity";

interface FriendActivityFeedProps {
  items: FriendActivityItem[];
  isLoading: boolean;
  hasFollowing: boolean;
  onFindFriends?: () => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < rating ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10"
          )}
        />
      ))}
    </span>
  );
}

function SignalBadge({ signal }: { signal: FriendActivityItem["signal"] }) {
  if (signal === "shared") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-primary uppercase tracking-wider">
        <Zap className="h-3 w-3" />
        You're both going
      </span>
    );
  }
  if (signal === "multi-friend") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
        <Users className="h-3 w-3" />
        Multiple friends
      </span>
    );
  }
  if (signal === "high-rating") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
        <Star className="h-3 w-3" />
        Highly rated
      </span>
    );
  }
  return null;
}

function ActivityCard({ item }: { item: FriendActivityItem }) {
  const friendName = item.friend.full_name || item.friend.username || "Someone";
  const friendInitial = friendName.charAt(0).toUpperCase();
  const dateStr = item.showDate
    ? format(parseISO(item.showDate), "MMM d")
    : null;

  const isShared = item.signal === "shared";
  const isHighSignal = item.signal === "shared" || item.signal === "multi-friend";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border px-4 py-3.5 flex items-start gap-3 overflow-hidden",
        isShared
          ? "bg-primary/[0.08] border-primary/25"
          : isHighSignal
          ? "bg-violet-500/[0.06] border-violet-500/20"
          : "bg-white/[0.04] border-white/[0.08]"
      )}
    >
      {/* Glow accent for shared */}
      {isShared && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      )}

      {/* Friend avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarImage src={item.friend.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs bg-white/10 text-white/70">
            {friendInitial}
          </AvatarFallback>
        </Avatar>
        {/* Type indicator dot */}
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-[hsl(var(--background))] flex items-center justify-center",
            item.type === "upcoming" ? "bg-primary/80" : "bg-emerald-500/80"
          )}
        >
          {item.type === "upcoming" ? (
            <Calendar className="h-2.5 w-2.5 text-white" />
          ) : (
            <Star className="h-2.5 w-2.5 text-white" />
          )}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Signal badge */}
        <SignalBadge signal={item.signal} />

        {/* Main line */}
        <p className="text-sm font-semibold text-white/90 mt-0.5 truncate">
          {item.artistName}
        </p>

        {/* Sub line */}
        <p className="text-xs text-white/50 truncate mt-0.5">
          {item.venueName && `${item.venueName}`}
          {item.venueLocation && item.venueName && ` · `}
          {item.venueLocation}
          {dateStr && ` · ${dateStr}`}
        </p>

        {/* Friend attribution + rating */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-white/40">
            {item.type === "upcoming"
              ? `${friendName} is going`
              : `${friendName} logged this`}
          </span>
          {item.type === "logged" && item.rating && (
            <StarRating rating={item.rating} />
          )}
        </div>

        {/* Shared friends avatars */}
        {item.sharedFriends && item.sharedFriends.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex -space-x-1.5">
              {item.sharedFriends.slice(0, 3).map(f => (
                <Avatar key={f.id} className="h-5 w-5 border border-[hsl(var(--background))]">
                  <AvatarImage src={f.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px] bg-white/10">
                    {(f.full_name || f.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {item.sharedFriends.length > 0 && (
              <span className="text-[11px] text-white/35">
                +{item.sharedFriends.length} also going
              </span>
            )}
          </div>
        )}
      </div>

      {/* Artist image thumbnail */}
      {(item.artistImageUrl || item.photoUrl) && (
        <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white/10">
          <img
            src={item.photoUrl || item.artistImageUrl || ""}
            alt={item.artistName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </motion.div>
  );
}

export default function FriendActivityFeed({
  items,
  isLoading,
  hasFollowing,
  onFindFriends,
}: FriendActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!hasFollowing) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-white/30" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/50">No friends yet</p>
          <p className="text-xs text-white/30 mt-0.5 max-w-[200px]">
            Follow friends to see their shows here
          </p>
        </div>
        {onFindFriends && (
          <button
            onClick={onFindFriends}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-full px-4 py-1.5 hover:bg-primary/10 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Find friends
          </button>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
          <Music2 className="h-5 w-5 text-white/30" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/50">No recent activity</p>
          <p className="text-xs text-white/30 mt-0.5 max-w-[200px]">
            Your friends haven't logged or planned any shows yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <AnimatePresence initial={false}>
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <ActivityCard item={item} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

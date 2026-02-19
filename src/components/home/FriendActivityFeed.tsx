import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { Calendar, Users, Zap, Music2, UserPlus, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FriendActivityItem } from "@/hooks/useFriendActivity";

interface FriendActivityFeedProps {
  items: FriendActivityItem[];
  isLoading: boolean;
  hasFollowing: boolean;
  onFindFriends?: () => void;
}

/** Returns a signal config: label, color classes, icon */
function getSignalConfig(signal: FriendActivityItem["signal"], type: FriendActivityItem["type"], rankPosition?: number | null) {
  if (signal === "shared") {
    return {
      label: "You're both going",
      icon: Zap,
      pill: "bg-primary/20 text-primary border-primary/30",
    };
  }
  if (signal === "multi-friend") {
    return {
      label: "Multiple friends going",
      icon: Users,
      pill: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    };
  }
  if (signal === "high-rating") {
    const label = rankPosition === 1 ? "#1 show" : rankPosition ? `Ranked #${rankPosition}` : "Top ranked";
    return {
      label,
      icon: Trophy,
      pill: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    };
  }
  // Standard — differentiate by type
  if (type === "upcoming") {
    return {
      label: "Going",
      icon: Calendar,
      pill: "bg-white/10 text-white/60 border-white/10",
    };
  }
  // Standard logged — still show rank if available
  const label = rankPosition ? `Ranked #${rankPosition}` : "Logged";
  return {
    label,
    icon: rankPosition ? Trophy : Music2,
    pill: rankPosition
      ? "bg-white/10 text-white/50 border-white/10"
      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/20",
  };
}

/** Full-bleed image card for items with a user photo or strong artist image */
function RichImageCard({ item }: { item: FriendActivityItem }) {
  const friendName = item.friend.full_name || item.friend.username || "Someone";
  const friendInitial = friendName.charAt(0).toUpperCase();
  const signal = getSignalConfig(item.signal, item.type, item.rankPosition);
  const SignalIcon = signal.icon;

  const imageUrl = item.photoUrl || item.artistImageUrl;
  const dateStr = item.showDate
    ? format(parseISO(item.showDate), "MMM d, yyyy")
    : null;

  const timeAgo = formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden border border-white/[0.10]"
      style={{ aspectRatio: "4/3" }}
    >
      {/* Full-bleed background image */}
      <img
        src={imageUrl!}
        alt={item.artistName}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />

      {/* Top bar: friend avatar + time */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 border-2 border-white/20 shadow-lg">
            <AvatarImage src={item.friend.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-black/50 text-white/80 backdrop-blur-sm">
              {friendInitial}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold text-white/90 drop-shadow-md">
            {friendName}
          </span>
        </div>

        {/* Signal pill */}
        <span className={cn(
          "flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border backdrop-blur-md",
          signal.pill
        )}>
          <SignalIcon className="h-2.5 w-2.5" />
          {signal.label}
        </span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-lg font-bold text-white leading-tight truncate drop-shadow-md">
          {item.artistName}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-white/60 truncate">
            {[item.venueName, item.venueLocation, dateStr].filter(Boolean).join(" · ")}
          </p>
        </div>

        {/* Shared friends stack */}
        {item.sharedFriends && item.sharedFriends.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex -space-x-1.5">
              {item.sharedFriends.slice(0, 4).map(f => (
                <Avatar key={f.id} className="h-5 w-5 border border-black/40">
                  <AvatarImage src={f.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px] bg-white/20 text-white">
                    {(f.full_name || f.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            {item.sharedFriends.length > 4 && (
              <span className="text-[10px] text-white/50">+{item.sharedFriends.length - 4} more</span>
            )}
          </div>
        )}

        <p className="text-[10px] text-white/35 mt-1.5">{timeAgo}</p>
      </div>
    </motion.div>
  );
}

/** Compact text card for items without images */
function CompactCard({ item }: { item: FriendActivityItem }) {
  const friendName = item.friend.full_name || item.friend.username || "Someone";
  const friendInitial = friendName.charAt(0).toUpperCase();
  const signal = getSignalConfig(item.signal, item.type, item.rankPosition);
  const SignalIcon = signal.icon;

  const dateStr = item.showDate
    ? format(parseISO(item.showDate), "MMM d")
    : null;
  const timeAgo = formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true });

  const isShared = item.signal === "shared";
  const isHighSignal = item.signal === "multi-friend";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border px-4 py-3.5 flex items-start gap-3 overflow-hidden",
        isShared
          ? "bg-primary/[0.07] border-primary/20"
          : isHighSignal
          ? "bg-violet-500/[0.05] border-violet-500/15"
          : "bg-white/[0.04] border-white/[0.07]"
      )}
    >
      {isShared && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      )}

      {/* Friend avatar + type dot */}
      <div className="relative flex-shrink-0 mt-0.5">
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarImage src={item.friend.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs bg-white/10 text-white/70">
            {friendInitial}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-[hsl(var(--background))] flex items-center justify-center",
          item.type === "upcoming" ? "bg-primary/80" : "bg-emerald-500/80"
        )}>
          <SignalIcon className="h-2.5 w-2.5 text-white" />
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">
            {friendName}
          </span>
          <span className={cn(
            "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
            signal.pill
          )}>
            {signal.label}
          </span>
        </div>

        <p className="text-sm font-semibold text-white/90 truncate">{item.artistName}</p>

        <p className="text-xs text-white/45 truncate mt-0.5">
          {[item.venueName, item.venueLocation, dateStr].filter(Boolean).join(" · ")}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-white/30">{timeAgo}</span>
        </div>
      </div>
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
        {/* One big skeleton card + two compact ones */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" style={{ aspectRatio: "4/3" }} />
        {[1, 2].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!hasFollowing) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
          <Users className="h-6 w-6 text-white/25" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/50">No friends yet</p>
          <p className="text-xs text-white/30 mt-1 max-w-[220px] leading-relaxed">
            Follow friends to see their shows, rankings, and moments here
          </p>
        </div>
        {onFindFriends && (
          <button
            onClick={onFindFriends}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/10 transition-colors"
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
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
          <Music2 className="h-6 w-6 text-white/25" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/50">No recent activity</p>
          <p className="text-xs text-white/30 mt-1 max-w-[220px] leading-relaxed">
            Your friends haven't logged or planned any shows recently
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const hasImage = !!(item.photoUrl || item.artistImageUrl);
          // First 2 items with images get the rich full-bleed card
          const useRichCard = hasImage && i < 3;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.035 }}
            >
              {useRichCard ? (
                <RichImageCard item={item} />
              ) : (
                <CompactCard item={item} />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

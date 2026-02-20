import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO, formatDistanceToNow, isPast, getYear } from "date-fns";
import { Calendar, Users, Zap, Music2, UserPlus, Trophy, Hand } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { FriendActivityItem } from "@/hooks/useFriendActivity";
import type { FollowerProfile } from "@/hooks/useFollowers";

export interface IWasTherePayload {
  artistName: string;
  venueName: string | null;
  showType: string | null;
}

interface FriendActivityFeedProps {
  items: FriendActivityItem[];
  isLoading: boolean;
  hasFollowing: boolean;
  onFindFriends?: () => void;
  onIWasThere?: (payload: IWasTherePayload) => void;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

/**
 * Smart date label for upcoming shows only:
 * - Current calendar year → "MMM d"
 * - Next calendar year or beyond → "MMM d, yyyy"
 */
function formatUpcomingDate(showDate: string | null): string | null {
  if (!showDate) return null;
  const date = parseISO(showDate);
  const currentYear = getYear(new Date());
  const showYear = getYear(date);
  return format(date, showYear === currentYear ? "MMM d" : "MMM d, yyyy");
}

// ─── Narrative string builder ─────────────────────────────────────────────────

function getFirstName(friend: FollowerProfile): string {
  const name = friend.full_name || friend.username || "Someone";
  return name.split(" ")[0];
}

function buildActivityString(item: FriendActivityItem): string {
  const firstName = getFirstName(item.friend);
  const artist = item.artistName;
  const venue = item.venueName;
  const at = venue ? ` at ${venue}` : "";

  const showDate = item.showDate ? parseISO(item.showDate) : null;
  const isInPast = showDate ? isPast(showDate) : true;

  if (item.signal === "shared") {
    return isInPast
      ? `You and ${firstName} both went to ${artist}${at}`
      : `You and ${firstName} are both going to ${artist}${at}`;
  }

  if (item.signal === "multi-friend") {
    const count = (item.sharedFriends?.length ?? 0) + 1;
    return `${count} friends are going to ${artist}${at}`;
  }

  if (item.type === "upcoming") {
    return isInPast
      ? `${firstName} went to ${artist}${at}`
      : `${firstName} is going to ${artist}${at}`;
  }

  // Logged shows
  if (item.rankPosition === 1) return `${firstName} ranked ${artist}${at} their #1 all time`;
  if (item.rankPosition) return `${firstName} ranked ${artist}${at} their #${item.rankPosition} all time`;
  return `${firstName} added ${artist}${at} to their Scene`;
}

// ─── Signal icon for avatar dot ───────────────────────────────────────────────

function getSignalMeta(item: FriendActivityItem) {
  if (item.signal === "shared") return { icon: Zap, color: "bg-primary/80" };
  if (item.signal === "multi-friend") return { icon: Users, color: "bg-violet-500/80" };
  if (item.rankPosition === 1) return { icon: Trophy, color: "bg-amber-500/80" };
  if (item.rankPosition && item.rankPosition <= 3) return { icon: Trophy, color: "bg-amber-500/60" };
  if (item.type === "upcoming") return { icon: Calendar, color: "bg-primary/60" };
  return { icon: Music2, color: "bg-emerald-500/70" };
}

// ─── Rich full-bleed image card ───────────────────────────────────────────────

function RichImageCard({ item, onIWasThere }: { item: FriendActivityItem; onIWasThere?: (payload: IWasTherePayload) => void }) {
  const imageUrl = item.photoUrl || item.artistImageUrl;
  const narrative = buildActivityString(item);
  const friendInitial = (item.friend.full_name || item.friend.username || "?").charAt(0).toUpperCase();

  const dateStr = formatUpcomingDate(item.showDate);
  const timeAgo = formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true });
  const isTopRanked = item.rankPosition === 1;
  const isLogged = item.type === "logged";

  // Logged: venue name gives "where" context; Upcoming: date gives "when" context
  const secondaryParts = item.type === "logged"
    ? [item.venueName].filter(Boolean)
    : [dateStr].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden border border-white/[0.10]"
      style={{ aspectRatio: "4/3" }}
    >
      <img
        src={imageUrl!}
        alt={item.artistName}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/50" />

      {/* Top: narrative */}
      <div className="absolute top-3 left-3 right-3 flex items-start gap-2">
        <Avatar className="h-7 w-7 flex-shrink-0 border border-white/20 shadow-md mt-0.5">
          <AvatarImage src={item.friend.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px] bg-black/50 text-white/80 backdrop-blur-sm">
            {friendInitial}
          </AvatarFallback>
        </Avatar>
        <p className="text-xs font-semibold text-white/90 leading-snug drop-shadow-md">
          {narrative}
        </p>
      </div>

      {/* Bottom: artist + secondary info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-end justify-between gap-2">
          <h3 className="text-xl font-bold text-white leading-tight truncate drop-shadow-md">
            {item.artistName}
          </h3>
          {isTopRanked && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/30 backdrop-blur-md flex-shrink-0">
              <Trophy className="h-2.5 w-2.5" />
              #1
            </span>
          )}
        </div>

        {secondaryParts.length > 0 && (
          <p className="text-xs text-white/55 mt-1 truncate">
            {secondaryParts.join(" · ")}
          </p>
        )}

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
              <span className="text-[10px] text-white/40">+{item.sharedFriends.length - 4} more</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-white/30">{timeAgo}</p>
          {isLogged && onIWasThere && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onIWasThere({ artistName: item.artistName, venueName: item.venueName, showType: item.showType ?? null }); }}
              className="flex items-center gap-1 text-[10px] font-semibold text-white/70 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-2.5 py-1 hover:bg-white/15 transition-colors"
            >
              <Hand className="h-2.5 w-2.5" />
              I was there
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Compact text card ────────────────────────────────────────────────────────

function CompactCard({ item, onIWasThere }: { item: FriendActivityItem; onIWasThere?: (payload: IWasTherePayload) => void }) {
  const narrative = buildActivityString(item);
  const friendInitial = (item.friend.full_name || item.friend.username || "?").charAt(0).toUpperCase();
  const meta = getSignalMeta(item);
  const MetaIcon = meta.icon;

  const dateStr = formatUpcomingDate(item.showDate);
  const timeAgo = formatDistanceToNow(parseISO(item.createdAt), { addSuffix: true });

  // Logged: venue name; Upcoming: date only
  const secondaryParts = item.type === "logged"
    ? [item.venueName].filter(Boolean)
    : [dateStr].filter(Boolean);

  const isShared = item.signal === "shared";
  const isMultiFriend = item.signal === "multi-friend";
  const isLogged = item.type === "logged";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative rounded-2xl border px-4 py-3.5 flex items-start gap-3 overflow-hidden",
        isShared
          ? "bg-primary/[0.07] border-primary/20"
          : isMultiFriend
          ? "bg-violet-500/[0.05] border-violet-500/15"
          : "bg-white/[0.04] border-white/[0.07]"
      )}
    >
      {isShared && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      )}

      <div className="relative flex-shrink-0 mt-0.5">
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarImage src={item.friend.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs bg-white/10 text-white/70">
            {friendInitial}
          </AvatarFallback>
        </Avatar>
        <span className={cn(
          "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-[hsl(var(--background))] flex items-center justify-center",
          meta.color
        )}>
          <MetaIcon className="h-2.5 w-2.5 text-white" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 leading-snug">
          {narrative}
        </p>

        {secondaryParts.length > 0 && (
          <p className="text-xs text-white/40 truncate mt-1">
            {secondaryParts.join(" · ")}
          </p>
        )}

        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-white/25">{timeAgo}</p>
          {isLogged && onIWasThere && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onIWasThere({ artistName: item.artistName, venueName: item.venueName, showType: item.showType ?? null }); }}
              className="text-[10px] font-semibold text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
            >
              <Hand className="h-2.5 w-2.5" />
              I was there
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main feed ────────────────────────────────────────────────────────────────

export default function FriendActivityFeed({
  items,
  isLoading,
  hasFollowing,
  onFindFriends,
  onIWasThere,
}: FriendActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" style={{ aspectRatio: "4/3" }} />
        {[1, 2].map(i => (
          <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!hasFollowing || items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-14 h-14 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
          <Music2 className="h-6 w-6 text-white/25" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/50">
            {!hasFollowing ? "Follow friends to see their activity" : "No recent activity"}
          </p>
          <p className="text-xs text-white/30 mt-1 max-w-[220px] leading-relaxed">
            {!hasFollowing
              ? "Find friends on Scene to see what shows they're going to"
              : "Your friends haven't logged or planned any shows recently"}
          </p>
          {!hasFollowing && onFindFriends && (
            <button
              onClick={onFindFriends}
              className="mt-3 text-xs font-semibold text-primary border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/10 transition-colors"
            >
              Find friends
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {items.map((item, i) => {
          const hasImage = !!(item.photoUrl || item.artistImageUrl);
          const useRichCard = hasImage && i < 3;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.035 }}
            >
              {useRichCard ? <RichImageCard item={item} onIWasThere={onIWasThere} /> : <CompactCard item={item} onIWasThere={onIWasThere} />}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

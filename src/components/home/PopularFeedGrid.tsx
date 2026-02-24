import { motion } from "framer-motion";
import { Users, Plus, Globe, MapPin, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PopularItem, PopularArtist, PopularEvent, ShowTypeFilter } from "@/hooks/usePopularShows";
import type { GeoScope } from "@/hooks/usePopularNearMe";

interface PopularFeedGridProps {
  items: PopularItem[];
  totalUsers: number;
  isLoading: boolean;
  showType: ShowTypeFilter;
  onShowTypeChange: (t: ShowTypeFilter) => void;
  onQuickAdd: (item: PopularItem) => void;
  onFindFriends?: () => void;
  emptyMessage?: string;
  geoScope: GeoScope;
  onGeoScopeChange: (scope: GeoScope) => void;
}

const TYPE_PILLS: { id: ShowTypeFilter; label: string }[] = [
  { id: "set", label: "Sets" },
  { id: "show", label: "Shows" },
  { id: "festival", label: "Festivals" },
];

const GEO_PILLS: { id: GeoScope; label: string; icon: typeof MapPin }[] = [
  { id: "city", label: "City", icon: MapPin },
  { id: "country", label: "Country", icon: Map },
  { id: "world", label: "World", icon: Globe },
];

function LeaderboardRow({ item, rank, onQuickAdd }: { item: PopularItem; rank: number; onQuickAdd: () => void }) {
  const name = item.type === "artist" ? item.artistName : item.eventName;
  const imageUrl = item.type === "artist" ? item.artistImageUrl : item.imageUrl;
  const venue = item.type === "artist" ? item.sampleVenueName : item.venueName;
  const subArtists = item.type === "event" && item.topArtists.length > 0 ? item.topArtists.join(" · ") : null;

  // Rank styling intensity
  const rankGlow = rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.03 }}
      className="flex items-center gap-3 py-2.5 group"
    >
      {/* Rank number */}
      <div className={cn(
        "w-7 text-center font-bold text-sm shrink-0",
        rank === 1 && "text-amber-400",
        rank === 2 && "text-white/70",
        rank === 3 && "text-amber-600/80",
        rank > 3 && "text-white/30"
      )}
        style={rankGlow ? { textShadow: rank === 1 ? "0 0 10px rgba(251,191,36,0.5)" : "none" } : undefined}
      >
        {rank}
      </div>

      {/* Artist/Event image */}
      <div className="relative h-11 w-11 rounded-xl overflow-hidden shrink-0 border border-white/[0.08]">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full bg-white/[0.06]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{name}</p>
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          {subArtists || venue || ""}
        </p>
      </div>

      {/* User count */}
      <div className="flex items-center gap-1 text-[10px] text-white/40 shrink-0">
        <Users className="h-3 w-3" />
        <span>{item.userCount}</span>
      </div>

      {/* Log CTA */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={(e) => { e.stopPropagation(); onQuickAdd(); }}
        className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg bg-white/[0.06] border border-white/[0.10] text-white/50 hover:bg-primary/15 hover:text-primary hover:border-primary/30 transition-colors"
        aria-label="Log this show"
      >
        <Plus className="h-3.5 w-3.5" />
      </motion.button>
    </motion.div>
  );
}

export default function PopularFeedGrid({
  items,
  totalUsers,
  isLoading,
  showType,
  onShowTypeChange,
  onQuickAdd,
  onFindFriends,
  emptyMessage,
  geoScope,
  onGeoScopeChange,
}: PopularFeedGridProps) {
  if (emptyMessage) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <GeoTabs active={geoScope} onChange={onGeoScopeChange} />
          <div className="w-px h-4 bg-white/[0.08]" />
          <SubTabs active={showType} onChange={onShowTypeChange} />
        </div>
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <GeoTabs active={geoScope} onChange={onGeoScopeChange} />
        <div className="w-px h-4 bg-white/[0.08]" />
        <SubTabs active={showType} onChange={onShowTypeChange} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <div className="w-7 h-4 rounded bg-white/[0.04] animate-pulse" />
              <div className="h-11 w-11 rounded-xl bg-white/[0.04] animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-white/[0.04] animate-pulse" />
                <div className="h-2.5 w-16 rounded bg-white/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>No {showType === "set" ? "sets" : showType === "show" ? "shows" : "festivals"} found yet.</p>
        </div>
      )}

      {/* Leaderboard list */}
      {!isLoading && items.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.05] px-3">
          {items.map((item, i) => (
            <LeaderboardRow
              key={item.type === "artist" ? item.artistName : item.eventName}
              item={item}
              rank={i + 1}
              onQuickAdd={() => onQuickAdd(item)}
            />
          ))}
        </div>
      )}

      {/* Total users context */}
      {!isLoading && items.length > 0 && totalUsers > 0 && (
        <p className="text-[10px] text-white/25 text-center tracking-wide uppercase">
          Based on {totalUsers} {totalUsers === 1 ? "user" : "users"} in the Scene community
        </p>
      )}
    </div>
  );
}

function GeoTabs({ active, onChange }: { active: GeoScope; onChange: (s: GeoScope) => void }) {
  return (
    <div className="flex gap-1.5">
      {GEO_PILLS.map((pill) => {
        const Icon = pill.icon;
        return (
          <button
            key={pill.id}
            onClick={() => onChange(pill.id)}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-semibold border transition-colors",
              active === pill.id
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
            )}
          >
            <Icon className="h-3 w-3" />
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}

function SubTabs({ active, onChange }: { active: ShowTypeFilter; onChange: (t: ShowTypeFilter) => void }) {
  return (
    <div className="flex gap-1.5">
      {TYPE_PILLS.map((pill) => (
        <button
          key={pill.id}
          onClick={() => onChange(pill.id)}
          className={cn(
            "px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.12em] font-semibold border transition-colors",
            active === pill.id
              ? "bg-white/10 border-white/20 text-white/70"
              : "bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
          )}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}

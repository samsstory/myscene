import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PopularItem, PopularArtist, PopularEvent, ShowTypeFilter } from "@/hooks/usePopularShows";

interface PopularFeedGridProps {
  items: PopularItem[];
  totalUsers: number;
  isLoading: boolean;
  showType: ShowTypeFilter;
  onShowTypeChange: (t: ShowTypeFilter) => void;
  onQuickAdd: (item: PopularItem) => void;
  onFindFriends?: () => void;
  /** Optional message when no location is set (for Near Me) */
  emptyMessage?: string;
}

const TYPE_PILLS: { id: ShowTypeFilter; label: string }[] = [
  { id: "set", label: "Sets" },
  { id: "show", label: "Shows" },
  { id: "festival", label: "Festivals" },
];

function ArtistCard({ item, onQuickAdd, index }: { item: PopularArtist; onQuickAdd: () => void; index: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      onClick={onQuickAdd}
      className="relative group rounded-2xl overflow-hidden border border-white/[0.08] aspect-square"
    >
      <img src={item.artistImageUrl!} alt={item.artistName} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
        <Plus className="h-3 w-3 text-white" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p className="text-xs font-bold text-white leading-tight truncate drop-shadow-md">{item.artistName}</p>
        {item.userCount > 0 && (
          <p className="text-[9px] text-white/45 mt-0.5 flex items-center gap-1">
            <Users className="h-2.5 w-2.5 inline" />
            {item.userCount} {item.userCount === 1 ? "user" : "users"}
          </p>
        )}
      </div>
    </motion.button>
  );
}

function EventCard({ item, onQuickAdd, index }: { item: PopularEvent; onQuickAdd: () => void; index: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      onClick={onQuickAdd}
      className="relative group rounded-2xl overflow-hidden border border-white/[0.08] aspect-[4/3]"
    >
      <img src={item.imageUrl!} alt={item.eventName} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
        <Plus className="h-3 w-3 text-white" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm font-bold text-white leading-tight truncate drop-shadow-md">{item.eventName}</p>
        {item.topArtists.length > 0 && (
          <p className="text-[10px] text-white/50 mt-0.5 truncate">
            {item.topArtists.join(" · ")}
          </p>
        )}
        {item.userCount > 0 && (
          <p className="text-[9px] text-white/40 mt-1 flex items-center gap-1">
            <Users className="h-2.5 w-2.5 inline" />
            {item.userCount} {item.userCount === 1 ? "user" : "users"}
          </p>
        )}
      </div>
    </motion.button>
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
}: PopularFeedGridProps) {
  if (emptyMessage) {
    return (
      <div className="space-y-3">
        <SubTabs active={showType} onChange={onShowTypeChange} />
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <SubTabs active={showType} onChange={onShowTypeChange} />

      {/* Loading */}
      {isLoading && (
        <div className={cn("grid gap-2", showType === "set" ? "grid-cols-3" : "grid-cols-2")}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={cn(
              "rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse",
              showType === "set" ? "aspect-square" : "aspect-[4/3]"
            )} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <p>No {showType === "set" ? "sets" : showType === "show" ? "shows" : "festivals"} found yet.</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && items.length > 0 && (
        <div className={cn("grid gap-2", showType === "set" ? "grid-cols-3" : "grid-cols-2")}>
          {items.map((item, i) => {
            if (item.type === "artist") {
              return <ArtistCard key={item.artistName} item={item} onQuickAdd={() => onQuickAdd(item)} index={i} />;
            } else {
              return <EventCard key={item.eventName} item={item} onQuickAdd={() => onQuickAdd(item)} index={i} />;
            }
          })}
        </div>
      )}

      {/* Find friends CTA */}
      {onFindFriends && (
        <div className="flex justify-center pt-1">
          <button
            onClick={onFindFriends}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-full px-4 py-2 hover:bg-primary/10 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Find friends
          </button>
        </div>
      )}
    </div>
  );
}

function SubTabs({ active, onChange }: { active: ShowTypeFilter; onChange: (t: ShowTypeFilter) => void }) {
  return (
    <div className="flex gap-2">
      {TYPE_PILLS.map((pill) => (
        <button
          key={pill.id}
          onClick={() => onChange(pill.id)}
          className={cn(
            "px-3 py-1 rounded-full text-[10px] uppercase tracking-[0.15em] font-semibold border transition-colors",
            active === pill.id
              ? "bg-primary/15 border-primary/30 text-primary"
              : "bg-white/[0.04] border-white/[0.08] text-white/30 hover:text-white/50 hover:bg-white/[0.06]"
          )}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}

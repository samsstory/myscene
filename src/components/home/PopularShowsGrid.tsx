import { motion } from "framer-motion";
import { Plus, Users, UserPlus } from "lucide-react";
import type { PopularArtist } from "@/hooks/usePopularShows";
import { cn } from "@/lib/utils";

interface PopularShowsGridProps {
  artists: PopularArtist[];
  totalUsers: number;
  isLoading: boolean;
  onQuickAdd: (artist: PopularArtist) => void;
  onFindFriends?: () => void;
}

function ArtistCard({ artist, onQuickAdd, index }: { artist: PopularArtist; onQuickAdd: (a: PopularArtist) => void; index: number }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => onQuickAdd(artist)}
      className="relative group rounded-2xl overflow-hidden border border-white/[0.08] aspect-square"
    >
      <img
        src={artist.artistImageUrl!}
        alt={artist.artistName}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Quick-add icon */}
      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
        <Plus className="h-3 w-3 text-white" />
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p className="text-xs font-bold text-white leading-tight truncate drop-shadow-md">
          {artist.artistName}
        </p>
        {artist.userCount > 0 && (
          <p className="text-[9px] text-white/45 mt-0.5 flex items-center gap-1">
            <Users className="h-2.5 w-2.5 inline" />
            {artist.userCount} {artist.userCount === 1 ? "user" : "users"}
          </p>
        )}
      </div>
    </motion.button>
  );
}

export default function PopularShowsGrid({
  artists,
  totalUsers,
  isLoading,
  onQuickAdd,
  onFindFriends,
}: PopularShowsGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (artists.length === 0) return null;

  return (
    <div className="space-y-3">

      {/* Artist grid */}
      <div className="grid grid-cols-3 gap-2">
        {artists.map((artist, i) => (
          <ArtistCard key={artist.artistName} artist={artist} onQuickAdd={onQuickAdd} index={i} />
        ))}
      </div>

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

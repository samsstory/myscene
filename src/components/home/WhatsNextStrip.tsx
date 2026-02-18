import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Music2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { usePlanUpcomingShow, type UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import PlanShowSheet from "./PlanShowSheet";
import UpcomingShowDetailSheet from "./UpcomingShowDetailSheet";

interface WhatsNextStripProps {
  onPlanShow?: () => void;
}

const RSVP_BADGE = {
  going:     { Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  maybe:     { Icon: AlertCircle,  color: "text-amber-400",   bg: "bg-amber-500/20 border-amber-500/30"   },
  not_going: { Icon: X,            color: "text-white/40",    bg: "bg-white/[0.06] border-white/10"        },
} as const;

// Mock friend avatars — replace with real friend data when social layer ships
const MOCK_FRIEND_POOLS = [
  ["https://i.pravatar.cc/40?img=1", "https://i.pravatar.cc/40?img=5"],
  ["https://i.pravatar.cc/40?img=9", "https://i.pravatar.cc/40?img=12", "https://i.pravatar.cc/40?img=15"],
  ["https://i.pravatar.cc/40?img=3"],
  ["https://i.pravatar.cc/40?img=7", "https://i.pravatar.cc/40?img=22"],
];

function getMockFriends(showId: string) {
  // Deterministically pick a pool based on show ID so it's stable across renders
  const idx = showId.charCodeAt(0) % MOCK_FRIEND_POOLS.length;
  return MOCK_FRIEND_POOLS[idx];
}

function UpcomingChip({ show, onTap }: { show: UpcomingShow; onTap: (show: UpcomingShow) => void }) {
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "MMM d"); } catch { return ""; } })()
    : "Date TBD";

  const venueLabel = show.venue_name
    ? (show.venue_name.length > 16 ? show.venue_name.slice(0, 14) + "…" : show.venue_name)
    : show.venue_location
    ? (show.venue_location.length > 16 ? show.venue_location.slice(0, 14) + "…" : show.venue_location)
    : null;

  const badge = RSVP_BADGE[show.rsvp_status ?? "going"];
  const BadgeIcon = badge.Icon;

  return (
    <button
      className="relative flex-shrink-0 w-32 h-36 rounded-2xl overflow-hidden cursor-pointer select-none text-left"
      onClick={() => onTap(show)}
    >
      {/* Background */}
      {show.artist_image_url ? (
        <>
          <img
            src={show.artist_image_url}
            alt={show.artist_name}
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: "blur(2px)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-transparent" />
      )}

      {/* RSVP badge — top-right */}
      <div className={`absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full border backdrop-blur-sm ${badge.bg}`}>
        <BadgeIcon className={`h-3 w-3 ${badge.color}`} />
      </div>

      {/* Friend avatar stack — bottom-left, above artist name */}
      {(() => {
        const friends = getMockFriends(show.id);
        const visible = friends.slice(0, 3);
        const overflow = friends.length - visible.length;
        return (
          <div className="absolute bottom-[52px] left-2.5 flex items-center">
            {visible.map((src, i) => (
              <img
                key={i}
                src={src}
                alt="Friend"
                className="w-5 h-5 rounded-full border border-black/60 object-cover"
                style={{ marginLeft: i === 0 ? 0 : -6, zIndex: i }}
              />
            ))}
            {overflow > 0 && (
              <div
                className="w-5 h-5 rounded-full border border-black/60 bg-white/20 backdrop-blur-sm flex items-center justify-center text-[8px] font-bold text-white"
                style={{ marginLeft: -6, zIndex: visible.length }}
              >
                +{overflow}
              </div>
            )}
          </div>
        );
      })()}

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p
          className="text-xs font-bold text-white leading-tight line-clamp-2"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {show.artist_name}
        </p>
        <p
          className="text-[10px] text-white/70 mt-0.5"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {dateLabel}
          {venueLabel && ` · ${venueLabel}`}
        </p>
      </div>
    </button>
  );
}

function AddShowChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-28 h-36 rounded-2xl border border-dashed border-white/20 bg-white/[0.04] hover:bg-white/[0.07] transition-colors flex flex-col items-center justify-center gap-2 group"
    >
      <div className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center group-hover:bg-white/[0.14] transition-colors">
        <Plus className="h-4 w-4 text-white/60" />
      </div>
      <span className="text-[11px] font-medium text-white/50 group-hover:text-white/70 transition-colors text-center leading-tight">
        Plan a<br />Show
      </span>
    </button>
  );
}

export default function WhatsNextStrip({ onPlanShow }: WhatsNextStripProps) {
  const { upcomingShows, isLoading, deleteUpcomingShow, updateRsvpStatus } = usePlanUpcomingShow();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<UpcomingShow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handlePlanShow = () => {
    if (onPlanShow) {
      onPlanShow();
    } else {
      setSheetOpen(true);
    }
  };

  const handleChipTap = (show: UpcomingShow) => {
    setSelectedShow(show);
    setDetailOpen(true);
  };

  return (
    <>
      <div className="space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3
            className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/60"
            style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
          >
            What's Next
          </h3>
          {upcomingShows.length > 0 && (
            <button
              onClick={handlePlanShow}
              className="text-[10px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
            >
              + Add
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-32 h-36 rounded-2xl bg-white/[0.05] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && upcomingShows.length === 0 && (
          <button
            onClick={handlePlanShow}
            className="w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
              <Music2 className="h-5 w-5 text-white/50" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white/60">Plan a show</p>
              <p className="text-xs text-white/35 mt-0.5">Add concerts you're planning to attend</p>
            </div>
            <div className="ml-auto">
              <Plus className="h-4 w-4 text-white/30" />
            </div>
          </button>
        )}

        {/* Show chips */}
        {!isLoading && upcomingShows.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            {upcomingShows.map((show) => (
              <UpcomingChip
                key={show.id}
                show={show}
                onTap={handleChipTap}
              />
            ))}
            <AddShowChip onClick={handlePlanShow} />
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <UpcomingShowDetailSheet
        show={selectedShow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDelete={deleteUpcomingShow}
        onRsvpChange={updateRsvpStatus}
      />

      {/* Plan show sheet (used when no external handler passed) */}
      {!onPlanShow && (
        <PlanShowSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </>
  );
}

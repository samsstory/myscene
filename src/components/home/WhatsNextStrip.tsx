import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Music2, Trash2 } from "lucide-react";
import { usePlanUpcomingShow, type UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import PlanShowSheet from "./PlanShowSheet";

interface WhatsNextStripProps {
  onPlanShow?: () => void;
}

function UpcomingChip({ show, onDelete }: { show: UpcomingShow; onDelete: (id: string) => void }) {
  const [showDelete, setShowDelete] = useState(false);

  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "MMM d"); } catch { return ""; } })()
    : "Date TBD";

  const venueLabel = show.venue_name
    ? (show.venue_name.length > 16 ? show.venue_name.slice(0, 14) + "…" : show.venue_name)
    : show.venue_location
    ? (show.venue_location.length > 16 ? show.venue_location.slice(0, 14) + "…" : show.venue_location)
    : null;

  return (
    <div
      className="relative flex-shrink-0 w-32 h-36 rounded-2xl overflow-hidden cursor-pointer select-none"
      onClick={() => setShowDelete((v) => !v)}
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

      {/* Delete overlay */}
      {showDelete && (
        <button
          className="absolute inset-0 flex items-center justify-center bg-black/70 z-10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(show.id);
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <Trash2 className="h-5 w-5 text-red-400" />
            <span className="text-xs text-red-400 font-medium">Remove</span>
          </div>
        </button>
      )}

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
    </div>
  );
}

function AddShowChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-28 h-36 rounded-2xl border border-dashed border-white/20 bg-white/[0.04] hover:bg-white/[0.07] transition-colors flex flex-col items-center justify-center gap-2 group"
    >
      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
        <Plus className="h-4 w-4 text-primary" />
      </div>
      <span className="text-[11px] font-medium text-white/50 group-hover:text-white/70 transition-colors text-center leading-tight">
        Plan a<br />Show
      </span>
    </button>
  );
}

export default function WhatsNextStrip({ onPlanShow }: WhatsNextStripProps) {
  const { upcomingShows, isLoading, deleteUpcomingShow } = usePlanUpcomingShow();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handlePlanShow = () => {
    if (onPlanShow) {
      onPlanShow();
    } else {
      setSheetOpen(true);
    }
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
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <Music2 className="h-5 w-5 text-primary/70" />
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
                onDelete={deleteUpcomingShow}
              />
            ))}
            <AddShowChip onClick={handlePlanShow} />
          </div>
        )}
      </div>

      {/* Local sheet (used when no external handler passed) */}
      {!onPlanShow && (
        <PlanShowSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      )}
    </>
  );
}

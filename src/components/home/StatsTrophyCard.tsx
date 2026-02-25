import { Music, MapPin, CalendarPlus } from "lucide-react";
import CountUp from "./CountUp";
import { Skeleton } from "@/components/ui/skeleton";

interface TopArtist {
  name: string;
  imageUrl: string | null;
}

interface StatsTrophyCardProps {
  totalShows: number;
  topGenre: string | null;
  uniqueVenues: number;
  milesDanced: number | null;
  topArtists: TopArtist[];
  isLoading: boolean;
  onAddShow?: () => void;
}

export default function StatsTrophyCard({
  totalShows,
  topGenre,
  uniqueVenues,
  milesDanced,
  topArtists,
  isLoading,
  onAddShow,
}: StatsTrophyCardProps) {
  if (isLoading) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md p-5 space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-20 rounded-xl" />
          <Skeleton className="flex-1 h-20 rounded-xl" />
          <Skeleton className="flex-1 h-20 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-48" />
      </section>
    );
  }

  // Blurred empty state (0 shows)
  if (totalShows === 0) {
    return (
      <section className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md overflow-hidden">
        {/* Blurred placeholder content */}
        <div className="p-5 space-y-4 filter blur-[8px] select-none pointer-events-none" aria-hidden>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Your Scene Stats
          </p>
          <div className="flex gap-3">
            <StatBox label="Shows" value="24" />
            <StatBox label="Top Genre" value="House" icon={<Music className="h-3.5 w-3.5" />} />
            <StatBox label="Venues" value="8" icon={<MapPin className="h-3.5 w-3.5" />} />
          </div>
          <p className="text-xs text-muted-foreground">
            🏆 Top: Fred again.., Bonobo, RÜFÜS DU SOL
          </p>
        </div>

        {/* Unlock overlay */}
        <div className="absolute inset-0 bg-background/60 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="text-2xl">🔒</div>
          <p className="text-sm font-semibold text-foreground">
            Add your first show to unlock your stats
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
            Track your concerts, see your top genres, and find out how many miles you've danced
          </p>
          <button
            onClick={onAddShow}
            className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <CalendarPlus className="h-4 w-4" />
            Add My First Show
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md p-5 space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Your Scene Stats
      </p>

      {/* Stats row */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-xl bg-white/[0.06] border border-white/[0.08] p-3 text-center space-y-1">
          <CountUp
            value={totalShows}
            className="text-3xl font-bold text-foreground block"
            formatted
          />
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Shows
          </p>
        </div>

        <div className="flex-1 rounded-xl bg-white/[0.06] border border-white/[0.08] p-3 text-center space-y-1">
          {topGenre ? (
            <>
              <span className="text-lg font-semibold text-foreground block truncate">
                {topGenre}
              </span>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
                <Music className="h-3 w-3" /> Genre
              </p>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold text-muted-foreground/60 block">—</span>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Genre</p>
            </>
          )}
        </div>

        <div className="flex-1 rounded-xl bg-white/[0.06] border border-white/[0.08] p-3 text-center space-y-1">
          <CountUp
            value={uniqueVenues}
            className="text-3xl font-bold text-foreground block"
          />
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
            <MapPin className="h-3 w-3" /> Venues
          </p>
        </div>
      </div>

      {/* Miles danced (only if available) */}
      {milesDanced !== null && milesDanced > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>📍</span>
          <CountUp
            value={Math.round(milesDanced)}
            className="font-semibold text-foreground"
            formatted
          />
          <span>Miles Danced</span>
        </div>
      )}

      {/* Top Artists */}
      {topArtists.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>🏆</span>
          <span>
            Top:{" "}
            <span className="text-foreground font-medium">
              {topArtists.map((a) => a.name).join(", ")}
            </span>
          </span>
        </div>
      )}
    </section>
  );
}

/** Static placeholder stat box for blur state */
function StatBox({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex-1 rounded-xl bg-white/[0.06] border border-white/[0.08] p-3 text-center space-y-1">
      <span className="text-3xl font-bold text-foreground block">{value}</span>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1">
        {icon} {label}
      </p>
    </div>
  );
}

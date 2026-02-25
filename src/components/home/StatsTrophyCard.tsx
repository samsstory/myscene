import { Music, MapPin, CalendarPlus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
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
      <div className="stats-trophy-wrapper rounded-2xl p-[1px]">
        <section className="rounded-2xl bg-card/80 backdrop-blur-xl p-5 space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2.5">
            <Skeleton className="flex-1 h-[76px] rounded-xl" />
            <Skeleton className="flex-1 h-[76px] rounded-xl" />
            <Skeleton className="flex-1 h-[76px] rounded-xl" />
          </div>
          <Skeleton className="h-3.5 w-44" />
        </section>
      </div>
    );
  }

  // Blurred empty state (0 shows)
  if (totalShows === 0) {
    return (
      <div className="stats-trophy-wrapper rounded-2xl p-[1px]">
        <section className="relative rounded-2xl bg-card/80 backdrop-blur-xl overflow-hidden">
          {/* Blurred placeholder content */}
          <div className="p-5 space-y-4 filter blur-[8px] select-none pointer-events-none opacity-40" aria-hidden>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Your Scene Stats
            </p>
            <div className="flex gap-2.5">
              <StatBox label="Shows" value="24" />
              <StatBox label="Genre" value="House" icon={<Music className="h-3 w-3" />} />
              <StatBox label="Venues" value="8" icon={<MapPin className="h-3 w-3" />} />
            </div>
            <p className="text-xs text-muted-foreground">
              🏆 Fred again.., Bonobo, RÜFÜS DU SOL
            </p>
          </div>

          {/* Unlock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 px-6 text-center">
            {/* Glow circle behind icon */}
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-xl"
                style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.25), transparent 70%)" }}
              />
              <div className="relative w-12 h-12 rounded-full bg-white/[0.06] border border-white/[0.12] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[15px] font-semibold text-foreground">
                Unlock your stats
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
                Add your first show to see your genres, top artists, and miles danced
              </p>
            </div>
            <motion.button
              onClick={onAddShow}
              whileTap={{ scale: 0.97 }}
              className="mt-0.5 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              <CalendarPlus className="h-4 w-4" />
              Add My First Show
            </motion.button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="stats-trophy-wrapper rounded-2xl p-[1px]">
      <section className="rounded-2xl bg-card/80 backdrop-blur-xl p-5 space-y-4 relative overflow-hidden">
        {/* Subtle mesh gradient overlay */}
        <div
          className="absolute top-0 left-0 w-40 h-40 opacity-[0.06] pointer-events-none"
          style={{
            background: "radial-gradient(circle at 0% 0%, hsl(var(--primary)), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-32 h-32 opacity-[0.04] pointer-events-none"
          style={{
            background: "radial-gradient(circle at 100% 100%, hsl(var(--secondary)), transparent 70%)",
          }}
        />

        {/* Header */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground relative z-10">
          Your Scene Stats
        </p>

        {/* Stats row */}
        <div className="flex gap-2.5 relative z-10">
          {/* Shows — hero stat, emphasized */}
          <div className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center space-y-0.5">
            <CountUp
              value={totalShows}
              className="text-[32px] font-bold text-foreground block leading-tight"
              style={{ textShadow: "0 0 30px hsl(var(--primary) / 0.3)" }}
              formatted
            />
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
              Shows
            </p>
          </div>

          {/* Genre */}
          <div className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center flex flex-col items-center justify-center gap-0.5">
            {topGenre ? (
              <>
                <span className="text-[15px] font-semibold text-foreground block truncate w-full leading-tight">
                  {topGenre}
                </span>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium flex items-center gap-1">
                  <Music className="h-2.5 w-2.5" /> Genre
                </p>
              </>
            ) : (
              <>
                <span className="text-[15px] font-semibold text-muted-foreground/40 block">—</span>
                <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium">Genre</p>
              </>
            )}
          </div>

          {/* Venues */}
          <div className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center space-y-0.5">
            <CountUp
              value={uniqueVenues}
              className="text-[32px] font-bold text-foreground block leading-tight"
            />
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium flex items-center justify-center gap-1">
              <MapPin className="h-2.5 w-2.5" /> Venues
            </p>
          </div>
        </div>

        {/* Bottom details row */}
        <div className="relative z-10 space-y-1.5">
          {/* Miles danced */}
          {milesDanced !== null && milesDanced > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className="text-[13px]">📍</span>
              <CountUp
                value={Math.round(milesDanced)}
                className="font-semibold text-foreground"
                formatted
              />
              <span>miles danced</span>
            </div>
          )}

          {/* Top Artists */}
          {topArtists.length > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className="text-[13px]">🏆</span>
              <span className="truncate">
                <span className="text-foreground font-medium">
                  {topArtists.map((a) => a.name).join(", ")}
                </span>
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
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
    <div className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center space-y-0.5">
      <span className="text-[32px] font-bold text-foreground block leading-tight">{value}</span>
      <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium flex items-center justify-center gap-1">
        {icon} {label}
      </p>
    </div>
  );
}

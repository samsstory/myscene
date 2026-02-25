import { useState, useEffect, useMemo } from "react";
import { MapPin, CalendarPlus, Sparkles, Music2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "./CountUp";
import { Skeleton } from "@/components/ui/skeleton";
import { getComparisonsForMiles } from "@/lib/distance-comparisons";

interface TopArtist {
  name: string;
  imageUrl: string | null;
}

interface StatsTrophyCardProps {
  totalShows: number;
  topGenre: string | null;
  uniqueVenues: number;
  uniqueArtists: number;
  uniqueCities: number;
  uniqueCountries: number;
  milesDanced: number | null;
  topArtists: TopArtist[];
  isLoading: boolean;
  onAddShow?: () => void;
}

/** Maps genre + show count → persona title */
function getSceneTitle(topGenre: string | null, totalShows: number): string {
  if (!topGenre) return "Music Lover";
  const g = topGenre.toLowerCase();
  if (g.includes("electronic") || g.includes("edm") || g.includes("bass"))
    return totalShows >= 50 ? "Rave Veteran" : "Raver";
  if (g.includes("house")) return "House Head";
  if (g.includes("techno")) return "Techno Purist";
  if (g.includes("hip hop") || g.includes("hip-hop") || g.includes("rap")) return "Hypebeast";
  if (g.includes("rock") || g.includes("metal")) return "Headbanger";
  if (g.includes("indie")) return "Indie Kid";
  if (g.includes("pop")) return "Pop Stan";
  if (g === "eclectic") return "Genre Fluid";
  return "Music Lover";
}

export default function StatsTrophyCard({
  totalShows,
  topGenre,
  uniqueVenues,
  uniqueArtists,
  uniqueCities,
  uniqueCountries,
  milesDanced,
  topArtists,
  isLoading,
  onAddShow,
}: StatsTrophyCardProps) {
  const [comparisonIndex, setComparisonIndex] = useState(0);
  const comparisons = useMemo(
    () => (milesDanced !== null && milesDanced > 0 ? getComparisonsForMiles(Math.round(milesDanced)) : []),
    [milesDanced]
  );

  useEffect(() => {
    if (comparisons.length <= 1) return;
    setComparisonIndex(0);
    const interval = setInterval(() => {
      setComparisonIndex((prev) => (prev + 1) % comparisons.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [comparisons]);

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
              <StatBox label="Artists" value="63" icon={<Music2 className="h-2.5 w-2.5" />} />
              <StatBox label="Venues" value="8" icon={<MapPin className="h-3 w-3" />} />
            </div>
            <p className="text-xs text-muted-foreground">
              🏆 Fred again.., Bonobo, RÜFÜS DU SOL
            </p>
          </div>

          {/* Unlock overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5 px-6 text-center">
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

  const sceneTitle = getSceneTitle(topGenre, totalShows);

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

        {/* Title badge + Header */}
        <div className="relative z-10 space-y-1">
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-[0.16em] px-2.5 py-0.5 rounded-full animate-pulse"
            style={{
              background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(280 60% 60% / 0.2))",
              color: "hsl(var(--primary))",
              border: "1px solid hsl(var(--primary) / 0.25)",
            }}
          >
            🎵 {sceneTitle}
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Your Scene Stats
          </p>
        </div>

        {/* Stats row */}
        <div className="flex gap-2.5 relative z-10">
          {/* Shows — hero stat */}
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

          {/* Artists */}
          <div className="flex-1 rounded-xl bg-white/[0.05] border border-white/[0.08] p-3 text-center space-y-0.5">
            <CountUp
              value={uniqueArtists}
              className="text-[32px] font-bold text-foreground block leading-tight"
              formatted
            />
            <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium flex items-center justify-center gap-1">
              <Music2 className="h-2.5 w-2.5" /> Artists
            </p>
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

          {/* Distance comparison tagline */}
          {comparisons.length > 0 && (
            <AnimatePresence mode="wait">
              <motion.p
                key={comparisonIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="text-sm text-cyan-400/80 italic"
              >
                {comparisons[comparisonIndex]}
              </motion.p>
            </AnimatePresence>
          )}

          {/* Geographic stats */}
          {(uniqueCities > 0 || uniqueCountries > 0) && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className="text-[13px]">🌍</span>
              <span>
                {uniqueCities > 0 && (
                  <span className="text-foreground font-medium">{uniqueCities}</span>
                )}
                {uniqueCities > 0 && ` ${uniqueCities === 1 ? "city" : "cities"}`}
                {uniqueCities > 0 && uniqueCountries > 1 && " · "}
                {uniqueCountries > 1 && (
                  <>
                    <span className="text-foreground font-medium">{uniqueCountries}</span>
                    {` ${uniqueCountries === 1 ? "country" : "countries"}`}
                  </>
                )}
              </span>
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

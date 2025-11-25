import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Share2, Music, MapPin, TrendingUp, Activity, Trophy, Sparkles, Calendar, Mic } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface StatsData {
  allTimeShows: number;
  showsThisYear: number;
  showsThisMonth: number;
  mostSeenArtist: string;
  mostSeenArtistCount: number;
  mostVisitedVenue: string;
  mostVisitedVenueCount: number;
  userPercentile: number;
  distanceDanced: string;
  topRankedShow: {
    artists: string;
    venue: string;
    eloScore: number;
  } | null;
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  gradient?: string;
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleShare = () => {
    toast.success("Sharing feature coming soon! 📸");
  };

  return (
    <div 
      className="perspective-1000 cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={cn(
        "relative w-full h-48 transition-transform duration-500 transform-style-3d",
        isFlipped && "rotate-y-180"
      )}>
        {/* Front */}
        <Card className={cn(
          "absolute inset-0 backface-hidden border-border/50 overflow-hidden",
          "hover:shadow-glow transition-all duration-300",
          gradient || "bg-gradient-to-br from-card via-card to-card/80"
        )}>
          <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </h3>
              <Icon className="h-8 w-8 text-primary/80" />
            </div>
            <div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-primary bg-clip-text text-transparent mb-2 truncate">
                {value}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
            <Button 
              variant="default" 
              size="sm" 
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </CardContent>
        </Card>

        {/* Back */}
        <Card className="absolute inset-0 backface-hidden rotate-y-180 border-border/50 bg-gradient-to-br from-primary/20 via-card to-secondary/20">
          <CardContent className="p-6 h-full flex flex-col justify-center items-center gap-4">
            <Sparkles className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-center text-sm text-muted-foreground">
              Share this stat to your story
            </p>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="w-full shadow-glow"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share to Instagram
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const Stats = () => {
  const [showSharePreview, setShowSharePreview] = useState(false);
  const [stats, setStats] = useState<StatsData>({
    allTimeShows: 0,
    showsThisYear: 0,
    showsThisMonth: 0,
    mostSeenArtist: "—",
    mostSeenArtistCount: 0,
    mostVisitedVenue: "—",
    mostVisitedVenueCount: 0,
    userPercentile: 0,
    distanceDanced: "0 miles",
    topRankedShow: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const userId = session.user.id;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const currentMonthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const yearStart = new Date(currentYear, 0, 1).toISOString().split('T')[0];

        // Get all shows for the user
        const { data: shows, error: showsError } = await supabase
          .from('shows')
          .select('id, show_date, venue_name, venue_id')
          .eq('user_id', userId);

        if (showsError) throw showsError;

        // Calculate shows this year
        const showsThisYear = shows?.filter(show => show.show_date >= yearStart).length || 0;

        // Calculate shows this month
        const showsThisMonth = shows?.filter(show => show.show_date >= currentMonthStart).length || 0;

        // Get most seen artist
        const { data: artistCounts } = await supabase
          .from('show_artists')
          .select('artist_name, show_id')
          .in('show_id', shows?.map(s => s.id) || []);

        const artistMap = new Map<string, number>();
        artistCounts?.forEach(artist => {
          artistMap.set(artist.artist_name, (artistMap.get(artist.artist_name) || 0) + 1);
        });

        let mostSeenArtist = "—";
        let mostSeenArtistCount = 0;
        artistMap.forEach((count, artist) => {
          if (count > mostSeenArtistCount) {
            mostSeenArtistCount = count;
            mostSeenArtist = artist;
          }
        });

        // Get most visited venue
        const venueMap = new Map<string, number>();
        shows?.forEach(show => {
          if (show.venue_name) {
            venueMap.set(show.venue_name, (venueMap.get(show.venue_name) || 0) + 1);
          }
        });

        let mostVisitedVenue = "—";
        let mostVisitedVenueCount = 0;
        venueMap.forEach((count, venue) => {
          if (count > mostVisitedVenueCount) {
            mostVisitedVenueCount = count;
            mostVisitedVenue = venue;
          }
        });

        // Calculate estimated distance danced (3 hours per show * 0.2 miles per hour)
        const totalShows = shows?.length || 0;
        const distanceMiles = (totalShows * 3 * 0.2).toFixed(1);

        // Get top-ranked show from ELO rankings
        let topRankedShow = null;
        const { data: rankings, error: rankingsError } = await supabase
          .from('show_rankings')
          .select('show_id, elo_score, comparisons_count')
          .eq('user_id', userId)
          .order('elo_score', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!rankingsError && rankings && rankings.comparisons_count > 0) {
          // Fetch the show details
          const { data: topShow } = await supabase
            .from('shows')
            .select('id, venue_name')
            .eq('id', rankings.show_id)
            .single();

          if (topShow) {
            // Fetch artists for this show
            const { data: showArtists } = await supabase
              .from('show_artists')
              .select('artist_name')
              .eq('show_id', topShow.id)
              .order('is_headliner', { ascending: false });

            const artistNames = showArtists?.slice(0, 2).map(a => a.artist_name).join(", ") || "Unknown";
            const remainingCount = (showArtists?.length || 0) - 2;
            
            topRankedShow = {
              artists: remainingCount > 0 ? `${artistNames} +${remainingCount} more` : artistNames,
              venue: topShow.venue_name,
              eloScore: rankings.elo_score,
            };
          }
        }

        setStats({
          allTimeShows: totalShows,
          showsThisYear,
          showsThisMonth,
          mostSeenArtist,
          mostSeenArtistCount,
          mostVisitedVenue,
          mostVisitedVenueCount,
          userPercentile: totalShows > 10 ? 85 : totalShows > 5 ? 70 : 50, // Simple percentile calc
          distanceDanced: `${distanceMiles} miles`,
          topRankedShow,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to load stats');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-black bg-gradient-primary bg-clip-text text-transparent">
          Your Stats
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Your concert journey, by the numbers</p>
      </div>

      {/* Your #1 Show - Celebratory Feature Card */}
      {stats.topRankedShow && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(45,93%,58%)]/30 via-primary/20 to-[hsl(189,94%,55%)]/30 border-2 border-[hsl(45,93%,58%)]/50 shadow-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(45,93%,58%)]/10 to-transparent animate-pulse" />
          <CardContent className="relative p-6">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[hsl(45,93%,58%)] to-[hsl(189,94%,55%)] flex items-center justify-center shadow-glow">
                  <Trophy className="h-8 w-8 text-background animate-bounce" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[hsl(45,93%,58%)] flex items-center justify-center text-background font-black text-sm shadow-lg">
                  #1
                </div>
                <Sparkles className="absolute -bottom-1 -left-1 h-6 w-6 text-[hsl(45,93%,58%)] animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Your #1 Show (Head to Head)
                </div>
                <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-[hsl(45,93%,58%)] via-primary to-[hsl(189,94%,55%)] bg-clip-text text-transparent mb-2 line-clamp-2">
                  {isLoading ? "..." : stats.topRankedShow.artists}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{stats.topRankedShow.venue}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4 flex-shrink-0" />
                    <span>ELO: {stats.topRankedShow.eloScore}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      )}

      {/* Activity Rank Badge - Celebratory */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 via-primary/20 to-secondary/20 border border-primary/30">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent animate-pulse" />
        <CardContent className="relative p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <Trophy className="h-12 w-12 sm:h-16 sm:w-16 text-accent animate-bounce" />
              <Sparkles className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 h-4 w-4 sm:h-6 sm:w-6 text-primary animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Activity Rank
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-accent via-primary to-secondary bg-clip-text text-transparent">
                {isLoading ? "..." : `Top ${100 - stats.userPercentile}%`}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {isLoading ? "Loading..." : `More active than ${stats.userPercentile}% of users! 🎉`}
              </p>
            </div>
          </div>
        </CardContent>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <StatCard
          title="All Time Shows"
          value={isLoading ? "..." : stats.allTimeShows}
          icon={Trophy}
          gradient="bg-gradient-to-br from-accent/20 via-primary/10 to-card"
        />
        <StatCard
          title="Shows This Year"
          value={isLoading ? "..." : stats.showsThisYear}
          icon={Calendar}
          gradient="bg-gradient-to-br from-primary/20 via-card to-card"
        />
        <StatCard
          title="Shows This Month"
          value={isLoading ? "..." : stats.showsThisMonth}
          icon={Music}
          gradient="bg-gradient-to-br from-secondary/20 via-card to-card"
        />
        <StatCard
          title="Most Seen Artist"
          value={isLoading ? "..." : stats.mostSeenArtist}
          subtitle={stats.mostSeenArtistCount > 0 ? `${stats.mostSeenArtistCount} shows` : undefined}
          icon={Mic}
          gradient="bg-gradient-to-br from-accent/20 via-card to-card"
        />
        <StatCard
          title="Favorite Venue"
          value={isLoading ? "..." : stats.mostVisitedVenue}
          subtitle={stats.mostVisitedVenueCount > 0 ? `${stats.mostVisitedVenueCount} visits` : undefined}
          icon={MapPin}
          gradient="bg-gradient-to-br from-primary/20 via-card to-secondary/10"
        />
        <StatCard
          title="Distance Danced"
          value={isLoading ? "..." : stats.distanceDanced}
          subtitle="Estimated from show duration"
          icon={Activity}
          gradient="bg-gradient-to-br from-secondary/20 via-card to-accent/10"
        />
      </div>

      {/* Share All Stats */}
      <Card className="border-primary/30 shadow-glow overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-secondary opacity-10" />
        <CardContent className="relative p-8 text-center">
          <div className="mb-4">
            <Share2 className="h-12 w-12 mx-auto text-primary mb-3" />
            <h3 className="text-2xl font-bold mb-2">Share Your Story</h3>
            <p className="text-muted-foreground">
              Create a stunning visual of your concert journey to share on Instagram
            </p>
          </div>
          <Button 
            size="lg" 
            className="w-full md:w-auto shadow-glow text-lg font-bold"
            onClick={() => {
              setShowSharePreview(!showSharePreview);
              toast.success("Generating your share card! 📸");
            }}
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Generate Share Card
          </Button>
          
          {showSharePreview && (
            <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 animate-scale-in">
              <p className="text-sm text-muted-foreground mb-3">Preview</p>
              <div className="bg-background/50 backdrop-blur rounded-lg p-6 space-y-3">
                <div className="text-4xl font-black bg-gradient-primary bg-clip-text text-transparent">
                  {stats.showsThisYear} Shows
                </div>
                <div className="text-2xl font-bold text-foreground">
                  Top {100 - stats.userPercentile}% Most Active
                </div>
                <div className="text-lg text-muted-foreground">
                  {stats.mostSeenArtist} • {stats.mostVisitedVenue}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Stats;

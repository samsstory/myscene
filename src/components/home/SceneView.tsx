import { useState, useEffect } from "react";
import { CalendarPlus, Users } from "lucide-react";
import WhatsNextStrip from "./WhatsNextStrip";
import SectionLabel from "./SectionLabel";
import PopularFeedGrid from "./PopularFeedGrid";
import EdmtrainDiscoveryFeed from "./EdmtrainDiscoveryFeed";
import FriendsGoingSection from "./FriendsGoingSection";
import InlineCityPicker from "./InlineCityPicker";
import VSHeroWidget from "./VSHeroWidget";
import StatsTrophyCard from "./StatsTrophyCard";
import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";
import { type FriendShow } from "@/hooks/useFriendUpcomingShows";
import { supabase } from "@/integrations/supabase/client";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import type { ShowTypeFilter } from "@/hooks/usePopularShows";
import { usePopularNearMe, type GeoScope } from "@/hooks/usePopularNearMe";

const EMPTY_ARTISTS: { name: string; imageUrl: string | null }[] = [];
const defaultEdmtrainHandler = (event: EdmtrainEvent) => {
  console.log("Add to schedule:", event);
};
const NOOP = () => {};

interface StatsForCard {
  allTimeShows: number;
  topGenre: string | null;
  uniqueVenues: number;
  uniqueArtists: number;
  uniqueCities: number;
  uniqueCountries: number;
  milesDanced: number | null;
  topArtists: { name: string; imageUrl: string | null }[];
  totalUsers: number;
}

interface SceneViewProps {
  onPlanShow: () => void;
  onNavigateToFriends?: () => void;
  onNavigateToRank?: () => void;
  onAddShow?: () => void;
  onQuickAdd: (item: any) => void;
  onAddEdmtrainToSchedule?: (event: EdmtrainEvent, rsvpStatus?: string) => void;
  userArtistNames?: string[];
  friendShows?: FriendShow[];
  onAddFriendShowToSchedule?: (show: FriendShow) => void;
  onFriendShowTap?: (show: FriendShow) => void;
  hasNoUpcoming?: boolean;
  hasNoFollowing?: boolean;
  upcomingShows?: UpcomingShow[];
  stats?: StatsForCard;
  statsLoading?: boolean;
}

export default function SceneView({
  onPlanShow,
  onNavigateToFriends,
  onNavigateToRank,
  onAddShow,
  onQuickAdd,
  onAddEdmtrainToSchedule,
  userArtistNames = [],
  friendShows = [],
  onAddFriendShowToSchedule,
  onFriendShowTap,
  hasNoUpcoming = false,
  hasNoFollowing = false,
  upcomingShows = [],
  stats,
  statsLoading = false,
}: SceneViewProps) {
  // Home city from profile (for display & reset)
  const [homeCity, setHomeCity] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("home_city").eq("id", user.id).single().then(({ data }) => {
        if (data?.home_city) setHomeCity(data.home_city);
      });
    });
  }, []);

  // Temporary city override (session-only)
  const [cityOverride, setCityOverride] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const displayCity = cityOverride?.name || homeCity;

  const isColdStart = hasNoUpcoming && hasNoFollowing;

  return (
    <div className="space-y-6">
      {/* Stats Trophy Card — always at the top */}
      <StatsTrophyCard
        totalShows={stats?.allTimeShows ?? 0}
        topGenre={stats?.topGenre ?? null}
        uniqueVenues={stats?.uniqueVenues ?? 0}
        uniqueArtists={stats?.uniqueArtists ?? 0}
        uniqueCities={stats?.uniqueCities ?? 0}
        uniqueCountries={stats?.uniqueCountries ?? 0}
        milesDanced={stats?.milesDanced ?? null}
        topArtists={stats?.topArtists ?? EMPTY_ARTISTS}
        isLoading={statsLoading}
        onAddShow={onAddShow}
        totalUsers={stats?.totalUsers}
      />

      {/* VS Hero Widget — below stats */}
      <VSHeroWidget onNavigateToRank={onNavigateToRank} onAddShow={onAddShow} />

      {isColdStart ? (
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">Welcome to Scene ✦</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Start by planning a show or finding friends who share your taste.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onPlanShow}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
            >
              <CalendarPlus className="h-4 w-4" />
              Plan your first show
            </button>
            <button
              onClick={onNavigateToFriends}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.10] text-foreground/80 text-sm font-medium hover:bg-white/[0.10] transition-colors"
            >
              <Users className="h-4 w-4" />
              Find friends
            </button>
          </div>
        </section>
      ) : (
        <>
          <WhatsNextStrip
            onPlanShow={onPlanShow}
            userArtistNames={userArtistNames}
            onAddEdmtrainToSchedule={onAddEdmtrainToSchedule}
          />

          {friendShows.length > 0 && (
            <section className="space-y-2">
              <SectionLabel>Friends Going</SectionLabel>
              <FriendsGoingSection
                friendShows={friendShows}
                onAddToSchedule={onAddFriendShowToSchedule ?? NOOP}
                onShowTap={onFriendShowTap}
              />
            </section>
          )}
        </>
      )}

      {/* Section 3: Personalized recommendations with city toggle */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
           <SectionLabel>Upcoming Near You</SectionLabel>
          {displayCity && (
            <InlineCityPicker
              currentCity={displayCity}
              onCityChange={(city) => setCityOverride(city)}
            />
          )}
        </div>
        <EdmtrainDiscoveryFeed
          onAddToSchedule={onAddEdmtrainToSchedule || defaultEdmtrainHandler}
          matchedArtistNames={userArtistNames}
          overrideLat={cityOverride?.lat}
          overrideLng={cityOverride?.lng}
          overrideCity={cityOverride?.name}
          upcomingShows={upcomingShows}
        />
      </section>

      <TopRatedSection onQuickAdd={onQuickAdd} />
    </div>
  );
}

/** Self-contained leaderboard with its own data fetching + filter state */
function TopRatedSection({ onQuickAdd }: { onQuickAdd: (item: any) => void }) {
  const [showType, setShowType] = useState<ShowTypeFilter>("set");
  const [geoScope, setGeoScope] = useState<GeoScope>("city");
  const [cityOverride, setCityOverride] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const { items, totalUsers, isLoading, hasLocation, cityName, countryName } = usePopularNearMe(
    true, showType, geoScope,
    cityOverride?.lat, cityOverride?.lng, cityOverride?.name,
  );

  return (
    <PopularFeedGrid
      items={items}
      totalUsers={totalUsers}
      isLoading={isLoading}
      showType={showType}
      onShowTypeChange={setShowType}
      onQuickAdd={onQuickAdd}
      geoScope={geoScope}
      onGeoScopeChange={setGeoScope}
      cityName={cityOverride?.name || cityName}
      countryName={countryName}
      onCityOverride={setCityOverride}
      emptyMessage={hasLocation === false ? "Set your home city in your profile to see what's trending near you." : undefined}
    />
  );
}

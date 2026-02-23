import { useState, useEffect } from "react";
import { CalendarPlus, Users } from "lucide-react";
import WhatsNextStrip from "./WhatsNextStrip";
import PopularFeedGrid from "./PopularFeedGrid";
import EdmtrainDiscoveryFeed from "./EdmtrainDiscoveryFeed";
import FriendsGoingSection from "./FriendsGoingSection";
import InlineCityPicker from "./InlineCityPicker";
import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";
import { type FriendShow } from "@/hooks/useFriendUpcomingShows";
import { supabase } from "@/integrations/supabase/client";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";

interface SceneViewProps {
  onPlanShow: () => void;
  onLogShow?: () => void;
  onNavigateToFriends?: () => void;
  nearMeItems: Parameters<typeof PopularFeedGrid>[0]["items"];
  nearMeTotalUsers: number;
  nearMeLoading: boolean;
  nearMeHasLocation?: boolean;
  onQuickAdd: (item: any) => void;
  onAddEdmtrainToSchedule?: (event: EdmtrainEvent, rsvpStatus?: string) => void;
  userArtistNames?: string[];
  friendShows?: FriendShow[];
  onAddFriendShowToSchedule?: (show: FriendShow) => void;
  onFriendShowTap?: (show: FriendShow) => void;
  hasNoUpcoming?: boolean;
  hasNoFollowing?: boolean;
  upcomingShows?: UpcomingShow[];
}

export default function SceneView({
  onPlanShow,
  onLogShow,
  onNavigateToFriends,
  nearMeItems,
  nearMeTotalUsers,
  nearMeLoading,
  nearMeHasLocation,
  onQuickAdd,
  onAddEdmtrainToSchedule,
  userArtistNames = [],
  friendShows = [],
  onAddFriendShowToSchedule,
  onFriendShowTap,
  hasNoUpcoming = false,
  hasNoFollowing = false,
  upcomingShows = [],
}: SceneViewProps) {
  const defaultEdmtrainHandler = (event: EdmtrainEvent) => {
    console.log("Add to schedule:", event);
  };

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
          <WhatsNextStrip onPlanShow={onPlanShow} onLogShow={onLogShow} />

          {friendShows.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/35">
                Friends Going
              </h3>
              <FriendsGoingSection
                friendShows={friendShows}
                onAddToSchedule={onAddFriendShowToSchedule ?? (() => {})}
                onShowTap={onFriendShowTap}
              />
            </section>
          )}
        </>
      )}

      {/* Section 3: Personalized recommendations with city toggle */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/35">
            Upcoming Near You
          </h3>
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

      {/* Section 4: Popular near me */}
      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/35">
          Popular Near You
        </h3>
        <PopularFeedGrid
          items={nearMeItems}
          totalUsers={nearMeTotalUsers}
          isLoading={nearMeLoading}
          showType="set"
          onShowTypeChange={() => {}}
          onQuickAdd={onQuickAdd}
          emptyMessage={nearMeHasLocation === false ? "Set your home city in your profile to see what's popular near you." : undefined}
        />
      </section>
    </div>
  );
}

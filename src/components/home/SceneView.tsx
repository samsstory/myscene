import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { CalendarPlus, Users } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import WhatsNextStrip from "./WhatsNextStrip";
import SectionLabel from "./SectionLabel";
import PopularFeedGrid from "./PopularFeedGrid";
import EdmtrainDiscoveryFeed from "./EdmtrainDiscoveryFeed";
import FriendsGoingSection from "./FriendsGoingSection";
import InlineCityPicker from "./InlineCityPicker";
import VSHeroWidget from "./VSHeroWidget";
import StatsTrophyCard from "./StatsTrophyCard";
import SetupQuestsCard from "./SetupQuestsCard";
import HomeCityPickerSheet from "./HomeCityPickerSheet";
import PendingEmailBanner from "./PendingEmailBanner";
import EmailImportReviewSheet from "./EmailImportReviewSheet";
import { usePendingEmailImports } from "@/hooks/usePendingEmailImports";
import { useSetupQuests } from "@/hooks/useSetupQuests";
import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";
import { type FriendShow } from "@/hooks/useFriendUpcomingShows";
import { supabase } from "@/integrations/supabase/client";
import { initiateSpotifyAuth } from "@/lib/spotify-pkce";
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
  onQuickAdd: (item: unknown) => void;
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
  onSetCity?: () => void;
  onConnectSpotify?: () => void;
  onAddProfilePhoto?: () => void;
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
  const navigate = useNavigate();
  // Pending email imports
  const {
    pendingImports,
    pendingCount,
    confirmedIndices,
    confirmShow,
    confirmAll,
    dismissImport,
  } = usePendingEmailImports();
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);

  const handleOpenReview = useCallback(() => setReviewSheetOpen(true), []);

  // Setup quests
  const { quests, completedCount, totalCount, allComplete, isLoading: questsLoading, refetch: refetchQuests } = useSetupQuests();

  // Track quest completion celebration
  const wasIncomplete = useRef(true);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (!questsLoading && allComplete && wasIncomplete.current) {
      const alreadyDone = sessionStorage.getItem("scene_quests_celebrated") === "true";
      if (!alreadyDone) {
        wasIncomplete.current = false;
        setJustCompleted(true);
        sessionStorage.setItem("scene_quests_celebrated", "true");

        const end = Date.now() + 1500;
        const fire = () => {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.35 },
            colors: ["#22d3ee", "#a78bfa", "#f472b6", "#facc15", "#34d399"],
            disableForReducedMotion: true,
          });
          if (Date.now() < end) requestAnimationFrame(fire);
        };
        fire();
      }
    }
    if (!questsLoading && !allComplete) {
      wasIncomplete.current = true;
    }
  }, [questsLoading, allComplete]);

  const [cityPickerOpen, setCityPickerOpen] = useState(false);

  // Hidden file input for avatar upload (same logic as Profile.tsx)
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image"); return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be smaller than 5MB"); return; }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      await supabase.storage.from("show-photos").upload(filePath, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("show-photos").getPublicUrl(filePath);
      const urlWithBuster = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").upsert({ id: user.id, avatar_url: urlWithBuster });
      toast.success("Profile photo updated! 📸");
      refetchQuests();
    } catch {
      toast.error("Failed to upload profile picture");
    }
    // Reset input so same file can be re-selected
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }, [refetchQuests]);

  const handleQuestTap = useCallback((questId: "install_pwa" | "log_show" | "set_city" | "connect_spotify" | "add_photo") => {
    switch (questId) {
      case "install_pwa":
        navigate("/install");
        break;
      case "log_show":
        onAddShow?.();
        break;
      case "set_city":
        setCityPickerOpen(true);
        break;
      case "connect_spotify":
        initiateSpotifyAuth().catch(() => toast.error("Failed to start Spotify connection"));
        break;
      case "add_photo":
        avatarInputRef.current?.click();
        break;
    }
  }, [onAddShow, navigate]);

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
      {/* Hidden file input for avatar upload from quest */}
      <input
        ref={avatarInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Show quests card if incomplete, stats card if all done */}
      {!questsLoading && !allComplete ? (
        <SetupQuestsCard
          quests={quests}
          completedCount={completedCount}
          totalCount={totalCount}
          isLoading={questsLoading}
          onQuestTap={handleQuestTap}
        />
      ) : (
        <motion.div
          initial={justCompleted ? { scale: 0.85, opacity: 0, y: 20 } : false}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={justCompleted ? { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 } : { duration: 0 }}
          onAnimationComplete={() => { if (justCompleted) setJustCompleted(false); }}
        >
          <StatsTrophyCard
            totalShows={stats?.allTimeShows ?? 0}
            topGenre={stats?.topGenre ?? null}
            uniqueVenues={stats?.uniqueVenues ?? 0}
            uniqueArtists={stats?.uniqueArtists ?? 0}
            uniqueCities={stats?.uniqueCities ?? 0}
            uniqueCountries={stats?.uniqueCountries ?? 0}
            milesDanced={stats?.milesDanced ?? null}
            topArtists={stats?.topArtists ?? EMPTY_ARTISTS}
            isLoading={statsLoading || questsLoading}
            onAddShow={onAddShow}
            totalUsers={stats?.totalUsers}
          />
        </motion.div>
      )}

      {/* Pending Email Imports Banner */}
      <PendingEmailBanner pendingCount={pendingCount} onReview={handleOpenReview} />

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

      {/* Email Import Review Sheet */}
      <EmailImportReviewSheet
        open={reviewSheetOpen}
        onOpenChange={setReviewSheetOpen}
        imports={pendingImports}
        confirmedIndices={confirmedIndices}
        onConfirmShow={confirmShow}
        onConfirmAll={confirmAll}
        onDismiss={dismissImport}
      />

      {/* Home City Picker Sheet (from quest) */}
      <HomeCityPickerSheet
        open={cityPickerOpen}
        onOpenChange={setCityPickerOpen}
        onCitySaved={() => {
          refetchQuests();
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase.from("profiles").select("home_city").eq("id", user.id).single().then(({ data }) => {
              if (data?.home_city) setHomeCity(data.home_city);
            });
          });
        }}
      />
    </div>
  );
}

/** Self-contained leaderboard with its own data fetching + filter state */
function TopRatedSection({ onQuickAdd }: { onQuickAdd: (item: unknown) => void }) {
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

import { useState } from "react";
import { cn } from "@/lib/utils";
import WhatsNextStrip from "./WhatsNextStrip";
import FriendActivityFeed, { type IWasTherePayload } from "./FriendActivityFeed";
import PopularFeedGrid from "./PopularFeedGrid";
import EdmtrainDiscoveryFeed from "./EdmtrainDiscoveryFeed";
import { type ShowTypeFilter } from "@/hooks/usePopularShows";
import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";

interface SceneViewProps {
  onPlanShow: () => void;
  activityItems: Parameters<typeof FriendActivityFeed>[0]["items"];
  activityLoading: boolean;
  followingCount: number;
  onFindFriends: () => void;
  onIWasThere: (payload: IWasTherePayload) => void;
  nearMeItems: Parameters<typeof PopularFeedGrid>[0]["items"];
  nearMeTotalUsers: number;
  nearMeLoading: boolean;
  nearMeHasLocation?: boolean;
  exploreItems: Parameters<typeof PopularFeedGrid>[0]["items"];
  exploreTotalUsers: number;
  exploreLoading: boolean;
  onQuickAdd: (item: any) => void;
  onAddEdmtrainToSchedule?: (event: EdmtrainEvent) => void;
  userArtistNames?: string[];
}

type FeedMode = "scene" | "near-me" | "explore" | "upcoming";

export default function SceneView({
  onPlanShow,
  activityItems,
  activityLoading,
  followingCount,
  onFindFriends,
  onIWasThere,
  nearMeItems,
  nearMeTotalUsers,
  nearMeLoading,
  nearMeHasLocation,
  exploreItems,
  exploreTotalUsers,
  exploreLoading,
  onQuickAdd,
  onAddEdmtrainToSchedule,
  userArtistNames = [],
}: SceneViewProps) {
  const [feedMode, setFeedMode] = useState<FeedMode>("scene");
  const [nearMeShowType, setNearMeShowType] = useState<ShowTypeFilter>("set");
  const [exploreShowType, setExploreShowType] = useState<ShowTypeFilter>("set");

  const defaultEdmtrainHandler = (event: EdmtrainEvent) => {
    console.log("Add to schedule:", event);
  };

  return (
    <div className="space-y-5">
      <WhatsNextStrip onPlanShow={onPlanShow} />

      <div className="space-y-3">
        {/* Tab headers */}
        <div className="flex items-center gap-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {(["scene", "upcoming", "near-me", "explore"] as const).map((mode) => {
            const labels = { scene: "Scene Feed", upcoming: "Upcoming", "near-me": "Popular Near Me", explore: "Explore" };
            const isActive = feedMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setFeedMode(mode)}
                className={cn(
                  "text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors whitespace-nowrap shrink-0",
                  isActive ? "text-white/80" : "text-white/30 hover:text-white/50"
                )}
                style={isActive ? { textShadow: "0 0 8px rgba(255,255,255,0.2)" } : undefined}
              >
                {labels[mode]}
              </button>
            );
          })}
        </div>

        {feedMode === "scene" && (
          <FriendActivityFeed
            items={activityItems}
            isLoading={activityLoading}
            hasFollowing={followingCount > 0}
            onFindFriends={onFindFriends}
            onIWasThere={onIWasThere}
          />
        )}
        {feedMode === "upcoming" && (
          <EdmtrainDiscoveryFeed
            onAddToSchedule={onAddEdmtrainToSchedule || defaultEdmtrainHandler}
            matchedArtistNames={userArtistNames}
          />
        )}
        {feedMode === "near-me" && (
          <PopularFeedGrid
            items={nearMeItems}
            totalUsers={nearMeTotalUsers}
            isLoading={nearMeLoading}
            showType={nearMeShowType}
            onShowTypeChange={setNearMeShowType}
            onQuickAdd={onQuickAdd}
            onFindFriends={onFindFriends}
            emptyMessage={nearMeHasLocation === false ? "Set your home city in your profile to see what's popular near you." : undefined}
          />
        )}
        {feedMode === "explore" && (
          <PopularFeedGrid
            items={exploreItems}
            totalUsers={exploreTotalUsers}
            isLoading={exploreLoading}
            showType={exploreShowType}
            onShowTypeChange={setExploreShowType}
            onQuickAdd={onQuickAdd}
            onFindFriends={onFindFriends}
          />
        )}
      </div>
    </div>
  );
}

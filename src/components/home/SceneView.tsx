import WhatsNextStrip from "./WhatsNextStrip";
import PopularFeedGrid from "./PopularFeedGrid";
import EdmtrainDiscoveryFeed from "./EdmtrainDiscoveryFeed";
import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";

interface SceneViewProps {
  onPlanShow: () => void;
  nearMeItems: Parameters<typeof PopularFeedGrid>[0]["items"];
  nearMeTotalUsers: number;
  nearMeLoading: boolean;
  nearMeHasLocation?: boolean;
  onQuickAdd: (item: any) => void;
  onAddEdmtrainToSchedule?: (event: EdmtrainEvent) => void;
  userArtistNames?: string[];
}

export default function SceneView({
  onPlanShow,
  nearMeItems,
  nearMeTotalUsers,
  nearMeLoading,
  nearMeHasLocation,
  onQuickAdd,
  onAddEdmtrainToSchedule,
  userArtistNames = [],
}: SceneViewProps) {
  const defaultEdmtrainHandler = (event: EdmtrainEvent) => {
    console.log("Add to schedule:", event);
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Upcoming shows */}
      <WhatsNextStrip onPlanShow={onPlanShow} />

      {/* Section 2: Personalized recommendations */}
      <section className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/35">
          Upcoming Near You
        </h3>
        <EdmtrainDiscoveryFeed
          onAddToSchedule={onAddEdmtrainToSchedule || defaultEdmtrainHandler}
          matchedArtistNames={userArtistNames}
        />
      </section>

      {/* Section 3: Popular near me */}
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

import { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import LandingHeroV2 from "@/components/landing/v2/LandingHeroV2";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import ShowInviteHero from "@/components/landing/ShowInviteHero";
import LazyGlobeShowcase from "@/components/landing/v2/LazyGlobeShowcase";

const LogShowcaseV2 = lazy(() => import("@/components/landing/v2/LogShowcaseV2"));
const CaptureShowcaseV2 = lazy(() => import("@/components/landing/v2/CaptureShowcaseV2"));
const RankingSpotlightV2 = lazy(() => import("@/components/landing/v2/RankingSpotlightV2"));
const ShareExperienceV2 = lazy(() => import("@/components/landing/v2/ShareExperienceV2"));
const LandingCTAV2 = lazy(() => import("@/components/landing/v2/LandingCTAV2"));

const IndexV2 = () => {
  useReferralCapture();

  const [searchParams] = useSearchParams();
  const showId = searchParams.get("show");
  const showType = (searchParams.get("type") as "logged" | "upcoming") ?? "logged";
  const refCode = searchParams.get("ref") ?? undefined;

  // If this is an invite link, show ONLY the invite page
  if (showId) {
    return (
      <div className="min-h-screen bg-background">
        <ShowInviteHero showId={showId} showType={showType} refCode={refCode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingHeroV2 />
      <Suspense fallback={<div className="py-24 md:py-32" />}>
        {/* content-visibility: auto skips layout/paint for off-screen sections,
            improving Speed Index by keeping initial paint focused on the hero */}
        <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" }}>
          <LogShowcaseV2 />
        </div>
        <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" }}>
          <CaptureShowcaseV2 />
        </div>
        <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" }}>
          <RankingSpotlightV2 />
        </div>
        <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" }}>
          <ShareExperienceV2 />
        </div>
        <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 700px" }}>
          <LazyGlobeShowcase />
        </div>
        <div style={{ contentVisibility: "auto", containIntrinsicSize: "0 400px" }}>
          <LandingCTAV2 />
        </div>
      </Suspense>
    </div>
  );

};

export default IndexV2;

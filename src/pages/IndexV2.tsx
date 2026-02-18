import { useSearchParams } from "react-router-dom";
import LandingHeroV2 from "@/components/landing/v2/LandingHeroV2";
import LogShowcaseV2 from "@/components/landing/v2/LogShowcaseV2";
import CaptureShowcaseV2 from "@/components/landing/v2/CaptureShowcaseV2";
import RankingSpotlightV2 from "@/components/landing/v2/RankingSpotlightV2";
import ShareExperienceV2 from "@/components/landing/v2/ShareExperienceV2";
import GlobeShowcaseV2 from "@/components/landing/v2/GlobeShowcaseV2";
import LandingCTAV2 from "@/components/landing/v2/LandingCTAV2";
import { useReferralCapture } from "@/hooks/useReferralCapture";
import ShowInviteHero from "@/components/landing/ShowInviteHero";

const IndexV2 = () => {
  // Capture referral code from URL if present
  useReferralCapture();

  const [searchParams] = useSearchParams();
  const showId = searchParams.get("show");
  const showType = (searchParams.get("type") as "logged" | "upcoming") ?? "logged";
  const refCode = searchParams.get("ref") ?? undefined;

  return (
    <div className="min-h-screen bg-background">
      {showId && (
        <ShowInviteHero showId={showId} showType={showType} refCode={refCode} />
      )}
      <LandingHeroV2 />
      <LogShowcaseV2 />
      <CaptureShowcaseV2 />
      <RankingSpotlightV2 />
      <ShareExperienceV2 />
      <GlobeShowcaseV2 />
      <LandingCTAV2 />
    </div>
  );
};

export default IndexV2;

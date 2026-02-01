import LandingHeroV2 from "@/components/landing/v2/LandingHeroV2";
import LogShowcaseV2 from "@/components/landing/v2/LogShowcaseV2";
import CaptureShowcaseV2 from "@/components/landing/v2/CaptureShowcaseV2";
import RankingSpotlightV2 from "@/components/landing/v2/RankingSpotlightV2";
import ShareExperienceV2 from "@/components/landing/v2/ShareExperienceV2";
import GlobeShowcaseV2 from "@/components/landing/v2/GlobeShowcaseV2";
import LandingCTAV2 from "@/components/landing/v2/LandingCTAV2";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const IndexV2 = () => {
  // Capture referral code from URL if present
  useReferralCapture();

  return (
    <div className="min-h-screen bg-background">
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

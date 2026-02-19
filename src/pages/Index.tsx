import { lazy, Suspense } from "react";
import LandingHero from "@/components/landing/LandingHero";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const LogShowcase = lazy(() => import("@/components/landing/LogShowcase"));
const CaptureShowcase = lazy(() => import("@/components/landing/CaptureShowcase"));
const RankingSpotlight = lazy(() => import("@/components/landing/RankingSpotlight"));
const ShareExperience = lazy(() => import("@/components/landing/ShareExperience"));
const GlobeShowcase = lazy(() => import("@/components/landing/GlobeShowcase"));
const LandingCTA = lazy(() => import("@/components/landing/LandingCTA"));

const Index = () => {
  // Capture referral code from URL if present
  useReferralCapture();

  return (
    <div className="min-h-screen bg-background">
      <main>
        <LandingHero />
        <Suspense fallback={<div className="py-24 md:py-32" />}>
          <LogShowcase />
          <CaptureShowcase />
          <RankingSpotlight />
          <ShareExperience />
          <GlobeShowcase />
          <LandingCTA />
        </Suspense>
      </main>
    </div>
  );
};

export default Index;

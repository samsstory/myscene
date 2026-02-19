import { lazy, Suspense } from "react";
import LandingHero from "@/components/landing/LandingHero";
import LogShowcase from "@/components/landing/LogShowcase";
import CaptureShowcase from "@/components/landing/CaptureShowcase";
import RankingSpotlight from "@/components/landing/RankingSpotlight";
import ShareExperience from "@/components/landing/ShareExperience";
import LandingCTA from "@/components/landing/LandingCTA";
import { useReferralCapture } from "@/hooks/useReferralCapture";

const GlobeShowcase = lazy(() => import("@/components/landing/GlobeShowcase"));

const Index = () => {
  // Capture referral code from URL if present
  useReferralCapture();

  return (
    <div className="min-h-screen bg-background">
      <main>
        <LandingHero />
        <LogShowcase />
        <CaptureShowcase />
        <RankingSpotlight />
        <ShareExperience />
        <Suspense fallback={<div className="py-24 md:py-32" />}>
          <GlobeShowcase />
        </Suspense>
        <LandingCTA />
      </main>
    </div>
  );
};

export default Index;

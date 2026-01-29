import LandingHero from "@/components/landing/LandingHero";
import CaptureShowcase from "@/components/landing/CaptureShowcase";
import RankingSpotlight from "@/components/landing/RankingSpotlight";
import ShareExperience from "@/components/landing/ShareExperience";
import GlobeShowcase from "@/components/landing/GlobeShowcase";
import LandingCTA from "@/components/landing/LandingCTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHero />
      <CaptureShowcase />
      <RankingSpotlight />
      <ShareExperience />
      <GlobeShowcase />
      <LandingCTA />
    </div>
  );
};

export default Index;

import LandingHero from "@/components/landing/LandingHero";
import CaptureShowcase from "@/components/landing/CaptureShowcase";
import RankingSpotlight from "@/components/landing/RankingSpotlight";
import ShareExperience from "@/components/landing/ShareExperience";
import LandingCTA from "@/components/landing/LandingCTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHero />
      <CaptureShowcase />
      <RankingSpotlight />
      <ShareExperience />
      <LandingCTA />
    </div>
  );
};

export default Index;

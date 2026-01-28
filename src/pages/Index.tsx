import LandingHero from "@/components/landing/LandingHero";
import ValuePillars from "@/components/landing/ValuePillars";
import RankingSpotlight from "@/components/landing/RankingSpotlight";
import ShareExperience from "@/components/landing/ShareExperience";
import LandingCTA from "@/components/landing/LandingCTA";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHero />
      <ValuePillars />
      <RankingSpotlight />
      <ShareExperience />
      <LandingCTA />
    </div>
  );
};

export default Index;

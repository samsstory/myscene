import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SceneLogo from "@/components/ui/SceneLogo";
import PhoneMockup from "./PhoneMockup";
import WaitlistSignup from "./WaitlistSignup";
import { Home, Globe, Crown, Plus } from "lucide-react";

// Collapsed card data with photo backgrounds
const collapsedCards = [{
  artist: "Odesza",
  rank: 2,
  photo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80",
  zIndex: 50,
  opacity: 90
}, {
  artist: "Mau P",
  rank: 3,
  photo: "/images/mau-p-concert.png",
  zIndex: 40,
  opacity: 80
}, {
  artist: "Post Malone",
  rank: 4,
  photo: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400&q=80",
  zIndex: 30,
  opacity: 70
}, {
  artist: "The Blaze",
  rank: 5,
  photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80",
  zIndex: 20,
  opacity: 60
}, {
  artist: "T-Pain",
  rank: 6,
  photo: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80",
  zIndex: 10,
  opacity: 50
}];

// Mock show card for the phone display
const MockShowCard = () => <div className="h-full w-full bg-gradient-accent flex flex-col">
    {/* Spacer for dynamic island */}
    <div className="h-6" />

    {/* App header - aligned below notch */}
    <div className="px-4 py-2 flex justify-between items-center">
      <SceneLogo size="sm" />
      <div className="w-6 h-6 rounded-full bg-white/10" style={{
      backgroundImage: "url('/images/scene-profile.png')",
      backgroundSize: "cover",
      backgroundPosition: "center"
    }} />
    </div>

    {/* Stacked show cards */}
    <div className="flex-1 px-3 py-1 flex flex-col min-h-0">
      {/* Card 1 - Top ranked (Expanded) - Fred again.. */}
        <div className="relative rounded-xl overflow-hidden shadow-lg z-[60]" style={{
      aspectRatio: "16/10"
    }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30" style={{
        backgroundImage: "url('/images/fred-again-msg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: "brightness(1.15) contrast(1.1)"
      }} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        
        {/* Rank badge */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full" style={{
          textShadow: "0 0 10px rgba(255,255,255,0.5)"
        }}>
            #1 All Time
          </span>
        </div>

        {/* Scene watermark */}
        <div className="absolute top-2 right-2">
          <span className="text-[7px] text-white/60 font-black tracking-widest" style={{
          textShadow: "0 0 6px rgba(255,255,255,0.3)"
        }}>
            SCENE ✦
          </span>
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          {/* White score badge */}
          <div className="inline-flex items-center justify-center bg-white/90 text-black font-bold rounded-full px-1.5 py-0.5 text-[10px] mb-1 shadow-md">
            9.2
          </div>
          <div className="text-white font-bold text-xs" style={{
          textShadow: "0 0 12px rgba(255,255,255,0.4)"
        }}>
            Fred again..
          </div>
          <div className="text-white/70 text-[9px]">Alexandra Palace · London</div>
        </div>
      </div>

      {/* Collapsed Cards Stack - each overlapping the one below */}
      {collapsedCards.map((card, index) => <div key={card.artist} className="relative mt-[-10px]" style={{
      zIndex: card.zIndex
    }}>
          <div className="relative rounded-xl overflow-hidden bg-white/[0.05] backdrop-blur-sm border border-white/[0.08]">
            {/* Photo background at 25% opacity with brightness boost */}
            <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{
          backgroundImage: `url('${card.photo}')`,
          filter: "brightness(1.2)"
        }} />
            <div className="relative py-4 px-3 flex items-center justify-between">
              <span className="font-bold text-[10px]" style={{
            color: `rgba(255, 255, 255, ${card.opacity / 100})`,
            textShadow: "0 0 8px rgba(255,255,255,0.3)"
          }}>
                {card.artist}
              </span>
              <span className="text-[8px] text-white/40">#{card.rank} All Time</span>
            </div>
          </div>
        </div>)}
    </div>

    {/* Bottom Nav - Glass Pill + FAB */}
    <div className="px-4 py-2.5 flex items-center justify-center gap-4">
      <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
        <Home className="w-4 h-4 text-primary" style={{
        filter: "drop-shadow(0 0 4px hsl(var(--primary)))"
      }} />
        <Globe className="w-4 h-4 text-white/40" />
        <Crown className="w-4 h-4 text-white/40" />
      </div>
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg" style={{
      boxShadow: "0 0 20px hsl(var(--primary) / 0.4)"
    }}>
        <Plus className="w-4 h-4 text-primary-foreground" />
      </div>
    </div>
  </div>;
const LandingHero = () => {
  const navigate = useNavigate();
  return <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{
      background: "hsl(var(--primary))"
    }} />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl opacity-15" style={{
      background: "hsl(var(--secondary))"
    }} />

      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 text-center lg:text-left order-1 relative z-10">
            <SceneLogo size="lg" className="justify-center lg:justify-start" />
            
            {/* Micro-tag */}
            
            
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight -mt-2" style={{
            textShadow: "0 0 60px rgba(255,255,255,0.15)"
          }}>
              Your love of concerts deserves more than a ticket stub.
            </h1>
            
            <p className="text-base md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
              The app to capture, review, rank, and share your favorite shows.
            </p>

            <div className="flex flex-col gap-4 justify-center lg:justify-start pt-2 relative z-20">
              <WaitlistSignup source="hero" />
              <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")} className="text-base px-6 py-5 border-white/20 text-foreground hover:bg-white/10 w-fit mx-[100px]">
                Try Live Demo
              </Button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 justify-center lg:justify-start pt-2">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-background bg-cover bg-center" style={{
                backgroundImage: "url('/images/waitlist-1.png')"
              }} />
                <div className="w-8 h-8 rounded-full border-2 border-background bg-cover bg-center" style={{
                backgroundImage: "url('/images/waitlist-2.png')"
              }} />
                <div className="w-8 h-8 rounded-full border-2 border-background bg-cover bg-center" style={{
                backgroundImage: "url('/images/waitlist-3.png')"
              }} />
              </div>
              <span className="text-sm text-muted-foreground">
                Join 1,200+ music lovers
              </span>
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center lg:justify-end order-2 mt-4 lg:mt-0">
            <PhoneMockup className="w-56 md:w-72 lg:w-80" tilt="left">
              <MockShowCard />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>;
};
export default LandingHero;
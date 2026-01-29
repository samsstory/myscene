import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Instagram, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import SceneLogo from "@/components/ui/SceneLogo";

interface WelcomeCarouselProps {
  onComplete: () => void;
}

const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

const slides = [
  {
    id: 1,
    headline: "Never forget a show",
    subtext: "Every artist, every venue, every memory — captured and collected forever as a Scene.",
    visual: "crowd",
  },
  {
    id: 2,
    headline: "Rate and rank your top moments",
    subtext: "Compare shows head-to-head to uncover your all-time favorite Scenes.",
    visual: "ranking",
  },
  {
    id: 3,
    headline: "Share and compare your stories",
    subtext: "Create beautiful share cards with friends and compare your scenes.",
    visual: "share",
  },
];

// Collapsed card data for slide 1
const collapsedCards = [
  { artist: "Odesza", rank: 2, photo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80", opacity: 90 },
  { artist: "Mau P", rank: 3, photo: "/images/mau-p-concert.png", opacity: 80 },
  { artist: "Post Malone", rank: 4, photo: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=400&q=80", opacity: 70 },
  { artist: "The Blaze", rank: 5, photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&q=80", opacity: 60 },
  { artist: "T-Pain", rank: 6, photo: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80", opacity: 50 },
];

// Slide 1: Stacked Show Cards Mockup
const StackedCardsMockup = () => (
  <div className="h-full w-full bg-background flex flex-col overflow-hidden">
    {/* App header */}
    <div className="px-4 py-3 flex justify-between items-center">
      <SceneLogo size="sm" />
      <div 
        className="w-6 h-6 rounded-full bg-white/10"
        style={{
          backgroundImage: "url('/images/scene-profile.png')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      />
    </div>

    {/* Stacked show cards */}
    <div className="flex-1 px-3 flex flex-col min-h-0">
      {/* Fred again.. expanded card */}
      <div 
        className="relative rounded-xl overflow-hidden shadow-lg"
        style={{ aspectRatio: "16/10" }}
      >
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/fred-again-msg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(1.15) contrast(1.1)"
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        
        {/* Rank badge */}
        <div className="absolute top-2 left-2">
          <span 
            className="text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full"
            style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
          >
            #1 All Time
          </span>
        </div>

        {/* Scene watermark */}
        <div className="absolute top-2 right-2">
          <span 
            className="text-[7px] text-white/60 font-black tracking-widest"
            style={{ textShadow: "0 0 6px rgba(255,255,255,0.3)" }}
          >
            SCENE ✦
          </span>
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <div className="inline-flex items-center justify-center bg-white/90 text-black font-bold rounded-full px-1.5 py-0.5 text-[10px] mb-1 shadow-md">
            9.2
          </div>
          <div 
            className="text-white font-bold text-xs"
            style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}
          >
            Fred again..
          </div>
          <div className="text-white/70 text-[9px]">Alexandra Palace · London</div>
        </div>
      </div>

      {/* Collapsed Cards Stack */}
      {collapsedCards.map((card) => (
        <div key={card.artist} className="relative mt-[-10px]">
          <div className="relative rounded-xl overflow-hidden bg-white/[0.05] backdrop-blur-sm border border-white/[0.08]">
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-25"
              style={{
                backgroundImage: `url('${card.photo}')`,
                filter: "brightness(1.2)"
              }}
            />
            <div className="relative py-3 px-3 flex items-center justify-between">
              <span 
                className="font-bold text-[10px]"
                style={{
                  color: `rgba(255, 255, 255, ${card.opacity / 100})`,
                  textShadow: "0 0 8px rgba(255,255,255,0.3)"
                }}
              >
                {card.artist}
              </span>
              <span className="text-[8px] text-white/40">#{card.rank} All Time</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Slide 2: Show Review Mockup
const ShowReviewMockup = () => (
  <div className="h-full w-full bg-background flex flex-col overflow-hidden">
    {/* Hero Photo Section */}
    <div className="relative mx-3 mt-3 rounded-xl overflow-hidden" style={{ aspectRatio: "16/10" }}>
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/rufus-du-sol-red-rocks.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      
      {/* Scene watermark */}
      <div className="absolute top-2 right-2">
        <div className="bg-black/30 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-white/10">
          <SceneLogo size="sm" />
        </div>
      </div>

      {/* Glass metadata bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md p-2 border-t border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-white font-bold text-xs">Rufus Du Sol</h3>
            <p className="text-white/70 text-[10px]">Red Rocks Amphitheatre</p>
            <p className="text-white/50 text-[9px] mt-0.5">September 14, 2024</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center justify-center bg-white/90 text-black font-bold rounded-full px-1.5 py-0.5 text-xs">
              9.4
            </div>
            <p className="text-white/50 text-[9px] mt-0.5">#1 All Time</p>
          </div>
        </div>
      </div>
    </div>

    {/* Rating Bars */}
    <div className="px-3 py-3 space-y-2">
      <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1">How it felt</p>
      {[
        { label: "Show", score: 95 },
        { label: "Sound", score: 92 },
        { label: "Lighting", score: 88 },
        { label: "Crowd", score: 90 },
        { label: "Vibe", score: 94 },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-white/60 text-[10px] w-12">{item.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{
                width: `${item.score}%`,
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))"
              }}
            />
          </div>
        </div>
      ))}
    </div>

    {/* Notes Quote */}
    <div className="px-3 pb-2">
      <div className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.06]">
        <p className="text-white/60 text-[10px] italic leading-relaxed">
          "The sunrise set was absolutely unreal. Goosebumps the entire time."
        </p>
      </div>
    </div>
  </div>
);

// Slide 3: Instagram Story Share Mockup
const StoryShareMockup = () => (
  <div className="h-full w-full relative bg-black overflow-hidden">
    {/* Full-bleed concert photo */}
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: "url('/images/jamie-xx-printworks.png')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    />
    
    {/* Gradient overlays */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
    
    {/* Instagram Story Header */}
    <div className="absolute top-4 left-3 right-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div 
            className="w-8 h-8 rounded-full border-2 border-white/60"
            style={{
              backgroundImage: "url('/images/scene-profile.png')",
              backgroundSize: "cover",
              backgroundPosition: "center"
            }}
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-black">
            <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white text-sm font-semibold">Your story</span>
          <span className="text-white/50 text-sm">3h</span>
        </div>
      </div>
      <X className="w-6 h-6 text-white/80" />
    </div>

    {/* Caption text */}
    <div 
      className="absolute top-[28%] right-[10%] text-white text-sm font-medium"
      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
    >
      <span className="text-white/90">@jamie__xx</span> speechless..
    </div>

    {/* Show info overlay */}
    <div className="absolute top-[35%] left-3 right-3">
      <div className="bg-black/20 backdrop-blur-md rounded-xl p-3 border border-white/10 transform scale-[0.7] origin-top-left">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-white text-base font-bold">Jamie xx</h3>
            <p className="text-white/70 text-xs">Printworks · London</p>
            <p className="text-white/50 text-[10px] mt-0.5">December 14, 2024</p>
          </div>
          <div className="text-right">
            <span 
              className="text-lg font-bold text-white block"
              style={{ textShadow: "0 0 12px rgba(255,255,255,0.5)" }}
            >
              #3
            </span>
            <span className="text-white/50 text-[10px]">All Time</span>
          </div>
        </div>
        
        {/* Rating bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{
                width: "91%",
                background: "linear-gradient(90deg, hsl(142 76% 45%), hsl(142 76% 55%))"
              }}
            />
          </div>
          <span className="text-white font-bold text-xs">9.1</span>
        </div>
      </div>
    </div>

    {/* Bottom Scene logo */}
    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
      <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 flex items-center justify-center">
        <SceneLogo size="sm" />
      </div>
    </div>
  </div>
);

const WelcomeCarousel = ({ onComplete }: WelcomeCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Subscribe to carousel select events
  useEffect(() => {
    if (!api) return;
    
    setCurrent(api.selectedScrollSnap());
    
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    
    api.on("select", onSelect);
    
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const handleNext = () => {
    if (current === slides.length - 1) {
      onComplete();
    } else {
      api?.scrollNext();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 animate-pulse-glow"
          style={{ background: "radial-gradient(ellipse at 20% 20%, hsl(189 94% 55% / 0.08) 0%, transparent 50%)" }} 
        />
        <div 
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 80% 80%, hsl(17 88% 60% / 0.08) 0%, transparent 50%)" }} 
        />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: noiseTexture }} 
        />
      </div>

      {/* Logo */}
      <div className="relative z-10 pt-12 px-6">
        <SceneLogo size="lg" />
      </div>

      {/* Carousel */}
      <div className="flex-1 relative z-10 flex flex-col justify-center px-6">
        <Carousel
          setApi={setApi}
          opts={{ loop: false }}
          className="w-full"
        >
          <CarouselContent className="-ml-0">
            {slides.map((slide, index) => (
              <CarouselItem key={slide.id} className="pl-0">
                <CarouselSlide 
                  slide={slide} 
                  isActive={current === index}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Pagination dots */}
        <div className="flex justify-center gap-2 mt-8">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                current === index 
                  ? "w-6 bg-primary" 
                  : "bg-white/20 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 p-6 pb-12">
        <Button 
          onClick={handleNext}
          className="w-full h-14 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {current === slides.length - 1 ? (
            "Get Started"
          ) : (
            <>
              Continue
              <ChevronRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
        
        {current < slides.length - 1 && (
          <button 
            onClick={onComplete}
            className="w-full mt-4 text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
};

interface CarouselSlideProps {
  slide: typeof slides[0];
  isActive: boolean;
}

const CarouselSlide = ({ slide, isActive }: CarouselSlideProps) => {

  return (
    <div className="flex flex-col items-center text-center px-4">
      {/* Mockup container - cropped, no phone chrome */}
      <div 
        className="w-full max-w-[280px] aspect-[4/3] mb-8 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        style={{
          boxShadow: "0 0 40px hsl(var(--primary) / 0.15), 0 25px 50px -12px rgba(0,0,0,0.5)"
        }}
      >
        {slide.visual === "crowd" && <StackedCardsMockup />}
        {slide.visual === "ranking" && <ShowReviewMockup />}
        {slide.visual === "share" && <StoryShareMockup />}
      </div>

      {/* Text content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          <h2 
            className="text-2xl font-bold mb-3"
            style={{
              textShadow: "0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1)"
            }}
          >
            {slide.headline}
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
            {slide.subtext}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default WelcomeCarousel;

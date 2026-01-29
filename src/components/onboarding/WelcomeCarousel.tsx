import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
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
    visual: "crowd", // atmospheric concert crowd
  },
  {
    id: 2,
    headline: "Rate and rank your top moments",
    subtext: "Compare shows head-to-head to uncover your all-time favorite Scenes.",
    visual: "ranking", // phone mockup showing ranking UI
  },
  {
    id: 3,
    headline: "Share and compare your stories",
    subtext: "Create beautiful share cards with friends and compare your scenes.",
    visual: "share", // share card preview with luminous glow
  },
];

const WelcomeCarousel = ({ onComplete }: WelcomeCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

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
        {/* Noise texture overlay */}
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
          <CarouselContent
            className="-ml-0"
          >
            {slides.map((slide, index) => (
              <CarouselItem key={slide.id} className="pl-0">
                <CarouselSlide 
                  slide={slide} 
                  isActive={current === index}
                  onApiChange={() => {
                    if (api) {
                      setCurrent(api.selectedScrollSnap());
                      api.on("select", () => {
                        setCurrent(api.selectedScrollSnap());
                      });
                    }
                  }}
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
  onApiChange: () => void;
}

const CarouselSlide = ({ slide, isActive, onApiChange }: CarouselSlideProps) => {
  // Trigger API change detection on mount
  useState(() => {
    onApiChange();
  });

  return (
    <div className="flex flex-col items-center text-center px-4">
      {/* Visual placeholder - will be replaced with actual images */}
      <div className="w-full aspect-[4/3] mb-8 rounded-2xl overflow-hidden relative">
        {slide.visual === "crowd" && (
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent">
            <div 
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, hsl(189 94% 55% / 0.1) 0%, hsl(17 88% 60% / 0.15) 50%, hsl(250 80% 60% / 0.1) 100%)"
              }}
            />
            {/* Silhouette hands effect */}
            <div className="absolute bottom-0 left-0 right-0 h-1/2">
              <div className="absolute inset-0 flex items-end justify-center gap-1">
                {[...Array(12)].map((_, i) => (
                  <div 
                    key={i}
                    className="bg-foreground/80 rounded-t-full"
                    style={{
                      width: `${Math.random() * 12 + 8}px`,
                      height: `${Math.random() * 60 + 40}%`,
                      opacity: 0.6 + Math.random() * 0.4,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {slide.visual === "ranking" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-80 rounded-3xl border-4 border-white/10 bg-card/50 backdrop-blur-sm overflow-hidden shadow-2xl">
              {/* Mini ranking preview */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs text-primary font-bold">1</div>
                  <div className="flex-1 h-3 bg-white/10 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-muted-foreground">2</div>
                  <div className="flex-1 h-3 bg-white/10 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs text-muted-foreground">3</div>
                  <div className="flex-1 h-3 bg-white/10 rounded" />
                </div>
              </div>
            </div>
          </div>
        )}
        
        {slide.visual === "share" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="w-56 h-72 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm overflow-hidden"
              style={{
                boxShadow: "0 0 40px hsl(189 94% 55% / 0.3), 0 0 80px hsl(189 94% 55% / 0.1)"
              }}
            >
              {/* Mini share card preview */}
              <div className="h-2/3 bg-gradient-to-br from-primary/20 to-secondary/20" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-white/20 rounded w-3/4" />
                <div className="h-2 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          </div>
        )}
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

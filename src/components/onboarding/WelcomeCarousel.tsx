import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import SceneLogo from "@/components/ui/SceneLogo";

interface WelcomeCarouselProps {
  onComplete: () => void;
  onTakeTour?: () => void;
}

const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

const HeroMockup = () => (
  <div className="w-full flex flex-col">
    {/* Quiet reveal caption */}
    <div className="text-center mb-3">
      <span className="text-[10px] tracking-wide text-white/50 font-normal">
        That show.
      </span>
    </div>

    {/* Hero #1 Card - Fred again.. */}
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        aspectRatio: "16/11",
        boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6), 0 4px 16px -4px rgba(0,0,0,0.4)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/fred-again-msg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.95) contrast(1.05)",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
      <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)" }} />

      {/* #1 badge */}
      <div className="absolute top-2.5 left-2.5 bg-white/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
        #1
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div
          className="text-white font-bold text-[15px]"
          style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}
        >
          Fred again..
        </div>
        <div className="text-white/70 text-[11px]">Alexandra Palace · London</div>
        <div className="text-white/40 text-[9px] mt-0.5">September 2023</div>
      </div>
    </div>
  </div>
);
const WelcomeCarousel = ({ onComplete, onTakeTour }: WelcomeCarouselProps) => {
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
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

      {/* Single screen content */}
      <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-6 overflow-y-auto pb-8">
        {/* Mockup container */}
        <div
          className="w-full max-w-[280px] rounded-2xl overflow-hidden border border-white/10 p-4 bg-white/[0.02]"
          style={{
            boxShadow: "0 0 40px hsl(var(--primary) / 0.15), 0 25px 50px -12px rgba(0,0,0,0.5)",
          }}
        >
          <HeroMockup />
        </div>

      {/* Text content + CTAs together */}
        <div className="mt-4 text-center">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ textShadow: "0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1)" }}
          >
            Remember every show.
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
            Scene ranks your concerts so you never forget which ones hit different.
          </p>

          <div className="mt-4 w-full max-w-xs mx-auto">
            <Button
              onClick={onComplete}
              className="w-full h-12 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Add My First Show
            </Button>

            {onTakeTour && (
              <button
                onClick={onTakeTour}
                className="w-full mt-4 text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                Take a quick tour first
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCarousel;

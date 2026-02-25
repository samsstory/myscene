import { Button } from "@/components/ui/button";
import SceneLogo from "@/components/ui/SceneLogo";
import { ListMusic } from "lucide-react";

interface WelcomeCarouselProps {
  onComplete: () => void;
  onTakeTour?: () => void;
}

const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

const MiniCard = ({ name, venue, imgSrc }: { name: string; venue: string; imgSrc?: string }) => (
  <div className="flex-1 rounded-lg overflow-hidden border border-white/10 bg-white/[0.04]">
    <div className="relative aspect-[4/3] overflow-hidden">
      {imgSrc ? (
        <img src={imgSrc} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <span className="text-2xl text-white/30">✦</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-1.5">
        <div className="text-white font-bold text-[10px] leading-tight truncate">{name}</div>
        <div className="text-white/50 text-[8px] truncate">{venue}</div>
      </div>
    </div>
  </div>
);

const HeroMockup = () => (
  <div className="w-full flex flex-col gap-2.5">
    {/* Timeline label */}
    <div className="flex items-center gap-2 px-1">
      <ListMusic className="w-3.5 h-3.5 text-primary/60" />
      <span className="text-[10px] tracking-wide text-muted-foreground/60 font-medium">
        Your concert timeline
      </span>
    </div>

    {/* Composite hero */}
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        aspectRatio: "16/11",
        boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6), 0 4px 16px -4px rgba(0,0,0,0.4)",
      }}
    >
      {/* Blurred background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/fred-again-msg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "brightness(0.6) blur(2px)",
        }}
      />
      <div className="absolute inset-0 bg-black/30" />

      {/* Friend avatars - top right */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
        <div className="flex -space-x-1.5">
          {["/images/waitlist-1.png", "/images/waitlist-2.png", "/images/waitlist-3.png"].map((src, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-full border border-white/20 bg-cover bg-center"
              style={{ backgroundImage: `url('${src}')` }}
            />
          ))}
        </div>
        <span className="text-[7px] text-white/50 font-medium">+3</span>
      </div>

      {/* Foreground: ranking compare UI */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
        <span className="text-[9px] font-semibold text-white/70 tracking-wide uppercase mb-2">
          Which was better?
        </span>
        <div className="flex gap-2 w-full max-w-[220px]">
          <MiniCard
            name="Fred again.."
            venue="Alexandra Palace"
            imgSrc="/images/fred-again-msg.png"
          />
          <MiniCard
            name="ODESZA"
            venue="Red Rocks"
            imgSrc="/images/rufus-du-sol-red-rocks.png"
          />
        </div>
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

        {/* Text content + CTAs */}
        <div className="mt-4 text-center">
          <h2
            className="text-2xl font-bold mb-2"
            style={{ textShadow: "0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1)" }}
          >
            Track, rank, and share every concert
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
            Build your concert history, power-rank your favorite sets, and see which shows your friends are hitting.
          </p>

          <div className="mt-4 w-full max-w-xs mx-auto">
            <Button
              onClick={onComplete}
              className="w-full h-12 text-lg font-semibold rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Log My First Show
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

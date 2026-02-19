import PhoneMockup from "../PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { Instagram, Home, Globe, Crown, Plus } from "lucide-react";

// Tag data structure
const tagCategories = [
  {
    label: "The Show",
    tags: [
      { text: "Didn't see that coming", selected: true },
      { text: "Played the classics", selected: false },
      { text: "Took me somewhere", selected: false },
      { text: "Mid tbh", selected: false },
    ],
  },
  {
    label: "The Moment",
    tags: [
      { text: "Got emotional", selected: true },
      { text: "Never hit for me", selected: false },
      { text: "Chills", selected: false },
      { text: "Was locked in", selected: false },
      { text: "Core memory", selected: false },
    ],
  },
  {
    label: "The Space",
    tags: [
      { text: "Sound was dialed", selected: true },
      { text: "Space to dance", selected: false },
      { text: "Lights went crazy", selected: false },
      { text: "Ubers were f**kd", selected: false },
    ],
  },
  {
    label: "The People",
    tags: [
      { text: "All time squad", selected: true },
      { text: "Crowd went off", selected: true },
      { text: "Felt connected", selected: false },
      { text: "Not the vibe", selected: false },
    ],
  },
];

// Tag component
const MemoryTag = ({ text, selected }: { text: string; selected: boolean }) => (
  <div
    className={`
      rounded-full px-2 py-0.5 text-[8px] transition-all
      ${
        selected
          ? "text-white/80 border border-primary/40 scale-[1.02]"
          : "bg-white/[0.03] border border-white/[0.08] text-white/50"
      }
    `}
    style={
      selected
        ? {
            background: "linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--secondary) / 0.2))",
            boxShadow: "0 0 8px hsl(var(--primary) / 0.3)",
          }
        : undefined
    }
  >
    {text}
  </div>
);

// Show Review Sheet Mockup - Tag-Based Memory Capture
const ShowReviewMockup = () => (
  <div className="h-full w-full bg-background flex flex-col">
    {/* Spacer for dynamic island */}
    <div className="h-6" />

    {/* 16:10 Hero Photo Section - positioned below notch */}
    <div
      className="relative mx-3 rounded-xl overflow-hidden"
      style={{ aspectRatio: "16/10" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/rufus-du-sol-red-rocks-mobile.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Load full-res on larger screens via a hidden img for browser hint */}
        <img
          src="/images/rufus-du-sol-red-rocks.webp"
          aria-hidden="true"
          alt=""
          loading="lazy"
          className="hidden lg:block"
          style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

      {/* Scene watermark - positioned below notch area */}
      <div className="absolute top-2 right-2">
        <div className="bg-black/30 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-white/10">
          <SceneLogo size="sm" />
        </div>
      </div>

      {/* Glass metadata bar at bottom of photo - NO score, NO rank */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md p-2 border-t border-white/10">
        <div>
          <h3 className="text-white font-bold text-xs">Rufus Du Sol</h3>
          <p className="text-white/70 text-[10px]">Red Rocks Amphitheatre</p>
          <p className="text-white/50 text-[9px] mt-0.5">September 14, 2024</p>
        </div>
      </div>
    </div>

    {/* Section Header - Friendly, conversational */}
    <div className="px-3 pt-3 pb-1">
      <p className="text-white/60 text-[10px] font-normal">What stood out?</p>
      <p className="text-white/60 text-[8px]">Pick what made the night.</p>
    </div>

    {/* Tag Categories */}
    <div className="px-3 py-1 space-y-1.5">
      {tagCategories.map((category) => (
        <div key={category.label}>
          {/* Subtle category label */}
          <p className="text-white/55 text-[8px] uppercase tracking-wider mb-0.5">
            {category.label}
          </p>
          {/* Tag grid */}
          <div className="flex flex-wrap gap-1">
            {category.tags.map((tag) => (
              <MemoryTag key={tag.text} text={tag.text} selected={tag.selected} />
            ))}
          </div>
        </div>
      ))}
    </div>

    {/* Freeform Note - Reframed */}
    <div className="px-3 py-2">
      <div className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.06]">
        <p className="text-white/60 text-[8px] mb-0.5">My take (optional)</p>
        <p className="text-white/60 text-[10px] leading-relaxed">
          The sunrise set was unreal.
        </p>
      </div>
    </div>

    {/* Primary CTA only */}
    <div className="px-3 pb-3">
      <button
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-[10px] font-medium"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
        }}
      >
        <span>Save this memory</span>
      </button>
    </div>
  </div>
);

const CaptureShowcaseV2 = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute top-1/3 -left-32 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Phone Mockup */}
          <div className="flex justify-center order-2 lg:order-1">
            <PhoneMockup className="w-64 md:w-72 lg:w-80">
              <ShowReviewMockup />
            </PhoneMockup>
          </div>

          {/* Right: Copy - V2 COPY SECTION */}
          <div className="space-y-6 text-center lg:text-left order-1 lg:order-2">
            <h2
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
              style={{ textShadow: "0 0 50px rgba(255,255,255,0.1)" }}
            >
              Capture what stood out
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Tap what made the night, or didn't.
            </p>
            {/* END V2 COPY */}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CaptureShowcaseV2;

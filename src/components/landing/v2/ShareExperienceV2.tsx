import PhoneMockup from "../PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { X, Plus } from "lucide-react";

// Story overlay mockup
const StoryMockup = () => <div className="h-full w-full relative bg-black">
    {/* Full-bleed concert photo */}
    <div className="absolute inset-0" style={{
    backgroundImage: "url('/images/jamie-xx-printworks.png')",
    backgroundSize: "cover",
    backgroundPosition: "center"
  }} />
    
    {/* Gradient overlays */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
    
    {/* Instagram Story Header - "Your story" - moved down to avoid dynamic island */}
    <div className="absolute top-8 left-3 right-3 flex items-center justify-between">
      {/* Profile photo and text */}
      <div className="flex items-center gap-2">
        {/* Profile photo with + badge */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full border-2 border-white/60" style={{
          backgroundImage: "url('/images/scene-profile.png')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }} />
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border border-black">
            <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-white text-sm font-semibold">Your story</span>
          <span className="text-white/50 text-sm">3h</span>
        </div>
      </div>
      
      {/* Close button */}
      <X className="w-6 h-6 text-white/80" />
    </div>

    {/* Bottom center: Scene logo - properly centered */}
    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
      <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 flex items-center justify-center">
        <SceneLogo size="sm" />
      </div>
    </div>

    {/* Instagram story text caption */}
    <div className="absolute top-[28%] right-[10%] text-white text-sm font-medium" style={{
    textShadow: "0 1px 3px rgba(0,0,0,0.8)"
  }}>
      <a href="https://www.instagram.com/jamie___xx" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:underline">@jamie__xx</a> speechless..
    </div>

    {/* Show info overlay - emotional memory style */}
    <div className="absolute top-[35%] left-3 right-3">
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10 transform scale-[0.75] origin-top-left">
        {/* Artist & Venue - stamped on the moment */}
        <h3 className="text-white text-lg font-bold tracking-tight" style={{
          textShadow: "0 2px 8px rgba(0,0,0,0.5)"
        }}>Jamie xx</h3>
        <p className="text-white/80 text-xs mt-0.5">Printworks · London</p>
        <p className="text-white/50 text-[10px] mt-0.5">December 14, 2024</p>
        
        {/* Emotional tags - memory signals */}
        <div className="flex gap-1.5 mt-2.5">
          <span className="px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-[9px] text-white/90 border border-white/10">
            Got emotional
          </span>
          <span className="px-2 py-0.5 bg-white/15 backdrop-blur-sm rounded-full text-[9px] text-white/90 border border-white/10">
            Took me somewhere
          </span>
        </div>
        
        {/* Optional personal note */}
        <p className="text-white/60 text-[10px] italic mt-2" style={{
          textShadow: "0 1px 3px rgba(0,0,0,0.5)"
        }}>
          "I didn't know that was possible with sound"
        </p>
      </div>
    </div>
  </div>;

const ShareExperienceV2 = () => {
  return <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full blur-3xl opacity-10" style={{
      background: "hsl(var(--secondary))"
    }} />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy - V2 COPY SECTION */}
          <div className="space-y-6 text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground" style={{
            textShadow: "0 0 50px rgba(255,255,255,0.1)"
          }}>
              Share the nights that meant something
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Post your concert memories with one tap — beautifully styled for sharing
            </p>
            {/* END V2 COPY */}
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center">
            <PhoneMockup className="w-64 md:w-72 lg:w-80">
              <StoryMockup />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>;
};
export default ShareExperienceV2;

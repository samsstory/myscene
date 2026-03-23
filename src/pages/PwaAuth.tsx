import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import SceneLogo from "@/components/ui/SceneLogo";

const PwaAuth = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Full-bleed background image */}
      <div className="absolute inset-0">
        <img
          src="/images/fred-again-msg-mobile.webp"
          alt="Concert crowd with stage lights"
          className="w-full h-full object-cover"
        />
        {/* Top gradient — fully black at 15% from top, fades to transparent at 50% so bottom half is vivid */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to bottom, hsl(var(--background)) 15%, hsl(var(--background) / 0.6) 35%, transparent 50%)"
          }}
        />
        {/* Bottom gradient — subtle fade for button area only */}
        <div
          className="absolute inset-x-0 bottom-0 h-32"
          style={{
            background: "linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)"
          }}
        />
      </div>

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo + tagline pinned to upper third */}
        <div className="pt-[22vh] flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SceneLogo size="lg" className="text-2xl" />
          </motion.div>
          <motion.p
            className="text-center text-muted-foreground text-sm mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Every concert you've ever Scene
          </motion.p>
        </div>

        <div className="flex-1" />

        {/* Bottom CTA area */}
        <motion.div
          className="flex-shrink-0 px-6 pb-10 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Button
            onClick={() => navigate("/auth")}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-colors"
          >
            Log In
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            New to Scene?{" "}
            <button
              onClick={() => navigate("/auth?tab=signup")}
              className="text-white font-medium hover:underline transition-colors"
            >
              Sign Up
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default PwaAuth;

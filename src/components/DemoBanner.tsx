import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface DemoBannerProps {
  className?: string;
}

const DemoBanner = ({ className }: DemoBannerProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 2, duration: 0.5, type: "spring" }}
      className={`fixed bottom-0 left-0 right-0 z-[60] ${className}`}
    >
      <div className="bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-12 pb-6 px-4">
        <div className="max-w-md mx-auto">
          <div className="backdrop-blur-xl bg-white/[0.08] border border-white/20 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 
                  className="text-base font-semibold text-white/90 mb-0.5"
                  style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}
                >
                  Start Your Collection
                </h3>
                <p className="text-sm text-white/60">
                  Create an account to log your own shows
                </p>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                size="sm"
                className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4"
              >
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DemoBanner;

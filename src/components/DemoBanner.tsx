import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
interface DemoBannerProps {
  className?: string;
}
const DemoBanner = ({
  className
}: DemoBannerProps) => {
  const navigate = useNavigate();
  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 2, duration: 0.5, type: "spring" }}
      className={`fixed bottom-[14.5%] left-0 right-0 z-50 flex justify-center px-4 ${className}`}
    >
      <div className="backdrop-blur-xl bg-white/[0.08] border border-white/20 px-4 py-2 shadow-2xl rounded-2xl max-w-sm">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white/90">
              Start Your Collection
            </h3>
            <p className="text-xs text-white/60">
              Create an account to log your own shows
            </p>
          </div>
          <Button 
            onClick={() => navigate("/auth")} 
            size="sm" 
            className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3 text-xs"
          >
            Sign Up
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
export default DemoBanner;
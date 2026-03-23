import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import SceneLogo from "@/components/ui/SceneLogo";

const PwaAuth = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Top section with logo */}
      <div className="flex-shrink-0 pt-16 pb-4 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SceneLogo size="lg" className="text-2xl" />
        </motion.div>
      </div>

      {/* Concert image */}
      <motion.div
        className="flex-1 relative overflow-hidden mx-4 rounded-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        <img
          src="/images/concert-crowd.jpg"
          alt="Concert crowd with stage lights"
          className="w-full h-full object-cover"
        />
        {/* Bottom gradient fade */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </motion.div>

      {/* Bottom section */}
      <motion.div
        className="flex-shrink-0 px-6 pb-10 pt-6 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <p className="text-center text-muted-foreground text-sm">
          Track, rank, and share every concert
        </p>

        <Button
          onClick={() => navigate("/auth")}
          className="w-full h-12 rounded-full bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90 transition-colors"
        >
          Log In
        </Button>

        <button
          onClick={() => navigate("/auth?tab=signup")}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Create an account
        </button>
      </motion.div>
    </div>
  );
};

export default PwaAuth;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import SceneLogo from "@/components/ui/SceneLogo";

const PwaSplash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/pwa-auth", { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <motion.div
      className="fixed inset-0 bg-background flex items-center justify-center"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Cyan glow behind logo */}
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl opacity-20 animate-pulse"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)), transparent 70%)",
          animationDuration: "3s",
        }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <SceneLogo size="lg" className="text-3xl" />
      </motion.div>
    </motion.div>
  );
};

export default PwaSplash;

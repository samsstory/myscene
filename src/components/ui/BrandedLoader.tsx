import SceneLogo from "./SceneLogo";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandedLoaderProps {
  className?: string;
  showQuote?: boolean;
  fullScreen?: boolean;
  showReassurance?: boolean;
}

const FALLBACK_QUOTE = {
  text: "Very often a change of self is needed more than a change of scene.",
  author: "Arthur Christopher Benson",
};

const BrandedLoader = ({ className, showQuote = true, fullScreen = false, showReassurance = false }: BrandedLoaderProps) => {
  const [quote, setQuote] = useState(FALLBACK_QUOTE);

  useEffect(() => {
    if (!showQuote) return;

    let cancelled = false;

    const fetchRandomQuote = async () => {
      try {
        const { data } = await supabase
          .from("loading_quotes")
          .select("text, author")
          .eq("is_active", true)
          .order("created_at", { ascending: true });

        if (!cancelled && data && data.length > 0) {
          // Round-robin: track last index to rotate evenly
          const lastIndex = parseInt(localStorage.getItem("scene-quote-index") ?? "-1", 10);
          const nextIndex = (lastIndex + 1) % data.length;
          localStorage.setItem("scene-quote-index", String(nextIndex));
          setQuote({ text: data[nextIndex].text, author: data[nextIndex].author });
        }
      } catch {
        // Keep fallback
      }
    };

    fetchRandomQuote();
    return () => { cancelled = true; };
  }, [showQuote]);

  const content = (
    <div className={cn("text-center", className)}>
      <div className="animate-pulse mb-6">
        <SceneLogo size="lg" className="text-2xl" />
      </div>
      {showQuote && (
        <p className="text-muted-foreground text-sm italic max-w-xs mx-auto leading-relaxed">
          "{quote.text}"
          <span className="block mt-1 text-xs not-italic opacity-70">— {quote.author}</span>
        </p>
      )}
      <AnimatePresence>
        {showReassurance && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-4 text-xs text-muted-foreground/70"
          >
            Still loading…
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gradient-accent flex items-center justify-center px-8">
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-8">
      {content}
    </div>
  );
};

export default BrandedLoader;

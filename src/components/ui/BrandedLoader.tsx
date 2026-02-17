import SceneLogo from "./SceneLogo";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandedLoaderProps {
  className?: string;
  showQuote?: boolean;
  fullScreen?: boolean;
  showReassurance?: boolean;
  /** Called when the quote becomes visible — parent should activate a hold */
  onQuoteVisible?: () => void;
  /** Called when the quote has been readable long enough to dismiss */
  onReadyToDismiss?: () => void;
}

const FALLBACK_QUOTE = {
  text: "Very often a change of self is needed more than a change of scene.",
  author: "Arthur Christopher Benson",
};

const DEFAULT_QUOTE_DELAY_MS = 800;
const DEFAULT_MIN_QUOTE_DISPLAY_MS = 1500;

const BrandedLoader = ({ className, showQuote = true, fullScreen = false, showReassurance = false, onQuoteVisible, onReadyToDismiss }: BrandedLoaderProps) => {
  const [quote, setQuote] = useState(FALLBACK_QUOTE);
  const [quoteVisible, setQuoteVisible] = useState(false);
  const quoteShownAtRef = useRef<number | null>(null);
  const onReadyRef = useRef(onReadyToDismiss);
  onReadyRef.current = onReadyToDismiss;
  const onVisibleRef = useRef(onQuoteVisible);
  onVisibleRef.current = onQuoteVisible;
  const timingRef = useRef({ delay: DEFAULT_QUOTE_DELAY_MS, minDisplay: DEFAULT_MIN_QUOTE_DISPLAY_MS });

  useEffect(() => {
    if (!showQuote) return;

    let cancelled = false;

    const init = async () => {
      // Fetch timing settings and quotes in parallel
      const [settingsRes, quotesRes] = await Promise.all([
        supabase.from("app_settings").select("key, value").in("key", ["quote_delay_ms", "quote_min_display_ms"]),
        supabase.from("loading_quotes").select("text, author").eq("is_active", true).order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;

      // Apply settings
      if (settingsRes.data) {
        for (const row of settingsRes.data) {
          if (row.key === "quote_delay_ms") timingRef.current.delay = Number(row.value);
          if (row.key === "quote_min_display_ms") timingRef.current.minDisplay = Number(row.value);
        }
      }

      // Apply quote
      const data = quotesRes.data;
      if (data && data.length > 0) {
        const lastIndex = parseInt(localStorage.getItem("scene-quote-index") ?? "-1", 10);
        const nextIndex = (lastIndex + 1) % data.length;
        localStorage.setItem("scene-quote-index", String(nextIndex));
        setQuote({ text: data[nextIndex].text, author: data[nextIndex].author });
      }

      // Schedule quote reveal using DB-driven delay
      setTimeout(() => {
        if (!cancelled) {
          setQuoteVisible(true);
          quoteShownAtRef.current = Date.now();
          onVisibleRef.current?.();
        }
      }, timingRef.current.delay);
    };

    init().catch(() => {});
    return () => { cancelled = true; };
  }, [showQuote]);

  // Expose a "safe to dismiss" signal once the quote has been visible long enough
  useEffect(() => {
    if (!quoteVisible || !onReadyRef.current) return;
    const timer = setTimeout(() => {
      onReadyRef.current?.();
    }, timingRef.current.minDisplay);
    return () => clearTimeout(timer);
  }, [quoteVisible]);

  const content = (
    <div className={cn("text-center", className)}>
      <div className="animate-pulse mb-6">
        <SceneLogo size="lg" className="text-2xl" />
      </div>
      <AnimatePresence>
        {showQuote && quoteVisible && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-muted-foreground text-sm italic max-w-xs mx-auto leading-relaxed"
          >
            "{quote.text}"
            <span className="block mt-1 text-xs not-italic opacity-70">— {quote.author}</span>
          </motion.p>
        )}
      </AnimatePresence>
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

import { useState, useEffect, useRef, useCallback } from "react";

interface SlowLoadState {
  showReassurance: boolean;
  showPrompt: boolean;
  elapsedMs: number;
  dismiss: () => void;
}

const TIER_1_MS = 2000;
const TIER_2_MS = 3500;

export const useSlowLoadDetector = (loading: boolean): SlowLoadState => {
  const [showReassurance, setShowReassurance] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef(Date.now());
  const dismissedRef = useRef(false);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setShowPrompt(false);
    setShowReassurance(false);
  }, []);

  useEffect(() => {
    if (!loading) {
      // Page loaded — clear everything
      setShowReassurance(false);
      setShowPrompt(false);
      return;
    }

    dismissedRef.current = false;
    startRef.current = Date.now();

    const t1 = setTimeout(() => {
      if (!dismissedRef.current) setShowReassurance(true);
    }, TIER_1_MS);

    const t2 = setTimeout(() => {
      if (!dismissedRef.current) {
        setElapsedMs(Date.now() - startRef.current);
        setShowPrompt(true);
      }
    }, TIER_2_MS);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  return { showReassurance, showPrompt, elapsedMs, dismiss };
};

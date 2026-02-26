import { useState, useEffect } from "react";

/**
 * Rotates through indices 0…length-1 on a timer.
 * Starts after `delayMs`, then advances every `intervalMs`.
 * Returns 0 and stays idle when length <= 1.
 */
export function useRotatingIndex(
  length: number,
  intervalMs = 8000,
  delayMs = 2000
): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (length <= 1) {
      setIndex(0);
      return;
    }
    setIndex(0);

    let cleanupRef: (() => void) | null = null;

    const timeout = setTimeout(() => {
      setIndex((prev) => (prev + 1) % length);
      const interval = setInterval(() => {
        setIndex((prev) => (prev + 1) % length);
      }, intervalMs);
      cleanupRef = () => clearInterval(interval);
    }, delayMs);

    return () => {
      clearTimeout(timeout);
      cleanupRef?.();
    };
  }, [length, intervalMs, delayMs]);

  return index;
}

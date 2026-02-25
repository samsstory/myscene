import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "scene_stats_animated";

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
  formatted?: boolean;
  style?: React.CSSProperties;
}

export default function CountUp({
  value,
  duration = 800,
  className,
  suffix = "",
  prefix = "",
  formatted = false,
  style,
}: CountUpProps) {
  const alreadyAnimatedThisSession = sessionStorage.getItem(SESSION_KEY) === "1";
  const [display, setDisplay] = useState(alreadyAnimatedThisSession ? value : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(alreadyAnimatedThisSession);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplay(value);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();
          animate();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  function animate() {
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        // Mark session as animated after first complete animation
        sessionStorage.setItem(SESSION_KEY, "1");
      }
    };
    requestAnimationFrame(step);
  }

  const text = formatted
    ? display.toLocaleString()
    : display.toString();

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}{text}{suffix}
    </span>
  );
}

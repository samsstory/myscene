import { lazy, Suspense, useEffect, useRef, useState } from "react";

const GlobeShowcaseV2 = lazy(() => import("./GlobeShowcaseV2"));

/**
 * Wraps GlobeShowcaseV2 (which pulls in the heavy Mapbox bundle) behind
 * an IntersectionObserver so the Mapbox JS/CSS are only requested when
 * the section is close to entering the viewport.  This keeps Mapbox out
 * of the critical path and improves TTI on the landing page.
 */
const LazyGlobeShowcase = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" } // start loading 400px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {shouldLoad ? (
        <Suspense fallback={<div className="py-24 md:py-32" />}>
          <GlobeShowcaseV2 />
        </Suspense>
      ) : (
        // Placeholder that preserves layout height so the page doesn't jump
        <div className="py-24 md:py-32" />
      )}
    </div>
  );
};

export default LazyGlobeShowcase;

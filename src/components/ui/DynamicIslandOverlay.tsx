import { useState, useEffect } from "react";
import { Smartphone } from "lucide-react";

const STORAGE_KEY = "scene-dev-island-overlay";

const DynamicIslandOverlay = () => {
  const [visible, setVisible] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(visible));
    } catch {}
    // Toggle class on <html> so CSS fallbacks for safe-area kick in
    if (visible) {
      document.documentElement.classList.add("dev-island-active");
    } else {
      document.documentElement.classList.remove("dev-island-active");
    }
    return () => {
      document.documentElement.classList.remove("dev-island-active");
    };
  }, [visible]);

  return (
    <>
      {/* Toggle button - bottom-left corner */}
      <button
        onClick={() => setVisible((v) => !v)}
        className="fixed bottom-4 left-4 z-[9999] w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
        title={visible ? "Hide Dynamic Island overlay" : "Show Dynamic Island overlay"}
        style={{ pointerEvents: "auto" }}
      >
        <Smartphone className={`w-4 h-4 ${visible ? "text-primary" : "text-white/40"}`} />
      </button>

      {visible && (
        <div className="fixed inset-x-0 top-0 z-[9998] pointer-events-none flex flex-col items-center">
          {/* Status bar area - simulated */}
          <div className="w-full max-w-[430px] flex items-center justify-between px-8 pt-[14px] pb-0 text-[12px] font-semibold text-white/70">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              {/* Signal bars */}
              <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" className="text-white/60">
                <rect x="0" y="7" width="3" height="4" rx="0.5" />
                <rect x="4.5" y="4.5" width="3" height="6.5" rx="0.5" />
                <rect x="9" y="2" width="3" height="9" rx="0.5" />
                <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
              </svg>
              {/* WiFi */}
              <svg width="15" height="12" viewBox="0 0 15 12" fill="currentColor" className="text-white/60 ml-0.5">
                <path d="M7.5 10.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM3.75 8.25a5.25 5.25 0 017.5 0M0 5.25a9.75 9.75 0 0115 0" stroke="currentColor" fill="none" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {/* Battery */}
              <div className="flex items-center gap-0.5 ml-0.5">
                <div className="w-[22px] h-[11px] rounded-[2.5px] border border-white/50 flex items-center p-[1px]">
                  <div className="h-full w-[75%] bg-white/60 rounded-[1.5px]" />
                </div>
                <div className="w-[1.5px] h-[4px] bg-white/40 rounded-r-sm" />
              </div>
            </div>
          </div>

          {/* Dynamic Island pill */}
          <div
            className="mt-[-2px] rounded-full bg-black border border-white/[0.06]"
            style={{
              width: "126px",
              height: "37px",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.8), inset 0 0 4px rgba(0,0,0,0.5)",
            }}
          />
        </div>
      )}
    </>
  );
};

export default DynamicIslandOverlay;

import { ArrowLeft, Share, Plus, MoreVertical, Check, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import DynamicIslandOverlay from "@/components/ui/DynamicIslandOverlay";

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = () => /Android/.test(navigator.userAgent);

export default function Install() {
  const navigate = useNavigate();
  const platform = isIOS() ? "ios" : isAndroid() ? "android" : "desktop";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {import.meta.env.DEV && <DynamicIslandOverlay />}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/5 pt-safe">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Save SCENE</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-2 pb-4 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
            <Smartphone className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Save Scene to your home screen</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-[300px] mx-auto">
            We know this isn't an actual app… <span className="italic">yet</span>. Once we get enough feedback, it will be! For now, follow these steps to save Scene to your home screen — like an app 😉
          </p>
        </motion.div>

        {/* iOS Instructions */}
        {(platform === "ios" || platform === "desktop") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            {platform === "desktop" && (
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="text-lg">🍎</span> iPhone / iPad
              </h3>
            )}
            <div className="space-y-2.5">
              <Step
                number={1}
                icon={<Share className="w-4 h-4 text-primary" />}
                title="Tap the Share button"
                desc="The square with an arrow — at the bottom of Safari."
              />
              <Step
                number={2}
                icon={<Plus className="w-4 h-4 text-primary" />}
                title={`Tap "Add to Home Screen"`}
                desc="Scroll down if you don't see it right away."
              />
              <Step
                number={3}
                icon={<Check className="w-4 h-4 text-primary" />}
                title={`Tap "Add"`}
                desc="That's it — Scene will appear on your home screen."
              />
            </div>
            {platform === "ios" && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                Make sure you're using Safari — this won't work in other browsers on iOS.
              </p>
            )}
          </motion.div>
        )}

        {/* Android Instructions */}
        {(platform === "android" || platform === "desktop") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            {platform === "desktop" && (
              <h3 className="text-base font-bold flex items-center gap-2">
                <span className="text-lg">🤖</span> Android
              </h3>
            )}
            <div className="space-y-2.5">
              <Step
                number={1}
                icon={<MoreVertical className="w-4 h-4 text-primary" />}
                title={`Tap the ⋮ menu in Chrome`}
                desc="Top-right corner of your browser."
              />
              <Step
                number={2}
                icon={<Plus className="w-4 h-4 text-primary" />}
                title={`Tap "Add to Home screen"`}
                desc="Or tap the install banner if Chrome shows one."
              />
              <Step
                number={3}
                icon={<Check className="w-4 h-4 text-primary" />}
                title="Confirm"
                desc="Scene will be added to your home screen."
              />
            </div>
          </motion.div>
        )}

        {/* Back CTA */}
        <div className="text-center pt-2 pb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Done — back to Scene
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ number, icon, title, desc }: { number: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

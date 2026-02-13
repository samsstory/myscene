import { ArrowLeft, Share, Plus, MoreVertical, Download, Check, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = () => /Android/.test(navigator.userAgent);

export default function Install() {
  const navigate = useNavigate();
  const platform = isIOS() ? "ios" : isAndroid() ? "android" : "desktop";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Install SCENE</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-0 pb-4 space-y-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
            <Smartphone className="w-9 h-9 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Get the full experience</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Install SCENE on your home screen for instant access, offline support, and a native app feel.
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: "Full screen", desc: "No browser chrome" },
            { label: "Offline ready", desc: "Works without signal" },
            { label: "Home screen icon", desc: "One tap to open" },
            { label: "Instant updates", desc: "Always up to date" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-white/5 bg-card/50 p-3 space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Section heading */}
        <h2 className="text-xl font-bold text-foreground">How to Install Scene</h2>

        {/* iOS Instructions */}
        {(platform === "ios" || platform === "desktop") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🍎</span> iPhone / iPad
            </h3>
            <div className="space-y-3">
              <Step
                number={1}
                icon={<span className="text-base">🧭</span>}
                title="Open in Safari"
                desc="Make sure you're using Safari — this won't work in Chrome or other browsers on iOS."
              />
              <Step
                number={2}
                icon={<Share className="w-4 h-4 text-primary" />}
                title="Tap the Share button"
                desc="It's the square with an arrow at the bottom of the screen."
              />
              <Step
                number={3}
                icon={<Plus className="w-4 h-4 text-primary" />}
                title='Tap "Add to Home Screen"'
                desc="Scroll down in the share menu if you don't see it right away."
              />
              <Step
                number={4}
                icon={<Check className="w-4 h-4 text-primary" />}
                title='Tap "Add"'
                desc="SCENE will appear on your home screen like a native app."
              />
            </div>
          </motion.div>
        )}

        {/* Android Instructions */}
        {(platform === "android" || platform === "desktop") && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-xl">🤖</span> Android
            </h3>
            <div className="space-y-3">
              <Step
                number={1}
                icon={<span className="text-base">🌐</span>}
                title="Open in Chrome"
                desc="Use Chrome for the best install experience."
              />
              <Step
                number={2}
                icon={<Download className="w-4 h-4 text-primary" />}
                title="Tap the install banner"
                desc='Chrome may show an "Install app" banner automatically. If so, tap Install.'
              />
              <Step
                number={3}
                icon={<MoreVertical className="w-4 h-4 text-primary" />}
                title="Or use the menu"
                desc='Tap the ⋮ menu → "Install app" or "Add to Home screen".'
              />
              <Step
                number={4}
                icon={<Check className="w-4 h-4 text-primary" />}
                title="Confirm install"
                desc="SCENE will be added to your home screen and app drawer."
              />
            </div>
          </motion.div>
        )}

        {/* Back CTA */}
        <div className="text-center pt-4 pb-8">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Back to SCENE
          </button>
        </div>
      </div>
    </div>
  );
}

function Step({ number, icon, title, desc }: { number: number; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
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

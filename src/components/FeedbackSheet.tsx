import { useState, useRef } from "react";
import { Bug, Lightbulb, Send, Camera, X, RefreshCw, ChevronRight } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { captureBugScreenshot } from "@/lib/bug-screenshot";

const schema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Please describe your feedback")
    .max(2000, "Must be under 2000 characters"),
});

type FeedbackMode = "choose" | "bug" | "feature";

interface FeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Allow external callers (e.g. API error prompts) to pre-open in bug mode
  prefillDescription?: string;
  errorContext?: Record<string, unknown> | null;
}

export default function FeedbackSheet({
  open,
  onOpenChange,
  prefillDescription,
  errorContext,
}: FeedbackSheetProps) {
  const [mode, setMode] = useState<FeedbackMode>("choose");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const screenshotTakenRef = useRef(false);

  const captureScreenshot = async () => {
    setCapturingScreenshot(true);
    const url = await captureBugScreenshot();
    setScreenshotUrl(url);
    setCapturingScreenshot(false);
  };

  const retakeScreenshot = async () => {
    setScreenshotUrl(null);
    onOpenChange(false);
    await new Promise((r) => setTimeout(r, 300));
    await captureScreenshot();
    onOpenChange(true);
  };

  const handleSelectMode = async (selected: "bug" | "feature") => {
    setMode(selected);
    setDescription(prefillDescription || "");
    if (selected === "bug") {
      screenshotTakenRef.current = false;
      setScreenshotUrl(null);
      await captureScreenshot();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setMode("choose");
      setDescription("");
      setError(null);
      setScreenshotUrl(null);
      screenshotTakenRef.current = false;
    }, 300);
  };

  const handleSubmit = () => {
    const result = schema.safeParse({ description });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setError(null);

    const reportDescription = result.data.description;
    const deviceInfo = {
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      platform: navigator.platform,
      standalone:
        (navigator as any).standalone ??
        window.matchMedia("(display-mode: standalone)").matches,
    };
    const pageUrl = window.location.pathname;
    const userAgent = navigator.userAgent;
    const capturedScreenshotUrl = screenshotUrl;
    const isBug = mode === "bug";

    handleClose();
    toast.success(isBug ? "Thanks! We're on it." : "Request noted — thank you! 🙌");

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const context = {
          ...(errorContext || {}),
          ...(capturedScreenshotUrl ? { screenshot_url: capturedScreenshotUrl } : {}),
        };

        if (isBug) {
          await supabase.from("bug_reports" as any).insert({
            user_id: session.user.id,
            description: reportDescription,
            page_url: pageUrl,
            user_agent: userAgent,
            device_info: deviceInfo,
            type: "manual",
            error_context: Object.keys(context).length > 0 ? context : null,
          } as any);
        } else {
          await (supabase as any).from("feature_requests").insert({
            user_id: session.user.id,
            description: reportDescription,
            page_url: pageUrl,
            status: "new",
          });
        }
      } catch {
        // Best-effort
      }
    })();
  };

  return (
    <Drawer open={open} onOpenChange={(val) => { if (!val) handleClose(); }}>
      <DrawerContent className="bg-card border-border max-h-[90dvh] overflow-y-auto">
        {/* ── Mode picker ── */}
        {mode === "choose" && (
          <>
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-lg">Share feedback</DrawerTitle>
              <DrawerDescription>
                Help us improve Scene — every bit of feedback shapes what we build next.
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 pb-2 space-y-3">
              {/* Feature request */}
              <button
                onClick={() => handleSelectMode("feature")}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all",
                  "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-primary/40",
                  "active:scale-[0.98]"
                )}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Request a feature</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Got an idea? Tell us what you'd love to see.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0" />
              </button>

              {/* Bug report */}
              <button
                onClick={() => handleSelectMode("bug")}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all",
                  "bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-destructive/40",
                  "active:scale-[0.98]"
                )}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                  <Bug className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Report a bug</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Something broken? We'll capture a screenshot automatically.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0" />
              </button>
            </div>

            <DrawerFooter className="pt-2">
              <DrawerClose asChild>
                <Button variant="ghost" size="sm">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        )}

        {/* ── Input form (bug or feature) ── */}
        {(mode === "bug" || mode === "feature") && (
          <>
            <DrawerHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  mode === "bug" ? "bg-destructive/15 border border-destructive/30" : "bg-primary/15 border border-primary/30"
                )}>
                  {mode === "bug"
                    ? <Bug className="h-4 w-4 text-destructive" />
                    : <Lightbulb className="h-4 w-4 text-primary" />
                  }
                </div>
                <div>
                  <DrawerTitle className="text-base">
                    {mode === "bug" ? "Report a bug" : "Request a feature"}
                  </DrawerTitle>
                  <DrawerDescription className="text-xs mt-0.5">
                    {mode === "bug"
                      ? "Tell us what went wrong — we'll include device info and a screenshot."
                      : "Describe what you'd love Scene to do."}
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

            <div className="px-4 pb-2 space-y-3">
              {/* Screenshot section (bug only) */}
              {mode === "bug" && (
                capturingScreenshot ? (
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Camera className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground font-medium">Capturing screenshot…</span>
                    </div>
                    <div className="h-20 rounded-lg bg-muted/30 border border-border animate-pulse flex items-center justify-center">
                      <span className="text-[11px] text-muted-foreground">Capturing…</span>
                    </div>
                  </div>
                ) : screenshotUrl ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Camera className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground font-medium">Screenshot captured</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={retakeScreenshot}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-muted/50"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Retake
                        </button>
                        <button
                          onClick={() => { setScreenshotUrl(null); screenshotTakenRef.current = false; }}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-muted/50"
                        >
                          <X className="h-3 w-3" />
                          Remove
                        </button>
                      </div>
                    </div>
                    <img
                      src={screenshotUrl}
                      alt="Screenshot"
                      className="h-20 w-auto rounded-lg border border-border object-cover object-top"
                    />
                  </div>
                ) : null
              )}

              <Textarea
                placeholder={mode === "bug" ? "What went wrong?" : "What feature would you love to see?"}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (error) setError(null);
                }}
                maxLength={2000}
                rows={4}
                className="resize-none bg-muted/50 border-white/10"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <p className="text-[11px] text-muted-foreground">{description.length}/2000</p>
            </div>

            <DrawerFooter className="pt-0">
              <Button onClick={handleSubmit} className="gap-2">
                <Send className="h-4 w-4" />
                {mode === "bug" ? "Send Report" : "Send Request"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
                Back
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

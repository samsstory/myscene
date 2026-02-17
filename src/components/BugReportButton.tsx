import { useState, useEffect, useRef } from "react";
import { Bug, Send, Camera, X, RefreshCw } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { BugReportType } from "@/hooks/useBugReportPrompt";
import { captureBugScreenshot } from "@/lib/bug-screenshot";

const bugSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Please describe what went wrong")
    .max(2000, "Description must be under 2000 characters"),
});

interface BugReportButtonProps {
  externalOpen?: boolean;
  onExternalClose?: () => void;
  prefillDescription?: string;
  errorContext?: Record<string, unknown> | null;
  reportType?: BugReportType;
}

export default function BugReportButton({
  externalOpen,
  onExternalClose,
  prefillDescription,
  errorContext,
  reportType,
}: BugReportButtonProps = {}) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [capturingScreenshot, setCapturingScreenshot] = useState(false);
  const screenshotTakenRef = useRef(false);

  // Capture screenshot
  const captureScreenshot = async () => {
    setCapturingScreenshot(true);
    const url = await captureBugScreenshot();
    setScreenshotUrl(url);
    setCapturingScreenshot(false);
  };

  const removeScreenshot = () => {
    setScreenshotUrl(null);
    screenshotTakenRef.current = false;
  };

  const retakeScreenshot = async () => {
    setScreenshotUrl(null);
    // Close drawer briefly, capture, reopen
    setOpen(false);
    await new Promise((r) => setTimeout(r, 300));
    await captureScreenshot();
    setOpen(true);
  };

  // Trigger screenshot capture BEFORE opening the drawer
  const openWithScreenshot = async () => {
    screenshotTakenRef.current = false;
    setScreenshotUrl(null);
    setDescription("");
    await captureScreenshot();
    setOpen(true);
  };

  // Sync external open
  useEffect(() => {
    if (externalOpen) {
      screenshotTakenRef.current = false;
      setScreenshotUrl(null);
      setDescription(prefillDescription || "");
      // Capture before opening
      (async () => {
        await captureScreenshot();
        setOpen(true);
      })();
    }
  }, [externalOpen, prefillDescription]);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      onExternalClose?.();
      screenshotTakenRef.current = false;
    }
  };

  const handleSubmit = () => {
    const result = bugSchema.safeParse({ description });
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
      standalone: (navigator as any).standalone ?? window.matchMedia("(display-mode: standalone)").matches,
    };
    const pageUrl = window.location.pathname;
    const userAgent = navigator.userAgent;
    const capturedScreenshotUrl = screenshotUrl;

    setDescription("");
    handleOpenChange(false);
    toast.success("Thanks! We're on it.");

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const context = {
          ...(errorContext || {}),
          ...(capturedScreenshotUrl ? { screenshot_url: capturedScreenshotUrl } : {}),
        };

        await supabase.from("bug_reports" as any).insert({
          user_id: session.user.id,
          description: reportDescription,
          page_url: pageUrl,
          user_agent: userAgent,
          device_info: deviceInfo,
          type: reportType || "manual",
          error_context: Object.keys(context).length > 0 ? context : null,
        } as any);
      } catch {
        // Best-effort
      }
    })();
  };

  return (
    <>
      <button
        onClick={openWithScreenshot}
        aria-label="Report a bug"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          "backdrop-blur-xl bg-black/40 border border-white/15 shadow-lg",
          "text-white/60 hover:text-primary hover:border-primary/40 transition-all hover:scale-110 active:scale-95"
        )}
      >
        <Bug className="h-4 w-4" />
      </button>

      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="bg-card border-border">
          <DrawerHeader>
            <DrawerTitle className="text-lg">Spotted a bug?</DrawerTitle>
            <DrawerDescription>
              Tell us what went wrong — we'll include your device info and a screenshot automatically.
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            {/* Screenshot preview */}
            {capturingScreenshot ? (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Camera className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground font-medium">Capturing screenshot…</span>
                </div>
                <div className="h-20 rounded-lg bg-muted/30 border border-border animate-pulse flex items-center justify-center">
                  <span className="text-[11px] text-muted-foreground">Capturing…</span>
                </div>
              </div>
            ) : screenshotUrl ? (
              <div className="mb-3">
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
                      onClick={removeScreenshot}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-muted/50"
                    >
                      <X className="h-3 w-3" />
                      Remove
                    </button>
                  </div>
                </div>
                <img
                  src={screenshotUrl}
                  alt="Bug screenshot"
                  className="h-20 w-auto rounded-lg border border-border object-cover object-top"
                />
              </div>
            ) : null}

            <Textarea
              placeholder="What went wrong?"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              maxLength={2000}
              rows={4}
              className="resize-none bg-muted/50 border-white/10"
            />
            {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {description.length}/2000
            </p>
          </div>

          <DrawerFooter>
            <Button onClick={handleSubmit} className="gap-2">
              <Send className="h-4 w-4" />
              Send Report
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}

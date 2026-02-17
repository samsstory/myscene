import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

/**
 * Captures a screenshot of the current page and uploads it to bug-screenshots bucket.
 * Returns the public URL or null on failure.
 */
export async function captureBugScreenshot(): Promise<string | null> {
  try {
    const canvas = await html2canvas(document.body, {
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      width: window.innerWidth,
      height: window.innerHeight,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      logging: false,
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7)
    );
    if (!blob) return null;

    const fileName = `bug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

    const { error } = await supabase.storage
      .from("bug-screenshots")
      .upload(fileName, blob, { contentType: "image/jpeg", upsert: false });

    if (error) {
      console.error("Bug screenshot upload failed:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("bug-screenshots")
      .getPublicUrl(fileName);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.error("Bug screenshot capture failed:", err);
    return null;
  }
}

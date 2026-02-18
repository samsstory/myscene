import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShareShowParams {
  showId: string;
  type: "logged" | "upcoming";
  artistName: string;
  venueName?: string;
}

// Fetch the current user's referral code
function useReferralCode() {
  return useQuery({
    queryKey: ["my-referral-code"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, full_name, username")
        .eq("id", user.id)
        .single();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useShareShow() {
  const { data: profile } = useReferralCode();

  const shareShow = useCallback(
    async ({ showId, type, artistName, venueName }: ShareShowParams) => {
      const refCode = profile?.referral_code ?? "";
      const inviterName = profile?.full_name ?? profile?.username ?? "A friend";

      // Build canonical URL
      const params = new URLSearchParams({
        ...(refCode ? { ref: refCode } : {}),
        show: showId,
        type,
      });
      const url = `https://tryscene.app/?${params.toString()}`;

      // Compose share message
      const venueText = venueName ? ` at ${venueName}` : "";
      const shareTitle =
        type === "logged"
          ? `What did you think of ${artistName}${venueText}?`
          : `${inviterName} wants you at ${artistName}${venueText}`;
      const text =
        type === "logged"
          ? `${inviterName} saw ${artistName}${venueText} and wants to compare notes 🎵`
          : `${inviterName} is going to see ${artistName}${venueText} and wants you there 🎤`;

      // Try native share first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text, url });
          return;
        } catch (err: any) {
          // User cancelled — swallow AbortError silently
          if (err?.name === "AbortError") return;
          // Otherwise fall through to clipboard
        }
      }

      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard! 🔗");
      } catch {
        // Last resort: show the URL in a toast
        toast.info(url, { duration: 6000 });
      }
    },
    [profile]
  );

  return { shareShow };
}

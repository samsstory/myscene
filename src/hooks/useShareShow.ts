import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ShareShowParams {
  showId: string;
  type: "logged" | "upcoming" | "edmtrain";
  artistName: string;
  venueName?: string;
  edmtrainLink?: string;
}

export interface ShareFestivalInviteParams {
  showId: string;        // parent festival show id
  eventName: string;
  showDate: string;      // ISO date string to derive year
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
    async ({ showId, type, artistName, venueName, edmtrainLink }: ShareShowParams) => {
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
      let shareTitle: string;
      let text: string;

      if (type === "edmtrain") {
        shareTitle = `Come to ${artistName}${venueText}!`;
        text = `${inviterName} wants you at ${artistName}${venueText} — let's go together! 🎶`;
      } else if (type === "logged") {
        shareTitle = `You're invited to compare your ${artistName}${venueText} experience on Scene`;
        text = `${inviterName} saw ${artistName}${venueText} and wants to compare notes 🎵`;
      } else {
        shareTitle = `${inviterName} wants you at ${artistName}${venueText}`;
        text = `${inviterName} is going to see ${artistName}${venueText} and wants you there 🎤`;
      }

      // Try native share first (mobile)
      if (navigator.share) {
        try {
          await navigator.share({ title: shareTitle, text, url });
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }

      // Clipboard fallback
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard! 🔗");
      } catch {
        toast.info(url, { duration: 6000 });
      }
    },
    [profile]
  );

  const shareFestivalInvite = useCallback(
    async ({ showId, eventName, showDate }: ShareFestivalInviteParams) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find the festival lineup by name + year
        const showYear = new Date(showDate).getFullYear();
        const { data: lineup } = await supabase
          .from("festival_lineups")
          .select("id")
          .eq("event_name", eventName)
          .eq("year", showYear)
          .maybeSingle();

        if (!lineup) {
          toast.error("Couldn't find festival lineup to share");
          return;
        }

        // Get the user's artists from child sets
        const { data: childShows } = await supabase
          .from("shows")
          .select("id, show_artists(artist_name, artist_image_url)")
          .eq("parent_show_id", showId)
          .eq("user_id", user.id);

        const selectedArtists = (childShows || []).map((s: any) => ({
          name: s.show_artists?.[0]?.artist_name || "Artist",
          image_url: s.show_artists?.[0]?.artist_image_url || null,
        }));

        const { data: invite, error } = await supabase
          .from("festival_invites")
          .insert({
            created_by: user.id,
            festival_lineup_id: lineup.id,
            festival_name: eventName,
            selected_artists: selectedArtists,
          })
          .select("id")
          .single();

        if (error || !invite) {
          toast.error("Failed to create invite");
          return;
        }

        const refCode = profile?.referral_code ?? "";
        const refParam = refCode ? `&ref=${refCode}` : "";
        const url = `https://tryscene.app/?show=${invite.id}&type=festival-invite${refParam}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: `Join me at ${eventName} on Scene`,
              text: `I just claimed ${eventName} on Scene — ${selectedArtists.length} sets! Who did you see? 🎶`,
              url,
            });
            return;
          } catch (err: any) {
            if (err?.name === "AbortError") return;
          }
        }

        await navigator.clipboard.writeText(url);
        toast.success("Festival invite link copied! 🔗");
      } catch (err) {
        console.error("Share festival error:", err);
        toast.error("Something went wrong");
      }
    },
    [profile]
  );

  return { shareShow, shareFestivalInvite };
}

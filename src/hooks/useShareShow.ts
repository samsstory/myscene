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
  showId: string;
  eventName: string;
  showDate: string;
}

export interface ShareFestivalFromLineupParams {
  festivalLineupId: string;
  festivalName: string;
  artists: { name: string; image_url?: string | null }[];
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

  // Shared helper: create invite row + share/copy URL
  const createAndShareInvite = useCallback(
    async (festivalLineupId: string, festivalName: string, selectedArtists: { name: string; image_url?: string | null }[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: invite, error } = await supabase
        .from("festival_invites")
        .insert({
          created_by: user.id,
          festival_lineup_id: festivalLineupId,
          festival_name: festivalName,
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
            title: `Join me at ${festivalName} on Scene`,
            text: `I just claimed ${festivalName} on Scene — ${selectedArtists.length} sets! Who did you see? 🎶`,
            url,
          });
          return;
        } catch (err: any) {
          if (err?.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(url);
      toast.success("Festival invite link copied! 🔗");
    },
    [profile]
  );

  // Share from a logged festival show (looks up lineup + child shows)
  const shareFestivalInvite = useCallback(
    async ({ showId, eventName, showDate }: ShareFestivalInviteParams) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const showYear = new Date(showDate).getFullYear();
        const { data: lineup } = await supabase
          .from("festival_lineups")
          .select("id, artists")
          .eq("event_name", eventName)
          .eq("year", showYear)
          .maybeSingle();

        if (!lineup) {
          toast.error("Couldn't find festival lineup to share");
          return;
        }

        const { data: childShows } = await supabase
          .from("shows")
          .select("id, show_artists(artist_name, artist_image_url)")
          .eq("parent_show_id", showId)
          .eq("user_id", user.id);

        // Build a case-insensitive map from lineup artist names so stored
        // names always match the canonical lineup casing.
        const lineupArtists: any[] = (() => {
          if (!lineup.artists) return [];
          const raw = typeof lineup.artists === "string" ? JSON.parse(lineup.artists) : lineup.artists;
          return Array.isArray(raw) ? raw : [];
        })();
        const canonicalName = new Map<string, string>(
          lineupArtists.map((a: any) => {
            const name = typeof a === "string" ? a : a.name;
            return [name.toLowerCase(), name];
          })
        );

        const selectedArtists = (childShows || []).map((s: any) => {
          const rawName = s.show_artists?.[0]?.artist_name || "Artist";
          return {
            name: canonicalName.get(rawName.toLowerCase()) || rawName,
            image_url: s.show_artists?.[0]?.artist_image_url || null,
          };
        });

        await createAndShareInvite(lineup.id, eventName, selectedArtists);
      } catch (err) {
        console.error("Share festival error:", err);
        toast.error("Something went wrong");
      }
    },
    [createAndShareInvite]
  );

  // Share from BulkSuccessStep where lineup ID + artists are already known
  const shareFestivalFromLineup = useCallback(
    async ({ festivalLineupId, festivalName, artists }: ShareFestivalFromLineupParams) => {
      try {
        await createAndShareInvite(festivalLineupId, festivalName, artists);
      } catch (err) {
        console.error("Share festival error:", err);
        toast.error("Something went wrong");
      }
    },
    [createAndShareInvite]
  );

  return { shareShow, shareFestivalInvite, shareFestivalFromLineup };
}

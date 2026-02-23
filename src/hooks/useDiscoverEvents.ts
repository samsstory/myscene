import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type EdmtrainEvent, useEdmtrainEvents } from "./useEdmtrainEvents";
import { useSpotifyConnection } from "./useSpotifyConnection";

export interface DiscoverPick {
  type: "edmtrain" | "platform";
  artistName: string;
  artistImageUrl: string | null;
  venueName: string | null;
  venueLocation: string | null;
  eventDate: string;
  eventLink?: string;
  festivalInd: boolean;
  attendeeCount: number;
  score: number;
  reason: { type: string; label: string };
  // For edmtrain cards
  edmtrainEvent?: EdmtrainEvent;
}

interface PlatformShow {
  artist_name: string;
  show_date: string;
  venue_name: string | null;
  venue_location: string | null;
  artist_image_url: string | null;
  attendee_count: number;
}

export function useDiscoverEvents(userArtistNames: string[] = []) {
  const { events: edmtrainEvents, isLoading: edmtrainLoading } = useEdmtrainEvents();
  const { spotifyArtists, isConnected: spotifyConnected, isLoading: spotifyLoading } = useSpotifyConnection();
  const [platformShows, setPlatformShows] = useState<PlatformShow[]>([]);
  const [associations, setAssociations] = useState<Map<string, string[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch platform social proof + associations
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setIsLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("home_city")
        .eq("id", user.id)
        .single();

      // Platform shows via RPC
      let platformRes: any = { data: [] };
      if (profile?.home_city) {
        platformRes = await supabase.rpc("get_discover_upcoming_near_me" as any, {
          p_user_id: user.id,
          p_city: profile.home_city,
        });
      }

      // Artist associations
      const assocRes = await supabase.from("artist_associations")
        .select("artist1_name, artist2_name, co_occurrence_count")
        .gt("co_occurrence_count", 1)
        .order("co_occurrence_count", { ascending: false })
        .limit(200);

      if (cancelled) return;

      setPlatformShows((platformRes.data || []) as PlatformShow[]);

      // Build associations lookup
      const assocMap = new Map<string, string[]>();
      for (const row of (assocRes.data || []) as any[]) {
        const a1 = row.artist1_name.toLowerCase();
        const a2 = row.artist2_name.toLowerCase();
        if (!assocMap.has(a1)) assocMap.set(a1, []);
        if (!assocMap.has(a2)) assocMap.set(a2, []);
        assocMap.get(a1)!.push(a2);
        assocMap.get(a2)!.push(a1);
      }
      setAssociations(assocMap);
      setIsLoading(false);
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const picks = useMemo((): DiscoverPick[] => {
    const userArtistsLower = new Set(userArtistNames.map(n => n.toLowerCase()));
    const spotifyArtistsLower = new Set(spotifyArtists.map(n => n.toLowerCase()));

    const scoredPicks: DiscoverPick[] = [];
    const seen = new Set<string>();

    // Helper to score an artist name
    function scoreArtist(artistName: string): { score: number; reason: { type: string; label: string } } {
      const lower = artistName.toLowerCase();
      let score = 0;
      let reason = { type: "none", label: "" };

      if (spotifyArtistsLower.has(lower)) {
        score += 15;
        reason = { type: "spotify", label: "In your top artists" };
      }

      if (userArtistsLower.has(lower) && score < 10) {
        score += 10;
        if (reason.type === "none") reason = { type: "direct", label: `You've seen ${artistName}` };
      }

      // Co-occurrence
      const related = associations.get(lower);
      if (related && score < 5) {
        const matchedRelated = related.find(r => userArtistsLower.has(r) || spotifyArtistsLower.has(r));
        if (matchedRelated) {
          score += 5;
          if (reason.type === "none") {
            const displayName = matchedRelated.charAt(0).toUpperCase() + matchedRelated.slice(1);
            reason = { type: "cooccurrence", label: `Fans of ${displayName} love this` };
          }
        }
      }

      return { score, reason };
    }

    // Score Edmtrain events
    for (const event of edmtrainEvents) {
      const artistNames = event.artists.map(a => a.name);
      const displayName = event.event_name || artistNames.join(", ") || "Event";
      const key = `${displayName.toLowerCase()}|${event.event_date}`;
      if (seen.has(key)) continue;
      seen.add(key);

      let bestScore = 0;
      let bestReason = { type: "none", label: "" };

      for (const a of artistNames) {
        const { score, reason } = scoreArtist(a);
        if (score > bestScore) {
          bestScore = score;
          bestReason = reason;
        }
      }

      // Festival bonus
      if (event.festival_ind) bestScore += 2;
      if (bestReason.type === "none" && event.festival_ind) {
        bestReason = { type: "festival", label: "Festival near you" };
      }

      // Check platform overlap for attendee count
      let attendees = 0;
      for (const ps of platformShows) {
        if (
          ps.show_date === event.event_date &&
          artistNames.some(a => a.toLowerCase() === ps.artist_name.toLowerCase())
        ) {
          attendees = Number(ps.attendee_count);
          break;
        }
      }
      if (attendees > 0) {
        bestScore += Math.min(attendees * 3, 9);
        if (bestReason.type === "none") {
          bestReason = { type: "social", label: `${attendees} ${attendees === 1 ? "other" : "others"} going` };
        }
      }

      if (bestScore >= 1) {
        scoredPicks.push({
          type: "edmtrain",
          artistName: displayName,
          artistImageUrl: event.artist_image_url,
          venueName: event.venue_name,
          venueLocation: event.venue_location,
          eventDate: event.event_date,
          eventLink: event.event_link,
          festivalInd: event.festival_ind,
          attendeeCount: attendees,
          score: bestScore,
          reason: bestReason,
          edmtrainEvent: event,
        });
      }
    }

    // Score platform-only shows (not already covered by Edmtrain)
    for (const ps of platformShows) {
      const key = `${ps.artist_name.toLowerCase()}|${ps.show_date}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const { score: artistScore, reason } = scoreArtist(ps.artist_name);
      const socialScore = Math.min(Number(ps.attendee_count) * 3, 9);
      const totalScore = artistScore + socialScore;

      let bestReason = reason;
      if (bestReason.type === "none" && ps.attendee_count > 0) {
        bestReason = { type: "social", label: `${ps.attendee_count} ${Number(ps.attendee_count) === 1 ? "other" : "others"} going` };
      }

      if (totalScore >= 1) {
        scoredPicks.push({
          type: "platform",
          artistName: ps.artist_name,
          artistImageUrl: ps.artist_image_url,
          venueName: ps.venue_name,
          venueLocation: ps.venue_location,
          eventDate: ps.show_date,
          festivalInd: false,
          attendeeCount: Number(ps.attendee_count),
          score: totalScore,
          reason: bestReason,
        });
      }
    }

    // Sort by score desc, cap at 8
    return scoredPicks.sort((a, b) => b.score - a.score).slice(0, 8);
  }, [edmtrainEvents, platformShows, userArtistNames, spotifyArtists, associations]);

  return {
    picks,
    isLoading: isLoading || edmtrainLoading || spotifyLoading,
    isEmpty: !isLoading && !edmtrainLoading && !spotifyLoading && picks.length === 0,
    spotifyConnected,
    hasSignals: userArtistNames.length > 0 || spotifyArtists.length > 0,
  };
}

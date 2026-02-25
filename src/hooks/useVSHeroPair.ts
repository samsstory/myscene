import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  selectSmartPair as selectSmartPairUtil,
  type Show,
  type ShowRanking,
  type Comparison,
} from "@/lib/smart-pairing";

const K_BASE = 32;
const K_MIN_COMPARISONS = 10;

function calculateElo(
  winnerElo: number,
  loserElo: number,
  winnerComps: number,
  loserComps: number
) {
  const winnerK =
    winnerComps < K_MIN_COMPARISONS
      ? K_BASE * (1 + (K_MIN_COMPARISONS - winnerComps) / K_MIN_COMPARISONS)
      : K_BASE;
  const loserK =
    loserComps < K_MIN_COMPARISONS
      ? K_BASE * (1 + (K_MIN_COMPARISONS - loserComps) / K_MIN_COMPARISONS)
      : K_BASE;

  const expectedW = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedL = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  return {
    newWinnerElo: Math.round(winnerElo + winnerK * (1 - expectedW)),
    newLoserElo: Math.round(loserElo + loserK * (0 - expectedL)),
  };
}

export function useVSHeroPair() {
  const [shows, setShows] = useState<Show[]>([]);
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [comparedPairs, setComparedPairs] = useState<Set<string>>(new Set());

  const [pair, setPair] = useState<[Show, Show] | null>(null);
  const [pairKey, setPairKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [showCount, setShowCount] = useState(0);

  // Derive next pair from current state
  const deriveNextPair = useCallback(
    (
      s: Show[],
      r: ShowRanking[],
      c: Comparison[],
      cp: Set<string>
    ): [Show, Show] | null => {
      if (s.length < 2) return null;
      // Auto-select pool with most shows
      const poolCounts: Record<string, number> = {};
      s.forEach((sh) => {
        const t = sh.show_type || "set";
        poolCounts[t] = (poolCounts[t] || 0) + 1;
      });
      const bestPool = Object.entries(poolCounts).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0] || "set";

      const poolShows = s.filter((sh) => (sh.show_type || "set") === bestPool);
      const poolRankings = r.filter((rk) =>
        poolShows.some((sh) => sh.id === rk.show_id)
      );

      if (poolShows.length < 2) return null;

      return selectSmartPairUtil({
        shows: poolShows,
        rankings: poolRankings,
        comparisons: c,
        comparedPairs: cp,
      });
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Fetch shows + artists + rankings + comparisons in parallel
        const [showsRes, rankingsRes, compsRes] = await Promise.all([
          supabase
            .from("shows")
            .select("*")
            .eq("user_id", user.id)
            .order("show_date", { ascending: false }),
          supabase
            .from("show_rankings")
            .select("*")
            .eq("user_id", user.id),
          supabase
            .from("show_comparisons")
            .select("show1_id, show2_id, winner_id")
            .eq("user_id", user.id),
        ]);

        if (cancelled) return;

        const rawShows = showsRes.data || [];
        setShowCount(rawShows.length);

        if (rawShows.length < 2) {
          setIsLoading(false);
          return;
        }

        // Fetch artists for all shows
        const showIds = rawShows.map((s) => s.id);
        const { data: allArtists } = await supabase
          .from("show_artists")
          .select("show_id, artist_name, is_headliner, artist_image_url")
          .in("show_id", showIds);

        if (cancelled) return;

        const artistsByShow = new Map<string, typeof allArtists>();
        (allArtists || []).forEach((a) => {
          if (!artistsByShow.has(a.show_id)) artistsByShow.set(a.show_id, []);
          artistsByShow.get(a.show_id)!.push(a);
        });

        const showsWithArtists: Show[] = rawShows.map((s) => ({
          ...s,
          artists: (artistsByShow.get(s.id) || []).sort((a, b) =>
            a.is_headliner === b.is_headliner ? 0 : a.is_headliner ? -1 : 1
          ),
        }));

        // Ensure rankings exist for all shows
        const existingIds = new Set(
          (rankingsRes.data || []).map((r) => r.show_id)
        );
        const missingShows = rawShows.filter((s) => !existingIds.has(s.id));
        let finalRankings = rankingsRes.data || [];

        if (missingShows.length > 0) {
          await supabase.from("show_rankings").insert(
            missingShows.map((s) => ({
              user_id: user.id,
              show_id: s.id,
              elo_score: 1200,
              comparisons_count: 0,
            }))
          );
          const { data: updated } = await supabase
            .from("show_rankings")
            .select("*")
            .eq("user_id", user.id);
          finalRankings = updated || [];
        }

        // Format comparisons
        const cpSet = new Set<string>();
        const formattedComps: Comparison[] = [];
        (compsRes.data || []).forEach((c) => {
          const [id1, id2] = [c.show1_id, c.show2_id].sort();
          cpSet.add(`${id1}-${id2}`);
          formattedComps.push({
            show1_id: c.show1_id,
            show2_id: c.show2_id,
            winner_id: c.winner_id,
          });
        });

        if (cancelled) return;

        setShows(showsWithArtists);
        setRankings(finalRankings);
        setComparisons(formattedComps);
        setComparedPairs(cpSet);

        const nextPair = deriveNextPair(
          showsWithArtists,
          finalRankings,
          formattedComps,
          cpSet
        );
        setPair(nextPair);
        setPairKey((k) => k + 1);
        setIsLoading(false);
      } catch (err) {
        console.error("useVSHeroPair: load error", err);
        setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChoice = useCallback(
    async (winnerId: string) => {
      if (!pair || comparing) return;

      // Haptic
      if (navigator.vibrate) navigator.vibrate(10);

      setSelectedWinner(winnerId);
      setComparing(true);

      // Wait for animation
      await new Promise((r) => setTimeout(r, 400));

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [show1Id, show2Id] = [pair[0].id, pair[1].id].sort();

        // Insert comparison (fire-and-forget after we get the id)
        supabase
          .from("show_comparisons")
          .insert({
            user_id: user.id,
            show1_id: show1Id,
            show2_id: show2Id,
            winner_id: winnerId,
          })
          .then(() => {});

        // Update ELO optimistically
        const loserId = winnerId === pair[0].id ? pair[1].id : pair[0].id;
        const winnerR = rankings.find((r) => r.show_id === winnerId);
        const loserR = rankings.find((r) => r.show_id === loserId);

        let updatedRankings = rankings;

        if (winnerR && loserR) {
          const { newWinnerElo, newLoserElo } = calculateElo(
            winnerR.elo_score,
            loserR.elo_score,
            winnerR.comparisons_count,
            loserR.comparisons_count
          );

          updatedRankings = rankings.map((r) => {
            if (r.show_id === winnerId)
              return {
                ...r,
                elo_score: newWinnerElo,
                comparisons_count: r.comparisons_count + 1,
              };
            if (r.show_id === loserId)
              return {
                ...r,
                elo_score: newLoserElo,
                comparisons_count: r.comparisons_count + 1,
              };
            return r;
          });

          // Fire-and-forget DB update
          supabase
            .from("show_rankings")
            .upsert([
              {
                id: winnerR.id,
                user_id: user.id,
                show_id: winnerId,
                elo_score: newWinnerElo,
                comparisons_count: winnerR.comparisons_count + 1,
              },
              {
                id: loserR.id,
                user_id: user.id,
                show_id: loserId,
                elo_score: newLoserElo,
                comparisons_count: loserR.comparisons_count + 1,
              },
            ])
            .then(() => {});
        }

        const newComp: Comparison = {
          show1_id: show1Id,
          show2_id: show2Id,
          winner_id: winnerId,
        };
        const newComps = [...comparisons, newComp];
        const newPairs = new Set([
          ...comparedPairs,
          `${show1Id}-${show2Id}`,
        ]);

        // Update state
        setRankings(updatedRankings);
        setComparisons(newComps);
        setComparedPairs(newPairs);

        // Derive next pair synchronously
        const nextPair = deriveNextPair(
          shows,
          updatedRankings,
          newComps,
          newPairs
        );
        setPair(nextPair);
        setPairKey((k) => k + 1);
        setSelectedWinner(null);
        setComparing(false);
      } catch (err) {
        console.error("useVSHeroPair: choice error", err);
        setSelectedWinner(null);
        setComparing(false);
      }
    },
    [pair, comparing, rankings, comparisons, comparedPairs, shows, deriveNextPair]
  );

  const handleSkip = useCallback(() => {
    if (!pair || comparing) return;
    // Just pick a new pair without recording anything
    const nextPair = deriveNextPair(shows, rankings, comparisons, comparedPairs);
    if (nextPair && nextPair[0].id === pair[0].id && nextPair[1].id === pair[1].id) {
      // Same pair returned — no alternatives
      return;
    }
    setPair(nextPair);
    setPairKey((k) => k + 1);
  }, [pair, comparing, shows, rankings, comparisons, comparedPairs, deriveNextPair]);

  return {
    pair,
    pairKey,
    isLoading,
    comparing,
    selectedWinner,
    showCount,
    handleChoice,
    handleSkip,
    allRankedUp: !isLoading && showCount >= 2 && !pair,
  };
}

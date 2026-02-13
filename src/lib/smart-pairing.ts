/**
 * Smart Pairing Algorithm for Show Rankings
 * 
 * Uses transitive inference and ELO gap thresholds to reduce required swipes
 * by 40-60% while focusing on high-information matchups.
 */

export interface Show {
  id: string;
  venue_name: string;
  show_date: string;
  photo_url: string | null;
  notes: string | null;
  tags?: string[];
  artists: Array<{ artist_name: string; is_headliner: boolean }>;
  // Legacy fields kept for backward compat (ignored)
  rating?: number | null;
  venue_location?: string;
}

export interface ShowRanking {
  id: string;
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

export interface Comparison {
  show1_id: string;
  show2_id: string;
  winner_id: string | null;
}

export interface SmartPairingOptions {
  shows: Show[];
  rankings: ShowRanking[];
  comparisons: Comparison[];
  comparedPairs: Set<string>;
  focusOnUnderRanked?: boolean;
  comparisonThreshold?: number;
}

export interface AnchorSelectionOptions {
  newShowId: string;
  existingShows: Array<{ id: string; venue_name: string; show_date: string; photo_url: string | null }>;
  rankings: ShowRanking[];
}

// Transitive graph: Map<showId, Set<showIds that this show beats>>
type TransitiveGraph = Map<string, Set<string>>;

/**
 * Build a directed graph of "beats" relationships from comparisons.
 * Key: winner show ID, Value: Set of loser show IDs
 */
export function buildTransitiveGraph(comparisons: Comparison[]): TransitiveGraph {
  const graph: TransitiveGraph = new Map();
  
  for (const comp of comparisons) {
    // Skip ties/skips (winner_id is null)
    if (!comp.winner_id) continue;
    
    const loserId = comp.winner_id === comp.show1_id ? comp.show2_id : comp.show1_id;
    
    if (!graph.has(comp.winner_id)) {
      graph.set(comp.winner_id, new Set());
    }
    graph.get(comp.winner_id)!.add(loserId);
  }
  
  return graph;
}

/**
 * Check if A beating B is transitively implied by existing comparisons.
 * Uses BFS to find if there's a path from A to B in the "beats" graph.
 */
export function isTransitivelyImplied(
  showA: string, 
  showB: string, 
  graph: TransitiveGraph,
  maxDepth: number = 3
): boolean {
  // BFS with depth limit
  const queue: Array<{ id: string; depth: number }> = [{ id: showA, depth: 0 }];
  const visited = new Set<string>([showA]);
  
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    
    // Check if current node beats B directly
    const beatenByThis = graph.get(id);
    if (beatenByThis?.has(showB)) {
      return true;
    }
    
    // Don't go deeper than maxDepth
    if (depth >= maxDepth) continue;
    
    // Add all shows beaten by this one to queue
    if (beatenByThis) {
      for (const beaten of beatenByThis) {
        if (!visited.has(beaten)) {
          visited.add(beaten);
          queue.push({ id: beaten, depth: depth + 1 });
        }
      }
    }
  }
  
  return false;
}

/**
 * Check if a pair is transitively implied in either direction.
 */
export function isPairTransitivelyImplied(
  show1Id: string,
  show2Id: string,
  graph: TransitiveGraph
): boolean {
  return isTransitivelyImplied(show1Id, show2Id, graph) || 
         isTransitivelyImplied(show2Id, show1Id, graph);
}

/**
 * Calculate the score for a candidate pair.
 * Higher score = more valuable comparison.
 */
export function calculatePairScore(
  show1: Show,
  show2: Show,
  rankings: Map<string, ShowRanking>,
  graph: TransitiveGraph
): number {
  // Skip if transitively implied
  if (isPairTransitivelyImplied(show1.id, show2.id, graph)) {
    return -1;
  }
  
  const ranking1 = rankings.get(show1.id);
  const ranking2 = rankings.get(show2.id);
  
  if (!ranking1 || !ranking2) return 0;
  
  const elo1 = ranking1.elo_score;
  const elo2 = ranking2.elo_score;
  const eloDiff = Math.abs(elo1 - elo2);
  
  // 1. ELO Proximity Score (0-1)
  // Closer ELO = higher score
  let proximityScore = Math.max(0, 1 - (eloDiff / 400));
  
  // Heavy penalty for large ELO gaps (>200 points) - outcome is predictable
  if (eloDiff > 200) {
    proximityScore *= 0.3;
  }
  
  // 2. Uncertainty Score (0-1)
  // Fewer comparisons = more uncertain = higher value
  const avgComparisons = (ranking1.comparisons_count + ranking2.comparisons_count) / 2;
  const uncertaintyScore = Math.max(0, (10 - avgComparisons) / 10);
  
  // 3. Information Gain Bonus
  // Bonus for shows that haven't been compared to many others
  const minComparisons = Math.min(ranking1.comparisons_count, ranking2.comparisons_count);
  const informationBonus = minComparisons < 3 ? 0.2 : 0;
  
  // Final score
  return (proximityScore * 0.5) + (uncertaintyScore * 0.3) + (informationBonus * 0.2);
}

/**
 * Select the best pair for comparison using smart pairing algorithm.
 * Returns null if no meaningful comparisons remain.
 */
export function selectSmartPair(options: SmartPairingOptions): [Show, Show] | null {
  const {
    shows,
    rankings,
    comparisons,
    comparedPairs,
    focusOnUnderRanked = false,
    comparisonThreshold = 3,
  } = options;
  
  if (shows.length < 2) return null;
  
  // Build ranking map for quick lookups
  const rankingMap = new Map(rankings.map(r => [r.show_id, r]));
  
  // Build transitive graph
  const graph = buildTransitiveGraph(comparisons);
  
  // If focusing on under-ranked shows, filter to prioritize those
  let candidateShows = shows;
  if (focusOnUnderRanked) {
    const underRanked = shows.filter(show => {
      const ranking = rankingMap.get(show.id);
      return !ranking || ranking.comparisons_count < comparisonThreshold;
    });
    
    // If all shows are well-ranked, we're done
    if (underRanked.length === 0) {
      return null;
    }
    
    // Primary show is the one with fewest comparisons
    const primaryShow = underRanked.sort((a, b) => {
      const aCount = rankingMap.get(a.id)?.comparisons_count || 0;
      const bCount = rankingMap.get(b.id)?.comparisons_count || 0;
      return aCount - bCount;
    })[0];
    
    // Find best partner for the primary show
    const candidates: { show: Show; score: number }[] = [];
    
    for (const show of shows) {
      if (show.id === primaryShow.id) continue;
      
      const [id1, id2] = [primaryShow.id, show.id].sort();
      if (comparedPairs.has(`${id1}-${id2}`)) continue;
      
      const score = calculatePairScore(primaryShow, show, rankingMap, graph);
      if (score >= 0) {
        // Bonus for pairing with established shows
        const partnerRanking = rankingMap.get(show.id);
        const establishedBonus = partnerRanking && partnerRanking.comparisons_count >= comparisonThreshold ? 0.5 : 0;
        candidates.push({ show, score: score + establishedBonus });
      }
    }
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort and pick from top candidates with randomization
    candidates.sort((a, b) => b.score - a.score);
    const topCandidates = candidates.slice(0, Math.min(3, candidates.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    
    return [primaryShow, topCandidates[randomIndex].show];
  }
  
  // General pairing: score all valid pairs
  const pairScores: { pair: [Show, Show]; score: number }[] = [];
  
  for (let i = 0; i < shows.length; i++) {
    for (let j = i + 1; j < shows.length; j++) {
      const [id1, id2] = [shows[i].id, shows[j].id].sort();
      const pairKey = `${id1}-${id2}`;
      
      // Skip already compared pairs
      if (comparedPairs.has(pairKey)) continue;
      
      const score = calculatePairScore(shows[i], shows[j], rankingMap, graph);
      
      // Skip pairs with negative score (transitively implied)
      if (score < 0) continue;
      
      pairScores.push({
        pair: [shows[i], shows[j]],
        score,
      });
    }
  }
  
  if (pairScores.length === 0) {
    return null;
  }
  
  // Sort by score and pick from top candidates with randomization
  pairScores.sort((a, b) => b.score - a.score);
  const topCandidates = pairScores.slice(0, Math.min(5, pairScores.length));
  const randomIndex = Math.floor(Math.random() * topCandidates.length);
  
  return topCandidates[randomIndex].pair;
}

/**
 * Select the best anchor show for comparing a new show.
 * Prioritizes shows near median ELO with stable rankings.
 */
export function selectBestAnchor(options: AnchorSelectionOptions): typeof options.existingShows[0] | null {
  const { newShowId, existingShows, rankings } = options;
  
  if (existingShows.length === 0) return null;
  
  // Filter out the new show itself
  const candidates = existingShows.filter(s => s.id !== newShowId);
  if (candidates.length === 0) return null;
  
  // Build ranking map
  const rankingMap = new Map(rankings.map(r => [r.show_id, r]));
  
  // Calculate median ELO
  const elos = rankings.map(r => r.elo_score).sort((a, b) => a - b);
  const medianElo = elos.length > 0 
    ? elos[Math.floor(elos.length / 2)] 
    : 1200;
  
  // Score each candidate
  const scoredCandidates = candidates.map(show => {
    const ranking = rankingMap.get(show.id);
    const elo = ranking?.elo_score || 1200;
    const comparisons = ranking?.comparisons_count || 0;
    
    // Distance from median ELO (closer = better)
    const eloDistance = Math.abs(elo - medianElo);
    const proximityScore = Math.max(0, 1 - (eloDistance / 300));
    
    // Stability score (more comparisons = more reliable anchor)
    const stabilityScore = Math.min(1, comparisons / 5);
    
    // Combined score (60% proximity, 40% stability)
    const score = proximityScore * 0.6 + stabilityScore * 0.4;
    
    return { show, score };
  });
  
  // Sort by score
  scoredCandidates.sort((a, b) => b.score - a.score);
  
  // Pick from top 3 with some randomization
  const topCandidates = scoredCandidates.slice(0, Math.min(3, scoredCandidates.length));
  const randomIndex = Math.floor(Math.random() * topCandidates.length);
  
  return topCandidates[randomIndex].show;
}

/**
 * Check if rankings are "locked in" - all shows have sufficient comparisons
 * and remaining pairs are low-value (transitively implied or large ELO gaps).
 */
export function areRankingsComplete(options: {
  shows: Show[];
  rankings: ShowRanking[];
  comparisons: Comparison[];
  comparedPairs: Set<string>;
  minComparisonsPerShow?: number;
  minTotalComparisons?: number;
}): boolean {
  const {
    shows,
    rankings,
    comparisons,
    comparedPairs,
    minComparisonsPerShow = 3,
    minTotalComparisons,
  } = options;
  
  if (shows.length < 2) return true;
  
  // Check minimum total comparisons
  const requiredMinTotal = minTotalComparisons ?? Math.max(15, shows.length * 2);
  if (comparisons.length < requiredMinTotal) return false;
  
  // Check average comparisons per show
  const avgComparisons = comparisons.length / shows.length;
  if (avgComparisons < minComparisonsPerShow) return false;
  
  // Check if there are any high-value pairs remaining
  const rankingMap = new Map(rankings.map(r => [r.show_id, r]));
  const graph = buildTransitiveGraph(comparisons);
  
  for (let i = 0; i < shows.length; i++) {
    for (let j = i + 1; j < shows.length; j++) {
      const [id1, id2] = [shows[i].id, shows[j].id].sort();
      if (comparedPairs.has(`${id1}-${id2}`)) continue;
      
      const score = calculatePairScore(shows[i], shows[j], rankingMap, graph);
      
      // If there's a high-value pair remaining, rankings aren't complete
      if (score > 0.3) return false;
    }
  }
  
  return true;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Standard competition ranking ("1224"): entries with equal scores share the
 * same rank, and the next distinct score skips ahead. Input must be sorted by
 * score descending. Returns one rank per entry (1-based).
 */
export function computeRanks(scores: number[]): number[] {
  const ranks: number[] = [];
  let lastScore: number | null = null;
  let lastRank = 0;
  scores.forEach((score, i) => {
    if (lastScore === null || score !== lastScore) {
      lastRank = i + 1;
      lastScore = score;
    }
    ranks.push(lastRank);
  });
  return ranks;
}

/** Display token for a rank: a medal for 1–3, otherwise "#n". */
export function rankBadge(rank: number): string {
  return rank <= 3 ? MEDALS[rank - 1] : `#${rank}`;
}

/**
 * True only when there is a real ranking to show: at least one positive score
 * and some differentiation. When everyone is tied (e.g. nothing scored yet),
 * returns false so we don't crown everyone.
 */
export function hasRanking(scores: number[]): boolean {
  if (scores.length === 0) return false;
  if (Math.max(...scores) <= 0) return false;
  return new Set(scores).size > 1;
}

// Fuzzy match for customer / carrier master dedup.
// Levenshtein ≤ MATCH_THRESHOLD → "match". ≤ AMBIGUOUS_THRESHOLD → "ambiguous".

const MATCH_THRESHOLD     = 3;
const AMBIGUOUS_THRESHOLD = 5;

const STRIP_SUFFIXES = /\b(co\.\s*,?\s*ltd|co\.?\s*ltd|ltd|pte\.?\s*ltd|pte|joint stock company|jsc|corp|inc|llc|co)\b\.?/gi;

function normalize(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(STRIP_SUFFIXES, '')
    .replace(/[.,\-_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  // dp[i][j] = edit distance a[0..i), b[0..j)
  const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * @param {string} name - incoming name from PNL
 * @param {Array<{id: string, name: string}>} existing
 * @returns {{ status: 'match'|'new'|'ambiguous', suggested_id?: string, similarity: number }}
 */
export function findMatch(name, existing) {
  const norm = normalize(name);
  let best = null;
  let bestDist = Infinity;

  for (const e of existing) {
    const d = levenshtein(norm, normalize(e.name));
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  }

  if (!best || bestDist > AMBIGUOUS_THRESHOLD) {
    return { status: 'new', similarity: bestDist };
  }
  if (bestDist <= MATCH_THRESHOLD) {
    return { status: 'match', suggested_id: best.id, similarity: bestDist };
  }
  return { status: 'ambiguous', suggested_id: best.id, similarity: bestDist };
}

/** Convenience: dedupe a flat name list into match results. */
export function dedupeNames(names, existing) {
  return names.map((name) => ({ name, ...findMatch(name, existing) }));
}

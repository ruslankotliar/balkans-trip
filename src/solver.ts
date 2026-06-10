/**
 * Local TSP-path solvers over an OSRM duration matrix.
 *
 * The problem is always a PATH with fixed start and end (not a cycle):
 * start → (visit every middle node once) → end, minimizing total duration.
 *
 * - ≤ 12 middle nodes (≤ 14 waypoints): exact Held-Karp DP — guaranteed optimum.
 * - larger: nearest-neighbor + randomized restarts, improved with 2-opt + or-opt.
 */

export interface SolveResult {
  /** Matrix indices in visiting order, starting with `start`, ending with `end`. */
  order: number[];
  /** True when the order is a provable optimum (Held-Karp). */
  exact: boolean;
  /** Total path duration in matrix units (seconds). */
  cost: number;
}

const EXACT_MAX_MIDDLE = 12; // 2^12 * 12^2 ≈ 590k ops — instant

export function pathCost(dur: number[][], order: number[]): number {
  let c = 0;
  for (let i = 0; i < order.length - 1; i++) c += dur[order[i]][order[i + 1]];
  return c;
}

/**
 * Solve start → all middle → end. `start`/`end` are indices into `dur`;
 * every other index is a middle node.
 */
export function solveOrder(dur: number[][], start: number, end: number): SolveResult {
  const n = dur.length;
  const middle: number[] = [];
  for (let i = 0; i < n; i++) if (i !== start && i !== end) middle.push(i);

  if (middle.length === 0) {
    return { order: [start, end], exact: true, cost: dur[start][end] };
  }
  if (middle.length <= EXACT_MAX_MIDDLE) {
    const order = heldKarp(dur, start, end, middle);
    return { order, exact: true, cost: pathCost(dur, order) };
  }
  const order = heuristicSolve(dur, start, end, middle);
  return { order, exact: false, cost: pathCost(dur, order) };
}

/** Exact Held-Karp DP over subsets of the middle nodes. */
function heldKarp(dur: number[][], start: number, end: number, middle: number[]): number[] {
  const m = middle.length;
  const full = 1 << m;
  // dp[mask * m + j] = min cost of start → (visit mask) ending at middle[j]
  const dp = new Float64Array(full * m).fill(Infinity);
  const parent = new Int16Array(full * m).fill(-1);

  for (let j = 0; j < m; j++) dp[(1 << j) * m + j] = dur[start][middle[j]];

  for (let mask = 1; mask < full; mask++) {
    for (let j = 0; j < m; j++) {
      if (!(mask & (1 << j))) continue;
      const cur = dp[mask * m + j];
      if (cur === Infinity) continue;
      for (let k = 0; k < m; k++) {
        if (mask & (1 << k)) continue;
        const nmask = mask | (1 << k);
        const cand = cur + dur[middle[j]][middle[k]];
        if (cand < dp[nmask * m + k]) {
          dp[nmask * m + k] = cand;
          parent[nmask * m + k] = j;
        }
      }
    }
  }

  let best = Infinity;
  let bestJ = 0;
  const last = full - 1;
  for (let j = 0; j < m; j++) {
    const cand = dp[last * m + j] + dur[middle[j]][end];
    if (cand < best) {
      best = cand;
      bestJ = j;
    }
  }

  // Reconstruct.
  const rev: number[] = [];
  let mask = last;
  let j = bestJ;
  while (j >= 0) {
    rev.push(middle[j]);
    const pj = parent[mask * m + j];
    mask &= ~(1 << j);
    j = pj;
  }
  return [start, ...rev.reverse(), end];
}

/** Nearest-neighbor + randomized restarts, each polished with 2-opt + or-opt. */
function heuristicSolve(
  dur: number[][],
  start: number,
  end: number,
  middle: number[],
): number[] {
  const tours: number[][] = [nearestNeighbor(dur, start, end, middle)];
  // Deterministic-ish restarts: seeded shuffles of the middle section.
  let seed = 12345;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let r = 0; r < 8; r++) {
    const shuffled = [...middle];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const k = Math.floor(rand() * (i + 1));
      [shuffled[i], shuffled[k]] = [shuffled[k], shuffled[i]];
    }
    tours.push([start, ...shuffled, end]);
  }

  let best: number[] | null = null;
  let bestCost = Infinity;
  for (const t of tours) {
    const improved = orOpt(dur, twoOpt(dur, t));
    const c = pathCost(dur, improved);
    if (c < bestCost) {
      bestCost = c;
      best = improved;
    }
  }
  return best!;
}

function nearestNeighbor(
  dur: number[][],
  start: number,
  end: number,
  middle: number[],
): number[] {
  const remaining = new Set(middle);
  const order = [start];
  let cur = start;
  while (remaining.size > 0) {
    let best = -1;
    let bestD = Infinity;
    for (const i of remaining) {
      if (dur[cur][i] < bestD) {
        bestD = dur[cur][i];
        best = i;
      }
    }
    order.push(best);
    remaining.delete(best);
    cur = best;
  }
  order.push(end);
  return order;
}

/** 2-opt for a path with fixed endpoints: reverse interior segments while it helps. */
function twoOpt(dur: number[][], tour: number[]): number[] {
  const t = [...tour];
  const n = t.length;
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        // Reversing t[i..j] changes edges (i-1,i) and (j,j+1).
        const delta =
          dur[t[i - 1]][t[j]] + dur[t[i]][t[j + 1]] -
          (dur[t[i - 1]][t[i]] + dur[t[j]][t[j + 1]]);
        if (delta < -1e-9) {
          let a = i;
          let b = j;
          while (a < b) {
            [t[a], t[b]] = [t[b], t[a]];
            a++;
            b--;
          }
          improved = true;
        }
      }
    }
  }
  return t;
}

/** Or-opt: relocate chains of 1–3 consecutive interior nodes while it helps. */
function orOpt(dur: number[][], tour: number[]): number[] {
  let t = [...tour];
  const n = t.length;
  let improved = true;
  while (improved) {
    improved = false;
    for (let len = 1; len <= 3; len++) {
      for (let i = 1; i + len - 1 < n - 1; i++) {
        const segStart = i;
        const segEnd = i + len - 1; // inclusive
        const removeGain =
          dur[t[segStart - 1]][t[segStart]] +
          dur[t[segEnd]][t[segEnd + 1]] -
          dur[t[segStart - 1]][t[segEnd + 1]];
        // Try inserting the chain between every other adjacent pair.
        for (let j = 0; j < n - 1; j++) {
          if (j >= segStart - 1 && j <= segEnd) continue;
          const insertCost =
            dur[t[j]][t[segStart]] + dur[t[segEnd]][t[j + 1]] - dur[t[j]][t[j + 1]];
          if (insertCost - removeGain < -1e-9) {
            const seg = t.slice(segStart, segEnd + 1);
            const rest = [...t.slice(0, segStart), ...t.slice(segEnd + 1)];
            const at = j < segStart ? j + 1 : j + 1 - len;
            t = [...rest.slice(0, at), ...seg, ...rest.slice(at)];
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
      if (improved) break;
    }
  }
  return t;
}

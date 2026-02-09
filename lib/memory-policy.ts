/**
 * Hippo Reasoning — Memory Policy Module
 *
 * Outcome-driven memory policies for scoring, filtering, and retaining
 * reasoning traces. Zero external dependencies — all scoring heuristics
 * are simple and deterministic.
 */

import type { ReasoningTrace } from './hippo';

// ─── Score Types ─────────────────────────────────────────────────────

export interface TraceScore {
  traceId: string;
  /** Content quality: summary length, tool diversity (0-100) */
  quality: number;
  /** How useful the trace is: tool calls, step count (0-100) */
  usefulness: number;
  /** Execution efficiency: latency per step, total duration (0-100) */
  efficiency: number;
  /** Weighted composite of quality, usefulness, efficiency (0-100) */
  overall: number;
}

// ─── Scoring ─────────────────────────────────────────────────────────

/**
 * Clamp a number to the 0-100 range.
 */
function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Score a reasoning trace across three dimensions and compute a weighted
 * overall score.
 *
 * Heuristics are intentionally simple and deterministic:
 *
 * **quality** (weight 0.35)
 *   - Starts at 50
 *   - Penalise very short summaries (< 100 chars): -30
 *   - Reward summaries >= 200 chars: +15
 *   - Reward tool usage diversity: +10 per unique tool, up to +30
 *   - Penalise zero-step traces: -40
 *
 * **usefulness** (weight 0.40)
 *   - Base proportional to step count, capped at 20 steps for full marks
 *   - Bonus for tool calls: +5 per unique tool, capped at +25
 *   - Bonus for having a summary at all: +10
 *
 * **efficiency** (weight 0.25)
 *   - Base: 100 minus a latency-per-step penalty
 *     (steps with < 1 s/step = full marks; each extra second costs 5 pts)
 *   - Penalise traces exceeding 60 s total: -1 per extra second, up to -40
 */
export function scoreTrace(trace: ReasoningTrace): TraceScore {
  // ── quality ────────────────────────────────────────────────────────
  let quality = 50;

  const summaryLen = (trace.summary ?? '').length;
  if (summaryLen < 100) {
    quality -= 30;
  } else if (summaryLen >= 200) {
    quality += 15;
  }

  const uniqueTools = trace.toolsUsed.length;
  quality += Math.min(uniqueTools * 10, 30);

  if (trace.stepCount === 0) {
    quality -= 40;
  }

  quality = clamp(quality);

  // ── usefulness ─────────────────────────────────────────────────────
  const cappedSteps = Math.min(trace.stepCount, 20);
  let usefulness = (cappedSteps / 20) * 65; // 0-65 from step count

  usefulness += Math.min(uniqueTools * 5, 25);

  if (trace.summary) {
    usefulness += 10;
  }

  usefulness = clamp(usefulness);

  // ── efficiency ─────────────────────────────────────────────────────
  let efficiency = 100;

  if (trace.stepCount > 0) {
    const msPerStep = trace.totalLatencyMs / trace.stepCount;
    const secondsPerStep = msPerStep / 1000;
    // Each second above 1 s/step costs 5 points
    if (secondsPerStep > 1) {
      efficiency -= (secondsPerStep - 1) * 5;
    }
  }

  // Penalise traces over 60 seconds total
  const totalSeconds = trace.totalLatencyMs / 1000;
  if (totalSeconds > 60) {
    efficiency -= Math.min((totalSeconds - 60), 40);
  }

  // A zero-step trace with zero latency isn't "efficient" — it's empty
  if (trace.stepCount === 0) {
    efficiency = 0;
  }

  efficiency = clamp(efficiency);

  // ── overall (weighted) ─────────────────────────────────────────────
  const overall = clamp(
    quality * 0.35 + usefulness * 0.40 + efficiency * 0.25
  );

  return {
    traceId: trace.id,
    quality,
    usefulness,
    efficiency,
    overall,
  };
}

// ─── Policy Interface ────────────────────────────────────────────────

export interface MemoryPolicy {
  id: string;
  name: string;
  /** Maximum number of traces to retain */
  maxTraces: number;
  /** Minimum overall score required to retain a trace (0-100) */
  minScore: number;
  /** How much the overall score decays per hour (0-1) */
  decayRate: number;
  /** Custom retention predicate — return false to evict */
  shouldRetain: (trace: ReasoningTrace, score: TraceScore, ageHours: number) => boolean;
}

// ─── Built-in Policies ───────────────────────────────────────────────

/**
 * Aggressive: only keep high-quality traces, fast decay.
 * Good for production systems with tight memory budgets.
 */
export const AGGRESSIVE_POLICY: MemoryPolicy = {
  id: 'aggressive',
  name: 'Aggressive',
  maxTraces: 50,
  minScore: 60,
  decayRate: 0.1,
  shouldRetain: (_trace, score, ageHours) => {
    const decayedScore = score.overall - ageHours * 0.1 * 100;
    return decayedScore >= 60;
  },
};

/**
 * Balanced: reasonable retention with moderate decay.
 * Default policy for most use cases.
 */
export const BALANCED_POLICY: MemoryPolicy = {
  id: 'balanced',
  name: 'Balanced',
  maxTraces: 200,
  minScore: 30,
  decayRate: 0.05,
  shouldRetain: (_trace, score, ageHours) => {
    const decayedScore = score.overall - ageHours * 0.05 * 100;
    return decayedScore >= 30;
  },
};

/**
 * Archive All: keep everything with no decay.
 * Useful for analysis, debugging, and dataset building.
 */
export const ARCHIVE_ALL_POLICY: MemoryPolicy = {
  id: 'archive-all',
  name: 'Archive All',
  maxTraces: 1000,
  minScore: 0,
  decayRate: 0,
  shouldRetain: () => true,
};

// ─── Policy Application ──────────────────────────────────────────────

/**
 * Apply a memory policy to a list of traces.
 *
 * 1. Score every trace
 * 2. Filter out traces below minScore or rejected by shouldRetain
 * 3. Sort by decayed overall score (highest first)
 * 4. Truncate to maxTraces
 *
 * Returns a new array — the input is not mutated.
 */
export function applyPolicy(
  traces: ReasoningTrace[],
  policy: MemoryPolicy,
): ReasoningTrace[] {
  const now = Date.now();

  // Score and annotate
  const scored = traces.map(trace => {
    const score = scoreTrace(trace);
    const ageHours = (now - trace.completedAt) / (1000 * 60 * 60);
    const decayedOverall = clamp(
      score.overall - ageHours * policy.decayRate * 100
    );
    return { trace, score, ageHours, decayedOverall };
  });

  // Filter: minScore on raw overall, then custom retention check
  const retained = scored.filter(({ trace, score, ageHours }) => {
    if (score.overall < policy.minScore) return false;
    return policy.shouldRetain(trace, score, ageHours);
  });

  // Sort by decayed score descending (best traces first)
  retained.sort((a, b) => b.decayedOverall - a.decayedOverall);

  // Truncate to maxTraces
  const final = retained.slice(0, policy.maxTraces);

  // Return traces (optionally stamp the score)
  return final.map(({ trace, score }) => ({
    ...trace,
    score: score.overall,
  }));
}

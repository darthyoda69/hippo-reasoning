/**
 * Hippo Reasoning — Vercel KV Persistent Storage
 *
 * KV-backed implementations of MemoryStore and RegressionStore.
 * Auto-serializes JSON, uses key prefixes, supports TTL.
 * Falls back to in-memory when KV_REST_API_URL is not set.
 */

import { kv } from '@vercel/kv';
import type { ReasoningTrace, RegressionTest, RegressionRun } from './hippo';

const TRACE_TTL = 60 * 60 * 24; // 24 hours
const TRACE_PREFIX = 'trace:';
const SESSION_PREFIX = 'session:';
const TEST_PREFIX = 'test:';
const TEST_INDEX = 'test:index';

// ─── KV Memory Store ─────────────────────────────────────────────

export class KVMemoryStore {
  async store(trace: ReasoningTrace): Promise<void> {
    // Store trace with TTL
    await kv.set(`${TRACE_PREFIX}${trace.id}`, trace, { ex: TRACE_TTL });

    // Update session index
    const sessionKey = `${SESSION_PREFIX}${trace.sessionId}`;
    const existing = await kv.get<string[]>(sessionKey) ?? [];
    existing.push(trace.id);
    await kv.set(sessionKey, existing, { ex: TRACE_TTL });
  }

  async get(traceId: string): Promise<ReasoningTrace | undefined> {
    const trace = await kv.get<ReasoningTrace>(`${TRACE_PREFIX}${traceId}`);
    return trace ?? undefined;
  }

  async getBySession(sessionId: string): Promise<ReasoningTrace[]> {
    const ids = await kv.get<string[]>(`${SESSION_PREFIX}${sessionId}`) ?? [];
    const traces: ReasoningTrace[] = [];

    for (const id of ids) {
      const trace = await kv.get<ReasoningTrace>(`${TRACE_PREFIX}${id}`);
      if (trace) traces.push(trace);
    }

    return traces.sort((a, b) => b.startedAt - a.startedAt);
  }

  async getAll(): Promise<ReasoningTrace[]> {
    const keys: string[] = [];

    // Scan for all trace keys
    let cursor = 0;
    do {
      const [nextCursor, batch] = await kv.scan(cursor, { match: `${TRACE_PREFIX}*`, count: 100 });
      cursor = Number(nextCursor);
      keys.push(...(batch as string[]));
    } while (cursor !== 0);

    const traces: ReasoningTrace[] = [];
    for (const key of keys) {
      const trace = await kv.get<ReasoningTrace>(key);
      if (trace) traces.push(trace);
    }

    return traces.sort((a, b) => b.startedAt - a.startedAt);
  }

  async getReasoningContext(query: string, sessionId: string, maxTraces = 3): Promise<string> {
    const sessionTraces = await this.getBySession(sessionId);
    if (sessionTraces.length === 0) return '';

    const relevant = sessionTraces.slice(0, maxTraces);

    return relevant.map(trace => {
      const toolSteps = trace.steps
        .filter(s => s.type === 'tool_call')
        .map(s => `  - ${s.metadata?.toolName}(${JSON.stringify(s.metadata?.toolArgs)})`)
        .join('\n');

      return [
        `[Past reasoning trace — "${trace.query}"]`,
        trace.summary ? `Summary: ${trace.summary}` : '',
        toolSteps ? `Tools used:\n${toolSteps}` : '',
        `Result: ${trace.steps.find(s => s.type === 'assistant_message')?.content?.slice(0, 200) ?? 'N/A'}`,
        `---`,
      ].filter(Boolean).join('\n');
    }).join('\n\n');
  }

  async clear(): Promise<void> {
    // Delete all trace keys
    let cursor = 0;
    do {
      const [nextCursor, batch] = await kv.scan(cursor, { match: `${TRACE_PREFIX}*`, count: 100 });
      cursor = Number(nextCursor);
      for (const key of batch as string[]) {
        await kv.del(key);
      }
    } while (cursor !== 0);

    // Delete all session keys
    cursor = 0;
    do {
      const [nextCursor, batch] = await kv.scan(cursor, { match: `${SESSION_PREFIX}*`, count: 100 });
      cursor = Number(nextCursor);
      for (const key of batch as string[]) {
        await kv.del(key);
      }
    } while (cursor !== 0);
  }

  async getSize(): Promise<number> {
    let count = 0;
    let cursor = 0;
    do {
      const [nextCursor, batch] = await kv.scan(cursor, { match: `${TRACE_PREFIX}*`, count: 100 });
      cursor = Number(nextCursor);
      count += (batch as string[]).length;
    } while (cursor !== 0);
    return count;
  }

  async getStats(): Promise<{ totalTraces: number; avgSteps: number; avgLatencyMs: number; totalToolCalls: number }> {
    const all = await this.getAll();
    if (all.length === 0) return { totalTraces: 0, avgSteps: 0, avgLatencyMs: 0, totalToolCalls: 0 };

    return {
      totalTraces: all.length,
      avgSteps: Math.round(all.reduce((sum, t) => sum + t.stepCount, 0) / all.length),
      avgLatencyMs: Math.round(all.reduce((sum, t) => sum + t.totalLatencyMs, 0) / all.length),
      totalToolCalls: all.reduce((sum, t) => sum + t.toolsUsed.length, 0),
    };
  }
}

// ─── KV Regression Store ────────────────────────────────────────

export class KVRegressionStore {
  async createFromTrace(trace: ReasoningTrace, name?: string): Promise<RegressionTest> {
    const test: RegressionTest = {
      id: `reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name ?? `Regression: ${trace.query.slice(0, 50)}`,
      sourceTraceId: trace.id,
      query: trace.query,
      expectedToolCalls: trace.toolsUsed,
      expectedStepCount: trace.stepCount,
      minScore: 70,
      createdAt: Date.now(),
      runs: [],
    };

    await kv.set(`${TEST_PREFIX}${test.id}`, test);

    // Update index
    const index = await kv.get<string[]>(TEST_INDEX) ?? [];
    index.push(test.id);
    await kv.set(TEST_INDEX, index);

    return test;
  }

  async get(id: string): Promise<RegressionTest | undefined> {
    const test = await kv.get<RegressionTest>(`${TEST_PREFIX}${id}`);
    return test ?? undefined;
  }

  async getAll(): Promise<RegressionTest[]> {
    const index = await kv.get<string[]>(TEST_INDEX) ?? [];
    const tests: RegressionTest[] = [];

    for (const id of index) {
      const test = await kv.get<RegressionTest>(`${TEST_PREFIX}${id}`);
      if (test) tests.push(test);
    }

    return tests.sort((a, b) => b.createdAt - a.createdAt);
  }

  async addRun(testId: string, run: RegressionRun): Promise<void> {
    const test = await kv.get<RegressionTest>(`${TEST_PREFIX}${testId}`);
    if (test) {
      test.runs.push(run);
      test.lastRunAt = run.timestamp;
      test.lastRunPassed = run.passed;
      await kv.set(`${TEST_PREFIX}${testId}`, test);
    }
  }

  async delete(id: string): Promise<boolean> {
    await kv.del(`${TEST_PREFIX}${id}`);

    // Update index
    const index = await kv.get<string[]>(TEST_INDEX) ?? [];
    const filtered = index.filter(i => i !== id);
    await kv.set(TEST_INDEX, filtered);

    return true;
  }

  async getSize(): Promise<number> {
    const index = await kv.get<string[]>(TEST_INDEX) ?? [];
    return index.length;
  }
}

/**
 * Hippo Reasoning — Core Library
 * Reasoning memory (traces + replay + eval) for Vercel AI SDK agents
 *
 * Storage: in-memory by default, Vercel KV when KV_REST_API_URL is set.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface TraceStep {
  id: string;
  type: 'user_message' | 'assistant_message' | 'tool_call' | 'tool_result' | 'reasoning';
  content: string;
  metadata?: {
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    latencyMs?: number;
    tokenCount?: number;
  };
  timestamp: number;
}

export interface ReasoningTrace {
  id: string;
  sessionId: string;
  query: string;
  steps: TraceStep[];
  startedAt: number;
  completedAt: number;
  totalLatencyMs: number;
  toolsUsed: string[];
  stepCount: number;
  summary?: string;
}

export interface EvalResult {
  traceId: string;
  withMemory: { score: number; breakdown: EvalBreakdown };
  withoutMemory: { score: number; breakdown: EvalBreakdown };
  delta: number;
  deltaPercent: number;
}

export interface EvalBreakdown {
  relevance: number;
  completeness: number;
  reasoning: number;
  toolUsage: number;
}

export interface BenchmarkResult {
  task: string;
  withMemoryScore: number;
  withoutMemoryScore: number;
  delta: number;
  tracingOverheadMs: number;
  traceSizeBytes: number;
}

export interface RegressionTest {
  id: string;
  name: string;
  sourceTraceId: string;
  query: string;
  expectedToolCalls: string[];
  expectedStepCount: number;
  minScore: number;
  createdAt: number;
  lastRunAt?: number;
  lastRunPassed?: boolean;
  runs: RegressionRun[];
}

export interface RegressionRun {
  id: string;
  timestamp: number;
  passed: boolean;
  score: number;
  actualToolCalls: string[];
  actualStepCount: number;
  delta: number;
}

// ─── Store Interfaces ───────────────────────────────────────────────

export interface IMemoryStore {
  store(trace: ReasoningTrace): Promise<void>;
  get(traceId: string): Promise<ReasoningTrace | undefined>;
  getBySession(sessionId: string): Promise<ReasoningTrace[]>;
  getAll(): Promise<ReasoningTrace[]>;
  getReasoningContext(query: string, sessionId: string, maxTraces?: number): Promise<string>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
  getStats(): Promise<{ totalTraces: number; avgSteps: number; avgLatencyMs: number; totalToolCalls: number }>;
}

export interface IRegressionStore {
  createFromTrace(trace: ReasoningTrace, name?: string): Promise<RegressionTest>;
  get(id: string): Promise<RegressionTest | undefined>;
  getAll(): Promise<RegressionTest[]>;
  addRun(testId: string, run: RegressionRun): Promise<void>;
  delete(id: string): Promise<boolean>;
  getSize(): Promise<number>;
}

// ─── Trace Builder ───────────────────────────────────────────────────

export class TraceBuilder {
  private steps: TraceStep[] = [];
  private startTime: number;
  private stepCounter = 0;

  constructor(
    public readonly traceId: string,
    public readonly sessionId: string,
    public readonly query: string,
  ) {
    this.startTime = Date.now();
  }

  addStep(type: TraceStep['type'], content: string, metadata?: TraceStep['metadata']): void {
    const now = Date.now();
    this.steps.push({
      id: `step-${++this.stepCounter}`,
      type,
      content,
      metadata: {
        ...metadata,
        latencyMs: this.steps.length > 0
          ? now - this.steps[this.steps.length - 1].timestamp
          : now - this.startTime,
      },
      timestamp: now,
    });
  }

  complete(summary?: string): ReasoningTrace {
    const completedAt = Date.now();
    const toolsUsed = [...new Set(
      this.steps
        .filter(s => s.type === 'tool_call' && s.metadata?.toolName)
        .map(s => s.metadata!.toolName!)
    )];

    return {
      id: this.traceId,
      sessionId: this.sessionId,
      query: this.query,
      steps: this.steps,
      startedAt: this.startTime,
      completedAt,
      totalLatencyMs: completedAt - this.startTime,
      toolsUsed,
      stepCount: this.steps.length,
      summary,
    };
  }
}

// ─── In-Memory Store (default) ──────────────────────────────────────

class MemoryStore implements IMemoryStore {
  private traces: Map<string, ReasoningTrace> = new Map();
  private sessionTraces: Map<string, string[]> = new Map();

  async store(trace: ReasoningTrace): Promise<void> {
    this.traces.set(trace.id, trace);
    const sessionList = this.sessionTraces.get(trace.sessionId) ?? [];
    sessionList.push(trace.id);
    this.sessionTraces.set(trace.sessionId, sessionList);
  }

  async get(traceId: string): Promise<ReasoningTrace | undefined> {
    return this.traces.get(traceId);
  }

  async getBySession(sessionId: string): Promise<ReasoningTrace[]> {
    const ids = this.sessionTraces.get(sessionId) ?? [];
    return ids.map(id => this.traces.get(id)!).filter(Boolean);
  }

  async getAll(): Promise<ReasoningTrace[]> {
    return Array.from(this.traces.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  async getReasoningContext(query: string, sessionId: string, maxTraces = 3): Promise<string> {
    const sessionTraces = await this.getBySession(sessionId);
    if (sessionTraces.length === 0) return '';

    const relevant = sessionTraces
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, maxTraces);

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
    this.traces.clear();
    this.sessionTraces.clear();
  }

  async getSize(): Promise<number> {
    return this.traces.size;
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

// ─── In-Memory Regression Store ─────────────────────────────────────

class RegressionStore implements IRegressionStore {
  private tests: Map<string, RegressionTest> = new Map();

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
    this.tests.set(test.id, test);
    return test;
  }

  async get(id: string): Promise<RegressionTest | undefined> {
    return this.tests.get(id);
  }

  async getAll(): Promise<RegressionTest[]> {
    return Array.from(this.tests.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  async addRun(testId: string, run: RegressionRun): Promise<void> {
    const test = this.tests.get(testId);
    if (test) {
      test.runs.push(run);
      test.lastRunAt = run.timestamp;
      test.lastRunPassed = run.passed;
    }
  }

  async delete(id: string): Promise<boolean> {
    return this.tests.delete(id);
  }

  async getSize(): Promise<number> {
    return this.tests.size;
  }
}

// ─── Singleton Exports ──────────────────────────────────────────────
// Use Vercel KV when configured, otherwise in-memory.
// globalThis ensures the singleton persists across serverless invocations
// (module-level vars can be re-initialized if bundler creates separate chunks).

const GLOBAL_KEY = '__hippo_stores__' as const;

function createStores(): { memory: IMemoryStore; regressions: IRegressionStore } {
  if (process.env.KV_REST_API_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { KVMemoryStore, KVRegressionStore } = require('./kv-store');
      console.log('[hippo] Using Vercel KV persistent storage');
      return { memory: new KVMemoryStore(), regressions: new KVRegressionStore() };
    } catch {
      console.log('[hippo] @vercel/kv not installed, falling back to in-memory');
    }
  }
  console.log('[hippo] Using in-memory storage (data resets on cold start)');
  return { memory: new MemoryStore(), regressions: new RegressionStore() };
}

function getStores(): { memory: IMemoryStore; regressions: IRegressionStore } {
  const g = globalThis as Record<string, unknown>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createStores();
  }
  return g[GLOBAL_KEY] as { memory: IMemoryStore; regressions: IRegressionStore };
}

const stores = getStores();
export const hippoMemory: IMemoryStore = stores.memory;
export const hippoRegressions: IRegressionStore = stores.regressions;

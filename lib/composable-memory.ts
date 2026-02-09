/**
 * Hippo Reasoning — Composable Memory Integration Layer
 *
 * Enables plugging external memory systems (Mem0, Zep, etc.) into the
 * hippo reasoning pipeline via a unified MemoryAdapter interface.
 *
 * Adapters are fire-and-forget on writes and best-effort on reads —
 * failures in any adapter never break the core IMemoryStore contract.
 */

import type { IMemoryStore, ReasoningTrace } from './hippo';

// ─── MemoryAdapter Interface ────────────────────────────────────────

export interface MemoryAdapter {
  /** Unique identifier for this adapter instance */
  id: string;
  /** Human-readable name */
  name: string;
  /** Store data under a key */
  store(key: string, data: unknown): Promise<void>;
  /** Retrieve data by key, null if not found */
  retrieve(key: string): Promise<unknown | null>;
  /** Search for relevant entries, returning scored results */
  search(query: string, limit?: number): Promise<Array<{ key: string; data: unknown; score: number }>>;
  /** Delete data by key */
  delete(key: string): Promise<void>;
}

// ─── Mem0 Adapter ───────────────────────────────────────────────────

const MEM0_BASE_URL = 'https://api.mem0.ai/v1/memories';

export class Mem0Adapter implements MemoryAdapter {
  readonly id = 'mem0';
  readonly name = 'Mem0 Cloud';
  private apiKey: string;
  private userId: string;

  constructor(apiKey: string, userId = 'hippo-reasoning') {
    this.apiKey = apiKey;
    this.userId = userId;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async store(key: string, data: unknown): Promise<void> {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    const response = await fetch(MEM0_BASE_URL, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        messages: [{ role: 'user', content }],
        user_id: this.userId,
        metadata: { hippo_key: key },
      }),
    });

    if (!response.ok) {
      throw new Error(`Mem0 store failed: ${response.status} ${response.statusText}`);
    }
  }

  async retrieve(key: string): Promise<unknown | null> {
    // Mem0 retrieves by memory ID; we use key as the memory ID
    const response = await fetch(`${MEM0_BASE_URL}/${encodeURIComponent(key)}`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`Mem0 retrieve failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async search(query: string, limit = 5): Promise<Array<{ key: string; data: unknown; score: number }>> {
    const response = await fetch(`${MEM0_BASE_URL}/search`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        query,
        user_id: this.userId,
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mem0 search failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.json() as { results?: Array<{ id: string; memory: string; score: number }> };
    const results = body.results ?? [];

    return results.map((r) => ({
      key: r.id,
      data: r.memory,
      score: r.score,
    }));
  }

  async delete(key: string): Promise<void> {
    const response = await fetch(`${MEM0_BASE_URL}/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: this.headers(),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Mem0 delete failed: ${response.status} ${response.statusText}`);
    }
  }
}

// ─── Zep Adapter ────────────────────────────────────────────────────

const ZEP_BASE_URL = 'https://api.getzep.com/api/v2';

export class ZepAdapter implements MemoryAdapter {
  readonly id = 'zep';
  readonly name = 'Zep Cloud';
  private apiKey: string;
  private sessionId: string;

  constructor(apiKey: string, sessionId = 'hippo-reasoning') {
    this.apiKey = apiKey;
    this.sessionId = sessionId;
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  async store(key: string, data: unknown): Promise<void> {
    const content = typeof data === 'string' ? data : JSON.stringify(data);

    // Store as a memory message in the session
    const response = await fetch(`${ZEP_BASE_URL}/sessions/${encodeURIComponent(this.sessionId)}/memory`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        messages: [
          {
            role_type: 'assistant',
            content,
            metadata: { hippo_key: key },
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Zep store failed: ${response.status} ${response.statusText}`);
    }
  }

  async retrieve(key: string): Promise<unknown | null> {
    // Zep retrieves session memory; we fetch and filter by key in metadata
    const response = await fetch(`${ZEP_BASE_URL}/sessions/${encodeURIComponent(this.sessionId)}/memory`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`Zep retrieve failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.json() as {
      messages?: Array<{ content: string; metadata?: { hippo_key?: string } }>;
    };

    const match = body.messages?.find((m) => m.metadata?.hippo_key === key);
    if (!match) return null;

    try {
      return JSON.parse(match.content);
    } catch {
      return match.content;
    }
  }

  async search(query: string, limit = 5): Promise<Array<{ key: string; data: unknown; score: number }>> {
    const response = await fetch(`${ZEP_BASE_URL}/sessions/${encodeURIComponent(this.sessionId)}/search`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        text: query,
        search_type: 'similarity',
        limit,
      }),
    });

    if (!response.ok) {
      throw new Error(`Zep search failed: ${response.status} ${response.statusText}`);
    }

    const body = await response.json() as {
      results?: Array<{
        message?: { content: string; metadata?: { hippo_key?: string } };
        score?: number;
      }>;
    };

    const results = body.results ?? [];

    return results
      .filter((r) => r.message)
      .map((r) => ({
        key: r.message!.metadata?.hippo_key ?? 'unknown',
        data: r.message!.content,
        score: r.score ?? 0,
      }));
  }

  async delete(key: string): Promise<void> {
    // Zep does not support deleting individual messages by metadata key.
    // We delete the entire session memory as a fallback when the key matches the session.
    // For individual message deletion, this is a no-op with a warning.
    if (key === this.sessionId) {
      const response = await fetch(`${ZEP_BASE_URL}/sessions/${encodeURIComponent(this.sessionId)}/memory`, {
        method: 'DELETE',
        headers: this.headers(),
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Zep delete failed: ${response.status} ${response.statusText}`);
      }
    }
    // Individual message deletion is not supported by Zep's API;
    // silently skip to avoid breaking the flow.
  }
}

// ─── Composable Memory Store ────────────────────────────────────────

export class ComposableMemoryStore implements IMemoryStore {
  private baseStore: IMemoryStore;
  private adapters: Map<string, MemoryAdapter>;

  constructor(baseStore: IMemoryStore, adapters: MemoryAdapter[] = []) {
    this.baseStore = baseStore;
    this.adapters = new Map(adapters.map((a) => [a.id, a]));
  }

  /** Register an external memory adapter */
  addAdapter(adapter: MemoryAdapter): void {
    this.adapters.set(adapter.id, adapter);
    console.log(`[hippo:composable] Added adapter: ${adapter.name} (${adapter.id})`);
  }

  /** Remove an adapter by its id */
  removeAdapter(id: string): boolean {
    const removed = this.adapters.delete(id);
    if (removed) {
      console.log(`[hippo:composable] Removed adapter: ${id}`);
    }
    return removed;
  }

  /** List currently registered adapters */
  getAdapters(): Array<{ id: string; name: string }> {
    return Array.from(this.adapters.values()).map((a) => ({ id: a.id, name: a.name }));
  }

  // ── IMemoryStore implementation ───────────────────────────────────

  async store(trace: ReasoningTrace): Promise<void> {
    // Always store in the base store first (blocking)
    await this.baseStore.store(trace);

    // Push to all adapters (fire-and-forget, never block the main flow)
    for (const adapter of this.adapters.values()) {
      this.pushToAdapter(adapter, trace).catch(() => {
        // Errors are already logged inside pushToAdapter
      });
    }
  }

  async get(traceId: string): Promise<ReasoningTrace | undefined> {
    return this.baseStore.get(traceId);
  }

  async getBySession(sessionId: string): Promise<ReasoningTrace[]> {
    return this.baseStore.getBySession(sessionId);
  }

  async getAll(): Promise<ReasoningTrace[]> {
    return this.baseStore.getAll();
  }

  async getReasoningContext(query: string, sessionId: string, maxTraces?: number): Promise<string> {
    // Get the base reasoning context
    const baseContext = await this.baseStore.getReasoningContext(query, sessionId, maxTraces);

    // Enrich with adapter search results (best-effort, parallel)
    const adapterContexts = await this.searchAdapters(query);

    if (adapterContexts.length === 0) return baseContext;

    const enrichment = adapterContexts
      .map((ctx) => `[External memory — ${ctx.adapterName}]\n${ctx.content}`)
      .join('\n\n');

    return baseContext
      ? `${baseContext}\n\n${enrichment}`
      : enrichment;
  }

  async clear(): Promise<void> {
    return this.baseStore.clear();
  }

  async getSize(): Promise<number> {
    return this.baseStore.getSize();
  }

  async getStats(): Promise<{ totalTraces: number; avgSteps: number; avgLatencyMs: number; totalToolCalls: number }> {
    return this.baseStore.getStats();
  }

  // ── Private helpers ───────────────────────────────────────────────

  /**
   * Push a trace to an external adapter. Serializes the trace
   * as a summary string that the memory system can index/search.
   */
  private async pushToAdapter(adapter: MemoryAdapter, trace: ReasoningTrace): Promise<void> {
    try {
      const summary = this.traceToSummary(trace);
      await adapter.store(trace.id, summary);
    } catch (err) {
      console.warn(
        `[hippo:composable] Adapter "${adapter.id}" store failed (non-blocking):`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  /**
   * Search all adapters in parallel and return formatted context snippets.
   */
  private async searchAdapters(query: string): Promise<Array<{ adapterName: string; content: string }>> {
    const results: Array<{ adapterName: string; content: string }> = [];

    const searches = Array.from(this.adapters.values()).map(async (adapter) => {
      try {
        const hits = await adapter.search(query, 3);
        if (hits.length > 0) {
          const content = hits
            .map((h) => {
              const dataStr = typeof h.data === 'string' ? h.data : JSON.stringify(h.data);
              return `  - (score: ${h.score.toFixed(2)}) ${dataStr.slice(0, 300)}`;
            })
            .join('\n');
          results.push({ adapterName: adapter.name, content });
        }
      } catch (err) {
        console.warn(
          `[hippo:composable] Adapter "${adapter.id}" search failed (non-blocking):`,
          err instanceof Error ? err.message : err,
        );
      }
    });

    await Promise.allSettled(searches);
    return results;
  }

  /**
   * Convert a ReasoningTrace into a human-readable summary string
   * suitable for storage in external memory systems.
   */
  private traceToSummary(trace: ReasoningTrace): string {
    const toolList = trace.toolsUsed.length > 0
      ? `Tools: ${trace.toolsUsed.join(', ')}`
      : 'No tools used';

    const assistantResponse = trace.steps
      .find((s) => s.type === 'assistant_message')
      ?.content?.slice(0, 300) ?? 'N/A';

    return [
      `Query: ${trace.query}`,
      trace.summary ? `Summary: ${trace.summary}` : null,
      toolList,
      `Steps: ${trace.stepCount}, Latency: ${trace.totalLatencyMs}ms`,
      `Result: ${assistantResponse}`,
    ].filter(Boolean).join('\n');
  }
}

// ─── Auto-Configuration ─────────────────────────────────────────────

/**
 * Checks environment variables and returns all available adapters.
 * - MEM0_API_KEY  -> Mem0Adapter
 * - ZEP_API_KEY   -> ZepAdapter
 */
export function getConfiguredAdapters(): MemoryAdapter[] {
  const adapters: MemoryAdapter[] = [];

  if (process.env.MEM0_API_KEY) {
    adapters.push(new Mem0Adapter(process.env.MEM0_API_KEY));
    console.log('[hippo:composable] Mem0 adapter configured');
  }

  if (process.env.ZEP_API_KEY) {
    adapters.push(new ZepAdapter(process.env.ZEP_API_KEY));
    console.log('[hippo:composable] Zep adapter configured');
  }

  if (adapters.length === 0) {
    console.log('[hippo:composable] No external memory adapters configured (set MEM0_API_KEY or ZEP_API_KEY)');
  }

  return adapters;
}

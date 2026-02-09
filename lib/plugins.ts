/**
 * Hippo Reasoning — Plugin System
 * Extensible trace processing via hooks and transforms.
 * Zero external dependencies. Failing plugins never crash the host.
 */

import type { TraceStep, ReasoningTrace } from './hippo';

// ─── Plugin Interface ──────────────────────────────────────────────

export interface TracePlugin {
  id: string;
  name: string;
  version: string;
  hooks: {
    onTraceStart?: (traceId: string, query: string) => void | Promise<void>;
    onStepAdded?: (traceId: string, step: TraceStep) => void | Promise<void>;
    onTraceComplete?: (trace: ReasoningTrace) => void | Promise<void>;
    transformTrace?: (trace: ReasoningTrace) => ReasoningTrace | Promise<ReasoningTrace>;
  };
}

// ─── Plugin Manager ────────────────────────────────────────────────

export class PluginManager {
  private plugins: Map<string, TracePlugin> = new Map();

  /** Register a plugin. Replaces any existing plugin with the same id. */
  register(plugin: TracePlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  /** Unregister a plugin by id. No-op if the plugin is not registered. */
  unregister(pluginId: string): void {
    this.plugins.delete(pluginId);
  }

  /** Return a snapshot of all registered plugins in registration order. */
  getPlugins(): TracePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Emit a hook event to all registered plugins, in registration order.
   * Each invocation is wrapped in try/catch — a failing plugin never
   * prevents subsequent plugins from running.
   */
  async emit(hook: string, ...args: unknown[]): Promise<void> {
    for (const plugin of this.plugins.values()) {
      const fn = plugin.hooks[hook as keyof TracePlugin['hooks']];
      if (typeof fn === 'function') {
        try {
          await (fn as (...a: unknown[]) => unknown)(...args);
        } catch (err) {
          console.error(
            `[hippo:plugin] Error in plugin "${plugin.id}" hook "${hook}":`,
            err,
          );
        }
      }
    }
  }

  /**
   * Run all transformTrace hooks as a pipeline: the output of one
   * plugin feeds into the next. If a plugin throws, the trace passes
   * through unchanged and execution continues with the next plugin.
   */
  async transform(trace: ReasoningTrace): Promise<ReasoningTrace> {
    let current = trace;
    for (const plugin of this.plugins.values()) {
      if (typeof plugin.hooks.transformTrace === 'function') {
        try {
          current = await plugin.hooks.transformTrace(current);
        } catch (err) {
          console.error(
            `[hippo:plugin] Error in plugin "${plugin.id}" transformTrace:`,
            err,
          );
        }
      }
    }
    return current;
  }
}

// ─── Built-in Plugins ──────────────────────────────────────────────

/** Logs trace lifecycle events to the console. */
export const loggingPlugin: TracePlugin = {
  id: 'hippo:logging',
  name: 'Logging Plugin',
  version: '1.0.0',
  hooks: {
    onTraceStart(traceId: string, query: string) {
      console.log(
        `[hippo:plugin:log] Trace started: ${traceId} | query: "${query}"`,
      );
    },
    onStepAdded(traceId: string, step: TraceStep) {
      console.log(
        `[hippo:plugin:log] Step added to ${traceId}: [${step.type}] ${step.content.slice(0, 120)}`,
      );
    },
    onTraceComplete(trace: ReasoningTrace) {
      console.log(
        `[hippo:plugin:log] Trace completed: ${trace.id} | ${trace.stepCount} steps | ${trace.totalLatencyMs}ms`,
      );
    },
  },
};

/** Warns when individual steps or total trace latency exceed thresholds. */
export const latencyAlertPlugin: TracePlugin = {
  id: 'hippo:latency-alert',
  name: 'Latency Alert Plugin',
  version: '1.0.0',
  hooks: {
    onStepAdded(_traceId: string, step: TraceStep) {
      const latency = step.metadata?.latencyMs;
      if (latency !== undefined && latency > 5000) {
        console.warn(
          `[hippo:plugin:latency] Step "${step.id}" exceeded 5 000 ms threshold: ${latency}ms`,
        );
      }
    },
    onTraceComplete(trace: ReasoningTrace) {
      if (trace.totalLatencyMs > 30000) {
        console.warn(
          `[hippo:plugin:latency] Trace "${trace.id}" exceeded 30 000 ms threshold: ${trace.totalLatencyMs}ms`,
        );
      }
    },
  },
};

/**
 * Scans trace content for patterns that look like API keys or email
 * addresses and replaces them with `[REDACTED]` in the transformTrace hook.
 */
export const sensitiveDataPlugin: TracePlugin = {
  id: 'hippo:sensitive-data',
  name: 'Sensitive Data Redaction Plugin',
  version: '1.0.0',
  hooks: {
    transformTrace(trace: ReasoningTrace): ReasoningTrace {
      const apiKeyPattern = /[A-Za-z0-9_-]{20,}(?:sk-|key-|api[_-])/gi;
      const emailPattern =
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

      function redact(text: string): string {
        return text
          .replace(apiKeyPattern, '[REDACTED]')
          .replace(emailPattern, '[REDACTED]');
      }

      const redactedSteps: TraceStep[] = trace.steps.map((step) => ({
        ...step,
        content: redact(step.content),
        metadata: step.metadata
          ? {
              ...step.metadata,
              toolArgs: step.metadata.toolArgs
                ? JSON.parse(redact(JSON.stringify(step.metadata.toolArgs)))
                : undefined,
            }
          : undefined,
      }));

      return {
        ...trace,
        query: redact(trace.query),
        steps: redactedSteps,
        summary: trace.summary ? redact(trace.summary) : undefined,
      };
    },
  },
};

// ─── Singleton ─────────────────────────────────────────────────────

export const pluginManager = new PluginManager();
pluginManager.register(loggingPlugin);
pluginManager.register(latencyAlertPlugin);
pluginManager.register(sensitiveDataPlugin);

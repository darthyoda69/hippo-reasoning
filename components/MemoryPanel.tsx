'use client';

import { useState } from 'react';
import type { ReasoningTrace } from '@/lib/hippo';

interface MemoryPanelProps {
  traces: ReasoningTrace[];
  onRefresh: () => void;
  sessionId: string;
}

export function MemoryPanel({ traces, onRefresh, sessionId }: MemoryPanelProps) {
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleClear = async () => {
    setClearing(true);
    try {
      await fetch('/api/traces', { method: 'DELETE' });
      onRefresh();
    } finally {
      setClearing(false);
    }
  };

  if (traces.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="text-2xl mb-3 opacity-30">🧠</div>
        <p className="text-sm text-[#444]">No reasoning traces stored yet</p>
        <p className="text-xs text-[#333] mt-1">
          Chat with the agent — traces are captured automatically
        </p>
      </div>
    );
  }

  const totalSteps = traces.reduce((sum, t) => sum + t.stepCount, 0);
  const avgLatency = Math.round(traces.reduce((sum, t) => sum + t.totalLatencyMs, 0) / traces.length);
  const allTools = [...new Set(traces.flatMap(t => t.toolsUsed))];

  return (
    <div className="h-full overflow-y-auto">
      {/* Stats bar */}
      <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#1e1e1e] px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[10px] text-[#555]">
            <span>{traces.length} traces</span>
            <span>{totalSteps} total steps</span>
            <span>{avgLatency}ms avg</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="text-[10px] text-[#555] hover:text-[#888] transition-colors"
            >
              refresh
            </button>
            <button
              onClick={handleClear}
              disabled={clearing}
              className="text-[10px] text-[#ff4444]/50 hover:text-[#ff4444] transition-colors"
            >
              {clearing ? 'clearing...' : 'clear all'}
            </button>
          </div>
        </div>
      </div>

      {/* Trace list */}
      <div className="p-3 space-y-2">
        {traces.map((trace) => (
          <div
            key={trace.id}
            className="border border-[#1e1e1e] rounded-lg overflow-hidden hover:border-[#333] transition-colors"
          >
            {/* Trace header */}
            <button
              onClick={() => setExpandedTrace(expandedTrace === trace.id ? null : trace.id)}
              className="w-full text-left px-3 py-2.5 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#ededed] truncate">{trace.query}</div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-[#555]">
                  <span>{trace.stepCount} steps</span>
                  <span>{trace.totalLatencyMs}ms</span>
                  {trace.toolsUsed.map(t => (
                    <span key={t} className="text-[#00d4ff]/60">{t}</span>
                  ))}
                </div>
              </div>
              <span className="text-[10px] text-[#333]">
                {expandedTrace === trace.id ? '▼' : '▶'}
              </span>
            </button>

            {/* Expanded trace steps */}
            {expandedTrace === trace.id && (
              <div className="border-t border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 space-y-1">
                {trace.steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-2 py-0.5">
                    <span className="text-[10px] w-16 text-right text-[#444] font-mono shrink-0">
                      {step.type === 'tool_call' ? '⚡ call' :
                       step.type === 'tool_result' ? '✓ result' :
                       step.type === 'user_message' ? '→ user' :
                       step.type === 'assistant_message' ? '← agent' : '💭'}
                    </span>
                    <span className="text-[10px] text-[#666] font-mono break-all">
                      {step.content.length > 150 ? step.content.slice(0, 150) + '...' : step.content}
                    </span>
                  </div>
                ))}

                {/* Summary */}
                {trace.summary && (
                  <div className="mt-2 pt-2 border-t border-[#1e1e1e]">
                    <span className="text-[10px] text-[#555]">Summary: </span>
                    <span className="text-[10px] text-[#888] font-mono">{trace.summary}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Memory context preview */}
      {traces.length > 0 && (
        <div className="border-t border-[#1e1e1e] px-4 py-3">
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">
            Active reasoning context
          </div>
          <div className="bg-[#111] rounded border border-[#1e1e1e] p-3 text-[10px] font-mono text-[#666] max-h-32 overflow-y-auto">
            {traces.slice(0, 3).map((t, i) => (
              <div key={t.id} className="mb-2">
                <span className="text-[#00d4ff]">[Trace {i + 1}]</span>{' '}
                <span className="text-[#888]">&quot;{t.query.slice(0, 60)}&quot;</span>
                <br />
                <span className="text-[#444]">
                  Tools: {t.toolsUsed.join(', ') || 'none'} | {t.stepCount} steps | {t.totalLatencyMs}ms
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#333] mt-2">
            This context is injected into the agent&apos;s system prompt when memory is ON.
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { ReasoningTrace, TraceStep } from '@/lib/hippo';

interface TracePanelProps {
  trace: ReasoningTrace | null;
  isStreaming: boolean;
}

const stepIcons: Record<TraceStep['type'], string> = {
  user_message: '→',
  assistant_message: '←',
  tool_call: '⚡',
  tool_result: '✓',
  reasoning: '💭',
};

const stepColors: Record<TraceStep['type'], string> = {
  user_message: '#888',
  assistant_message: '#ededed',
  tool_call: '#00d4ff',
  tool_result: '#00ff88',
  reasoning: '#ffaa00',
};

export function TracePanel({ trace, isStreaming }: TracePanelProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveAsRegression = async () => {
    if (!trace) return;
    setSaving(true);
    try {
      const res = await fetch('/api/regressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          traceId: trace.id,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!trace) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="text-2xl mb-3 opacity-30">⚡</div>
        <p className="text-sm text-[#444]">
          Send a message to see the reasoning trace
        </p>
        <p className="text-xs text-[#333] mt-1">
          Every step, tool call, and decision — in real-time
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Trace header */}
      <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#1e1e1e] px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#555]">trace/{trace.id}</span>
            {isStreaming && (
              <span className="flex items-center gap-1 text-[10px] text-[#00d4ff]">
                <span className="w-1 h-1 rounded-full bg-[#00d4ff] live-pulse" />
                live
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#555]">
            <span>{trace.stepCount} steps</span>
            <span>{trace.totalLatencyMs}ms</span>
            <span>{trace.toolsUsed.length} tools</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-1">
        {trace.steps.map((step, i) => (
          <div key={step.id} className="trace-step">
            <div className="flex items-start gap-3 py-1.5 group">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono"
                  style={{ color: stepColors[step.type], background: `${stepColors[step.type]}15` }}
                >
                  {stepIcons[step.type]}
                </span>
                {i < trace.steps.length - 1 && (
                  <div className="w-px h-full min-h-[8px] bg-[#1e1e1e]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: stepColors[step.type] }}>
                    {step.type.replace(/_/g, ' ')}
                  </span>
                  {step.metadata?.toolName && (
                    <span className="text-[10px] font-mono text-[#444]">
                      {step.metadata.toolName}
                    </span>
                  )}
                  <span className="text-[10px] text-[#333] opacity-0 group-hover:opacity-100 transition-opacity">
                    {step.metadata?.latencyMs}ms
                  </span>
                </div>
                <p className="text-xs text-[#999] leading-relaxed font-mono break-all">
                  {step.content.length > 300 ? step.content.slice(0, 300) + '...' : step.content}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center gap-3 py-2">
            <div className="w-5 h-5 rounded flex items-center justify-center bg-[#00d4ff]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] live-pulse" />
            </div>
            <span className="text-[10px] text-[#555]">Capturing reasoning steps...</span>
          </div>
        )}
      </div>

      {/* Trace summary footer + Save as Regression */}
      {!isStreaming && trace.steps.length > 0 && (
        <div className="border-t border-[#1e1e1e] px-4 py-3 mt-2">
          <div className="grid grid-cols-3 gap-4 text-center mb-3">
            <div>
              <div className="text-lg font-semibold text-[#ededed]">{trace.stepCount}</div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider">Steps</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-[#00d4ff]">{trace.totalLatencyMs}ms</div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider">Latency</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-[#00ff88]">{trace.toolsUsed.length}</div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider">Tools</div>
            </div>
          </div>

          {/* Save as Regression Test button */}
          <button
            onClick={handleSaveAsRegression}
            disabled={saving || saved}
            className={`w-full py-2 rounded-lg text-xs font-medium transition-all ${
              saved
                ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20'
                : 'bg-[#1a1a2e] text-[#00d4ff] border border-[#00d4ff]/20 hover:bg-[#00d4ff]/10'
            } disabled:opacity-50`}
          >
            {saved ? '✓ Saved as regression test' : saving ? 'Saving...' : '🛡 Save as Regression Test'}
          </button>
          <p className="text-[10px] text-[#333] mt-1.5 text-center">
            Creates a test that checks future deployments against this trace&apos;s behavior
          </p>
        </div>
      )}
    </div>
  );
}

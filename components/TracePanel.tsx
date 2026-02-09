'use client';

import { useState } from 'react';
import type { ReasoningTrace, TraceStep } from '@/lib/hippo';

interface TracePanelProps {
  trace: ReasoningTrace | null;
  isStreaming: boolean;
}

const stepIcons: Record<TraceStep['type'], string> = {
  user_message: '>>',
  assistant_message: '<<',
  tool_call: '--',
  tool_result: '++',
  reasoning: '..',
};

const stepColors: Record<TraceStep['type'], string> = {
  user_message: '#b0b0b0',
  assistant_message: '#b0b0b0',
  tool_call: '#0abdc6',
  tool_result: '#00ff41',
  reasoning: '#cccc00',
};

function isTraceAlreadySaved(traceId: string): boolean {
  try {
    const stored = JSON.parse(sessionStorage.getItem('hippo-regression-tests') ?? '[]');
    return stored.some((t: { sourceTraceId: string }) => t.sourceTraceId === traceId);
  } catch { return false; }
}

export function TracePanel({ trace, isStreaming }: TracePanelProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const alreadySaved = trace ? isTraceAlreadySaved(trace.id) : false;

  const handleSaveAsRegression = async () => {
    if (!trace || alreadySaved) return;
    setSaving(true);
    try {
      const res = await fetch('/api/regressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          traceId: trace.id,
          trace,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.test) {
          const stored = JSON.parse(sessionStorage.getItem('hippo-regression-tests') ?? '[]');
          if (!stored.some((t: { sourceTraceId: string }) => t.sourceTraceId === trace.id)) {
            stored.push(data.test);
            sessionStorage.setItem('hippo-regression-tests', JSON.stringify(stored));
          }
        }
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!trace) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 font-mono" style={{ background: '#0a0a0a', color: '#404040' }}>
        <p className="text-sm mb-2">
          $ trace --wait
        </p>
        <p className="text-xs" style={{ color: '#404040' }}>
          send a message to see the reasoning trace
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto font-mono" style={{ background: '#0a0a0a', color: '#b0b0b0' }}>
      {/* Trace header */}
      <div className="sticky top-0 px-4 py-2.5 border-b" style={{ borderColor: '#404040', background: '#0a0a0a' }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: '#00ff41' }}>
              $ trace/{trace.id}
            </span>
            {isStreaming && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: '#00ff41' }}>
                <span
                  className="w-1 h-1 rounded-full live-pulse cursor-blink"
                  style={{ background: '#00ff41' }}
                />
                LIVE
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px]" style={{ color: '#404040' }}>
          <span>steps: {trace.stepCount}</span>
          <span>latency: {trace.totalLatencyMs}ms</span>
          <span>tools: {trace.toolsUsed.length}</span>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-0">
        {trace.steps.map((step, i) => (
          <div
            key={step.id}
            className="trace-step py-1"
            style={{ borderLeft: '2px solid #404040', paddingLeft: '12px', marginLeft: '6px' }}
          >
            <div className="flex items-start gap-2 text-xs font-mono">
              <span style={{ color: stepColors[step.type], minWidth: '16px' }}>
                {stepIcons[step.type]}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span style={{ color: stepColors[step.type] }}>
                    {step.type.replace(/_/g, '_')}
                  </span>
                  {step.metadata?.toolName && (
                    <span style={{ color: '#0abdc6' }}>
                      ({step.metadata.toolName})
                    </span>
                  )}
                  {step.metadata?.latencyMs && (
                    <span style={{ color: '#404040' }}>
                      [{step.metadata.latencyMs}ms]
                    </span>
                  )}
                </div>
                <p
                  className="text-xs leading-relaxed break-all"
                  style={{ color: '#b0b0b0', wordBreak: 'break-word' }}
                >
                  {step.content.length > 300 ? step.content.slice(0, 300) + '...' : step.content}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center gap-2 py-2 text-xs" style={{ color: '#404040' }}>
            <span className="cursor-blink live-pulse" style={{ color: '#00ff41' }}>|</span>
            <span>capturing reasoning steps...</span>
          </div>
        )}
      </div>

      {/* Trace summary footer + Save as Regression */}
      {!isStreaming && trace.steps.length > 0 && (
        <div className="border-t px-4 py-3 mt-2" style={{ borderColor: '#404040' }}>
          <div className="mb-3 text-xs" style={{ color: '#404040' }}>
            steps: {trace.stepCount} | latency: {trace.totalLatencyMs}ms | tools: {trace.toolsUsed.length}
          </div>

          {/* Save as Regression Test button */}
          <button
            onClick={handleSaveAsRegression}
            disabled={saving || saved || alreadySaved}
            className="w-full py-2 text-xs font-mono transition-all text-left px-3 mb-2"
            style={{
              border: `1px solid ${alreadySaved ? '#404040' : '#00ff41'}`,
              background: '#0a0a0a',
              color: alreadySaved ? '#404040' : '#00ff41',
              cursor: saving || saved || alreadySaved ? 'default' : 'pointer',
              opacity: saving || saved || alreadySaved ? 0.6 : 1,
            }}
          >
            {alreadySaved ? '$ hippo save --regression [already saved]' : saved ? '$ hippo save --regression [OK]' : saving ? '$ hippo save --regression...' : '$ hippo save --regression'}
          </button>

          {saved && (
            <p className="text-[10px]" style={{ color: '#00ff41' }}>
              [OK] saved as regression test
            </p>
          )}
        </div>
      )}
    </div>
  );
}

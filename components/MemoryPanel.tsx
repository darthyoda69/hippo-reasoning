'use client';

import { useState } from 'react';
import type { ReasoningTrace } from '@/lib/hippo';

interface MemoryPanelProps {
  traces: ReasoningTrace[];
  onRefresh: () => void;
  sessionId: string;
  onDiffSelect?: (trace: ReasoningTrace) => void;
  diffSelectedIds?: [string | null, string | null];
}

export function MemoryPanel({ traces, onRefresh, sessionId, onDiffSelect, diffSelectedIds }: MemoryPanelProps) {
  const [expandedTrace, setExpandedTrace] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const handleSaveAsRegression = async (trace: ReasoningTrace) => {
    setSavingId(trace.id);
    try {
      const res = await fetch('/api/regressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', traceId: trace.id }),
      });
      if (res.ok) {
        setSavedId(trace.id);
        setTimeout(() => setSavedId(null), 3000);
      }
    } finally {
      setSavingId(null);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await fetch('/api/traces', { method: 'DELETE' });
      onRefresh();
    } finally {
      setClearing(false);
    }
  };

  const isDiffSelected = (traceId: string) =>
    diffSelectedIds?.[0] === traceId || diffSelectedIds?.[1] === traceId;

  if (traces.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <div className="text-center">
          <p className="text-sm" style={{ color: '#b0b0b0' }}>$ hippo memory --list</p>
          <p className="text-sm mt-4" style={{ color: '#404040' }}>0 traces stored</p>
          <p className="text-xs mt-2" style={{ color: '#404040' }}>run agent to capture traces</p>
        </div>
      </div>
    );
  }

  const totalSteps = traces.reduce((sum, t) => sum + t.stepCount, 0);
  const avgLatency = Math.round(traces.reduce((sum, t) => sum + t.totalLatencyMs, 0) / traces.length);

  return (
    <div className="h-full overflow-y-auto" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#0a0a0a' }}>
      {/* Stats bar - terminal style */}
      <div className="sticky top-0 border-b px-4 py-3" style={{ backgroundColor: '#0a0a0a', borderColor: '#1a1a1a', color: '#b0b0b0' }}>
        <div className="flex items-center justify-between text-xs">
          <div className="font-mono">
            traces: {traces.length} | steps: {totalSteps} | avg: {avgLatency}ms
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onRefresh}
              className="transition-colors hover:glow-green"
              style={{ color: '#0abdc6', textDecoration: 'underline', cursor: 'pointer' }}
            >
              refresh
            </button>
            <button
              onClick={handleClear}
              disabled={clearing}
              className="transition-colors"
              style={{
                color: '#ff0040',
                textDecoration: 'underline',
                cursor: clearing ? 'not-allowed' : 'pointer',
                opacity: clearing ? 0.5 : 1
              }}
            >
              clear --all
            </button>
          </div>
        </div>
      </div>

      {/* Trace list */}
      <div className="p-3 space-y-1">
        {traces.map((trace, idx) => (
          <div key={trace.id} style={{ borderColor: '#1a1a1a' }}>
            {/* Trace header - log entry style */}
            <div className="flex items-center gap-0">
              {/* Diff select button */}
              {onDiffSelect && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDiffSelect(trace);
                  }}
                  className="px-2 py-2 text-[10px] font-mono font-bold transition-all border border-r-0"
                  style={{
                    backgroundColor: isDiffSelected(trace.id) ? '#0a0a0a' : '#000',
                    borderColor: isDiffSelected(trace.id) ? '#0abdc6' : '#1a1a1a',
                    color: isDiffSelected(trace.id) ? '#0abdc6' : '#404040',
                  }}
                  title="Select for diff comparison"
                >
                  {isDiffSelected(trace.id) ? '[x]' : '[ ]'}
                </button>
              )}

              <button
                onClick={() => setExpandedTrace(expandedTrace === trace.id ? null : trace.id)}
                className="flex-1 text-left px-3 py-2 font-mono text-xs transition-colors hover:glow-green"
                style={{
                  color: '#00ff41',
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  fontFamily: 'JetBrains Mono, monospace'
                }}
              >
                <span style={{ color: '#404040' }}>[trace-{String(idx + 1).padStart(3, '0')}]</span>
                {' '}
                <span style={{ color: '#b0b0b0' }}>'{trace.query.slice(0, 45)}{trace.query.length > 45 ? '...' : ''}'</span>
                {' '}
                <span style={{ color: '#404040' }}>|</span>
                {' '}
                <span style={{ color: '#b0b0b0' }}>{trace.stepCount} steps</span>
                {' '}
                <span style={{ color: '#404040' }}>|</span>
                {' '}
                <span style={{ color: '#b0b0b0' }}>{trace.totalLatencyMs}ms</span>
                {trace.toolsUsed.length > 0 && (
                  <>
                    {' '}
                    <span style={{ color: '#404040' }}>|</span>
                    {' '}
                    <span style={{ color: '#0abdc6' }}>tools: {trace.toolsUsed.join(', ')}</span>
                  </>
                )}
                {' '}
                <span style={{ color: '#404040' }}>
                  {expandedTrace === trace.id ? '[-]' : '[+]'}
                </span>
              </button>
            </div>

            {/* Expanded trace steps - terminal output */}
            {expandedTrace === trace.id && (
              <div className="font-mono text-xs" style={{ backgroundColor: '#000000', borderColor: '#1a1a1a', border: '1px solid #1a1a1a', borderTop: 'none' }}>
                <div className="px-3 py-2 space-y-0 max-h-64 overflow-y-auto">
                  {trace.steps.map((step) => (
                    <div key={step.id} className="py-1" style={{ color: '#b0b0b0' }}>
                      <span style={{ color: '#404040' }}>{'>'}</span>
                      {' '}
                      <span style={{ color: '#0abdc6' }}>
                        {step.type === 'tool_call' ? 'call' :
                         step.type === 'tool_result' ? 'result' :
                         step.type === 'user_message' ? 'user' :
                         step.type === 'assistant_message' ? 'agent' : 'memory'}
                      </span>
                      {' '}
                      <span style={{ color: '#b0b0b0' }}>
                        {step.content.length > 120 ? step.content.slice(0, 120) + '...' : step.content}
                      </span>
                    </div>
                  ))}

                  {/* Summary */}
                  {trace.summary && (
                    <div className="py-1 mt-1" style={{ borderTop: '1px solid #1a1a1a', paddingTop: '0.5rem', color: '#00ff41' }}>
                      <span style={{ color: '#404040' }}>{'>'}</span>
                      {' '}
                      <span style={{ color: '#00ff41' }}>summary:</span>
                      {' '}
                      <span style={{ color: '#b0b0b0' }}>{trace.summary}</span>
                    </div>
                  )}
                </div>
                {/* Save as regression from Memory */}
                <div className="px-3 py-2" style={{ borderTop: '1px solid #1a1a1a' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSaveAsRegression(trace); }}
                    disabled={savingId === trace.id || savedId === trace.id}
                    className="w-full text-left px-3 py-1.5 text-[10px] font-mono transition-all"
                    style={{
                      border: '1px solid #00ff41',
                      background: '#0a0a0a',
                      color: savedId === trace.id ? '#00ff41' : '#00ff41',
                      cursor: savingId === trace.id || savedId === trace.id ? 'default' : 'pointer',
                      opacity: savingId === trace.id || savedId === trace.id ? 0.6 : 1,
                    }}
                  >
                    {savedId === trace.id ? '$ hippo save --regression [OK]' : savingId === trace.id ? '$ hippo save --regression...' : '$ hippo save --regression'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Diff hint */}
      {onDiffSelect && traces.length >= 2 && (
        <div className="px-4 py-2 border-t" style={{ borderColor: '#1a1a1a' }}>
          <div className="text-[10px] font-mono" style={{ color: '#404040' }}>
            tip: select 2 traces with [ ] to compare in DIFF tab
          </div>
        </div>
      )}

      {/* Memory context preview - code block style */}
      {traces.length > 0 && (
        <div className="border-t px-4 py-3" style={{ borderColor: '#1a1a1a' }}>
          <div className="text-xs font-mono mb-2" style={{ color: '#404040' }}>
            --- reasoning context ---
          </div>
          <div className="font-mono text-xs max-h-40 overflow-y-auto p-3" style={{
            backgroundColor: '#000000',
            border: '1px solid #1a1a1a',
            color: '#b0b0b0'
          }}>
            {traces.slice(0, 3).map((t) => (
              <div key={t.id} className="mb-2">
                <span style={{ color: '#00ff41' }}>{'$'}</span>
                {' '}
                <span style={{ color: '#0abdc6' }}>trace-query</span>
                {' '}
                <span style={{ color: '#b0b0b0' }}>"{t.query.slice(0, 50)}{t.query.length > 50 ? '...' : ''}"</span>
                <br />
                <span style={{ color: '#404040' }}>
                  tools: {t.toolsUsed.join(', ') || 'none'} | steps: {t.stepCount} | latency: {t.totalLatencyMs}ms
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: '#404040' }}>
            context injected to agent system prompt when memory is ON
          </p>
        </div>
      )}
    </div>
  );
}

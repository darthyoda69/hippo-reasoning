'use client';

import { useState } from 'react';
import type { EvalResult, EvalBreakdown } from '@/lib/hippo';

interface EvalPanelProps {
  sessionId: string;
  hasMemory: boolean;
}

interface FullEvalResult extends EvalResult {
  responses: { withMemory: string; withoutMemory: string };
  latency: { withMemory: number; withoutMemory: number };
  memoryAvailable: boolean;
}

const evalQueries = [
  'What is the state of AI agent memory systems and why does reasoning memory matter?',
  'Compare the AI infrastructure market to developer tool adoption patterns',
  'What role does the hippocampus play in memory formation and how does this apply to AI?',
];

export function EvalPanel({ sessionId, hasMemory }: EvalPanelProps) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<FullEvalResult | null>(null);
  const [selectedQuery, setSelectedQuery] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const runEval = async () => {
    setRunning(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: evalQueries[selectedQuery],
          sessionId,
        }),
      });

      if (!res.ok) throw new Error('Eval failed');
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError('Eval failed. Make sure you have stored some reasoning traces first (chat with the agent a few times).');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Config */}
      <div className="p-4 border-b border-[#1e1e1e]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-medium text-[#ededed]">Eval: With vs Without Reasoning Memory</h3>
          <div className={`text-[10px] px-2 py-0.5 rounded ${
            hasMemory ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-[#333] text-[#666]'
          }`}>
            {hasMemory ? 'Memory available' : 'No memory yet'}
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {evalQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => setSelectedQuery(i)}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-all ${
                selectedQuery === i
                  ? 'bg-[#1a1a2e] text-[#ededed] border border-[#00d4ff]/20'
                  : 'text-[#666] border border-[#1e1e1e] hover:border-[#333]'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        <button
          onClick={runEval}
          disabled={running}
          className="w-full py-2.5 bg-[#ededed] text-[#0a0a0a] rounded-lg text-xs font-medium hover:bg-white transition-colors disabled:opacity-30"
        >
          {running ? 'Running eval (comparing both paths)...' : 'Run Eval Comparison'}
        </button>

        {error && (
          <p className="text-xs text-[#ff4444] mt-2">{error}</p>
        )}

        {!hasMemory && (
          <p className="text-[10px] text-[#555] mt-2">
            Tip: Chat with the agent first to build up reasoning memory, then run the eval to see the improvement.
          </p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 space-y-4">
          {/* Score comparison */}
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard
              label="Without Memory"
              score={result.withoutMemory.score}
              breakdown={result.withoutMemory.breakdown}
              color="#888"
              latency={result.latency.withoutMemory}
            />
            <ScoreCard
              label="With Memory"
              score={result.withMemory.score}
              breakdown={result.withMemory.breakdown}
              color="#00d4ff"
              latency={result.latency.withMemory}
            />
          </div>

          {/* Delta */}
          <div className={`text-center py-3 rounded-lg border ${
            result.delta > 0
              ? 'bg-[#00ff88]/5 border-[#00ff88]/20 text-[#00ff88]'
              : result.delta === 0
              ? 'bg-[#333]/20 border-[#333] text-[#888]'
              : 'bg-[#ff4444]/5 border-[#ff4444]/20 text-[#ff4444]'
          }`}>
            <div className="text-2xl font-semibold">
              {result.delta > 0 ? '+' : ''}{result.delta}%
            </div>
            <div className="text-[10px] uppercase tracking-wider mt-0.5">
              {result.delta > 0
                ? 'Improvement with reasoning memory'
                : result.delta === 0
                ? 'No difference'
                : 'Regression (unusual)'}
            </div>
            {!result.memoryAvailable && (
              <div className="text-[10px] text-[#555] mt-1">
                No stored traces available — chat more to build memory
              </div>
            )}
          </div>

          {/* Response comparison */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-medium text-[#555] uppercase tracking-wider">Response Comparison</h4>
            <div className="grid grid-cols-1 gap-2">
              <ResponseCard
                label="Without Memory"
                response={result.responses.withoutMemory}
                color="#888"
              />
              <ResponseCard
                label="With Memory"
                response={result.responses.withMemory}
                color="#00d4ff"
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !running && (
        <div className="p-8 text-center">
          <div className="text-2xl mb-3 opacity-30">📊</div>
          <p className="text-xs text-[#444]">
            Select a query and run the eval to compare agent performance with and without reasoning memory.
          </p>
        </div>
      )}
    </div>
  );
}

function ScoreCard({
  label, score, breakdown, color, latency,
}: {
  label: string; score: number; breakdown: EvalBreakdown; color: string; latency: number;
}) {
  const dims = [
    { key: 'relevance', label: 'Relevance' },
    { key: 'completeness', label: 'Complete' },
    { key: 'reasoning', label: 'Reasoning' },
    { key: 'toolUsage', label: 'Tool Use' },
  ] as const;

  return (
    <div className="border border-[#1e1e1e] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-[#555] uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-[#444]">{latency}ms</span>
      </div>
      <div className="text-2xl font-semibold mb-3" style={{ color }}>
        {score}%
      </div>
      <div className="space-y-1.5">
        {dims.map(d => (
          <div key={d.key} className="flex items-center gap-2">
            <span className="text-[10px] text-[#555] w-16">{d.label}</span>
            <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full score-bar"
                style={{
                  width: `${(breakdown[d.key] / 5) * 100}%`,
                  background: color,
                  opacity: 0.6,
                }}
              />
            </div>
            <span className="text-[10px] text-[#555] w-4 text-right">{breakdown[d.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponseCard({
  label, response, color,
}: {
  label: string; response: string; color: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = response.slice(0, 200);

  return (
    <div className="border border-[#1e1e1e] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-[10px] text-[#555] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[11px] text-[#888] leading-relaxed font-mono">
        {expanded ? response : preview}
        {response.length > 200 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#00d4ff] ml-1 hover:underline"
          >
            {expanded ? ' show less' : '... show more'}
          </button>
        )}
      </p>
    </div>
  );
}

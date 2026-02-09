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
    <div className="h-full overflow-y-auto bg-black font-mono text-[#b0b0b0]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
      {/* Header */}
      <div className="p-4 border-b border-[#1a1a1a] bg-black">
        <div className="text-[#00ff41] text-sm mb-4">$ hippo eval --compare</div>

        {/* Memory Status */}
        <div className="mb-4 flex items-center gap-2">
          <span className={hasMemory ? 'text-[#00ff41]' : 'text-[#404040]'}>
            [{hasMemory ? 'MEMORY: AVAILABLE' : 'NO MEMORY'}]
          </span>
        </div>

        {/* Query Selection */}
        <div className="mb-4 space-y-1">
          <div className="text-[#404040] text-xs mb-2">select query:</div>
          {evalQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => setSelectedQuery(i)}
              className={`w-full text-left px-2 py-1 text-xs transition-all border border-[#1a1a1a] ${
                selectedQuery === i
                  ? 'text-[#0abdc6] border-[#0abdc6]'
                  : 'text-[#404040] hover:text-[#b0b0b0]'
              }`}
              style={{
                background: selectedQuery === i ? 'rgba(10, 189, 198, 0.05)' : 'transparent',
              }}
            >
              <span style={{ color: selectedQuery === i ? '#0abdc6' : '#404040' }}>{i + 1}{'>'}</span> {q}
            </button>
          ))}
        </div>

        {/* Run Button */}
        <button
          onClick={runEval}
          disabled={running}
          className={`w-full px-4 py-2 text-xs border transition-all ${
            running
              ? 'opacity-40 border-[#404040] text-[#404040]'
              : 'border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-black'
          }`}
          style={{
            background: running ? 'transparent' : 'transparent',
          }}
        >
          $ run eval --with-memory --without-memory
        </button>

        {error && (
          <div className="mt-3 text-xs text-[#ff0040] border border-[#ff0040] p-2 border-[#1a1a1a]">
            ERROR: {error}
          </div>
        )}

        {!hasMemory && (
          <div className="mt-3 text-[10px] text-[#404040]">
            -- tip: chat with agent first to build reasoning memory --
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 space-y-4 bg-black">
          {/* Score Comparison */}
          <div className="grid grid-cols-2 gap-3">
            <ScoreCard
              label="WITHOUT_MEMORY"
              score={result.withoutMemory.score}
              breakdown={result.withoutMemory.breakdown}
              color="#b0b0b0"
              latency={result.latency.withoutMemory}
            />
            <ScoreCard
              label="WITH_MEMORY"
              score={result.withMemory.score}
              breakdown={result.withMemory.breakdown}
              color="#0abdc6"
              latency={result.latency.withMemory}
            />
          </div>

          {/* Delta Display */}
          <div className="border border-[#1a1a1a] p-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[#404040]">delta:</span>
              <div
                className={`text-2xl font-bold ${
                  result.delta > 0
                    ? 'text-[#00ff41] glow-green'
                    : result.delta === 0
                    ? 'text-[#404040]'
                    : 'text-[#ff0040] glow-red'
                }`}
              >
                {result.delta > 0 ? '+' : ''}{result.delta}%
              </div>
            </div>
            {!result.memoryAvailable && (
              <div className="text-[10px] text-[#404040] text-center mt-2">
                -- no memory context injected, both runs baseline --
              </div>
            )}
          </div>

          {/* Response Comparison */}
          <div className="space-y-3">
            <div className="text-[#404040] text-xs">-- response comparison --</div>
            <div className="space-y-2">
              <ResponseCard
                label="WITHOUT_MEMORY"
                response={result.responses.withoutMemory}
                color="#b0b0b0"
              />
              <ResponseCard
                label="WITH_MEMORY"
                response={result.responses.withMemory}
                color="#0abdc6"
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !running && (
        <div className="p-8 text-center border-t border-[#1a1a1a]">
          <div className="text-[#404040] text-sm mb-2">$ hippo eval</div>
          <div className="text-[#404040] text-xs">select query and run comparison</div>
        </div>
      )}

      <style jsx>{`
        .glow-green {
          text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41;
        }
        .glow-red {
          text-shadow: 0 0 10px #ff0040, 0 0 20px #ff0040;
        }
        .score-bar {
          transition: width 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

function ScoreCard({
  label, score, breakdown, color, latency,
}: {
  label: string; score: number; breakdown: EvalBreakdown; color: string; latency: number;
}) {
  const dims = [
    { key: 'relevance', label: 'relevance' },
    { key: 'completeness', label: 'completeness' },
    { key: 'reasoning', label: 'reasoning' },
    { key: 'toolUsage', label: 'tool_usage' },
  ] as const;

  return (
    <div className="border border-[#1a1a1a] p-3 bg-black">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ color }}>{label}</span>
        <span className="text-[10px] text-[#404040]">{latency}ms</span>
      </div>
      <div className="text-2xl font-bold mb-3" style={{ color }}>
        {score}%
      </div>
      <div className="space-y-2">
        {dims.map(d => {
          const value = breakdown[d.key];
          const barLength = Math.round((value / 5) * 10);
          const emptyLength = 10 - barLength;
          return (
            <div key={d.key} className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-[#404040] w-20">{d.label}</span>
              <span style={{ color }}>[{'#'.repeat(barLength)}{'-'.repeat(emptyLength)}]</span>
              <span className="text-[#404040] w-8 text-right">{value}/5</span>
            </div>
          );
        })}
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
  const displayText = expanded ? response : preview;
  const lines = displayText.split('\n');

  return (
    <div className="border border-[#1a1a1a] p-3 bg-black">
      <div className="text-xs mb-2" style={{ color }}>
        &gt; {label}
      </div>
      <pre className="text-[10px] overflow-x-auto whitespace-pre-wrap break-words font-mono" style={{ color: '#b0b0b0' }}>
        {lines.map((line, i) => (
          <div key={i}>&gt; {line}</div>
        ))}
      </pre>
      {response.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] mt-2 transition-all"
          style={{ color }}
        >
          {expanded ? '-- collapse --' : '-- expand (more) --'}
        </button>
      )}
    </div>
  );
}

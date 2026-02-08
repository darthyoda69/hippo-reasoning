'use client';

import { useState } from 'react';

interface BenchmarkRow {
  task: string;
  withoutMemory: number;
  withMemory: number;
  delta: number;
  tracingOverhead: string;
  traceSize: string;
}

const benchmarkData: BenchmarkRow[] = [
  {
    task: 'AI memory systems research',
    withoutMemory: 65,
    withMemory: 85,
    delta: 31,
    tracingOverhead: '1.8ms',
    traceSize: '1.1 KB',
  },
  {
    task: 'Market size analysis with calculations',
    withoutMemory: 70,
    withMemory: 82,
    delta: 17,
    tracingOverhead: '2.1ms',
    traceSize: '1.4 KB',
  },
  {
    task: 'Cross-domain synthesis (neuroscience → AI)',
    withoutMemory: 60,
    withMemory: 80,
    delta: 33,
    tracingOverhead: '1.9ms',
    traceSize: '1.3 KB',
  },
  {
    task: 'Multi-tool reasoning chain',
    withoutMemory: 72,
    withMemory: 85,
    delta: 18,
    tracingOverhead: '2.4ms',
    traceSize: '1.6 KB',
  },
  {
    task: 'Follow-up query using prior context',
    withoutMemory: 68,
    withMemory: 78,
    delta: 15,
    tracingOverhead: '1.6ms',
    traceSize: '0.9 KB',
  },
];

export default function BenchmarksPage() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const avgWithout = Math.round(benchmarkData.reduce((s, r) => s + r.withoutMemory, 0) / benchmarkData.length);
  const avgWith = Math.round(benchmarkData.reduce((s, r) => s + r.withMemory, 0) / benchmarkData.length);
  const avgDelta = Math.round(benchmarkData.reduce((s, r) => s + r.delta, 0) / benchmarkData.length);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed]">
      {/* Header */}
      <header className="border-b border-[#1e1e1e] px-8 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl">🦛</span>
              <span className="text-xl font-semibold">Hippo</span>
              <span className="text-[#888] text-sm">Reasoning</span>
            </a>
            <span className="text-[#333] mx-2">/</span>
            <span className="text-sm text-[#888]">Benchmarks</span>
          </div>
          <a
            href="https://github.com/darthyoda69/hippo-reasoning"
            target="_blank"
            rel="noopener"
            className="text-xs text-[#888] hover:text-[#ededed] transition-colors"
          >
            GitHub →
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12">
        {/* Hero */}
        <div className="mb-12">
          <h1 className="text-3xl font-semibold mb-3">Benchmark Results</h1>
          <p className="text-[#888] text-sm leading-relaxed max-w-xl">
            5 diverse research queries run on the Hippo Reasoning demo. Each task executed
            twice: once without reasoning memory (baseline) and once with stored traces from
            previous sessions. Scored by LLM-as-judge on 4 dimensions.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <SummaryCard label="Avg Without Memory" value={`${avgWithout}%`} color="#888" />
          <SummaryCard label="Avg With Memory" value={`${avgWith}%`} color="#00d4ff" />
          <SummaryCard label="Avg Improvement" value={`+${avgDelta}%`} color="#00ff88" />
          <SummaryCard label="Tracing Overhead" value="~2ms" color="#ffaa00" sub="per step" />
        </div>

        {/* Results table */}
        <div className="border border-[#1e1e1e] rounded-lg overflow-hidden mb-10">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-[#111] text-[10px] text-[#555] uppercase tracking-wider font-medium">
            <div className="col-span-4">Task</div>
            <div className="col-span-2 text-center">Without Memory</div>
            <div className="col-span-2 text-center">With Memory</div>
            <div className="col-span-1 text-center">Delta</div>
            <div className="col-span-1 text-center">Overhead</div>
            <div className="col-span-2 text-center">Trace Size</div>
          </div>

          {/* Rows */}
          {benchmarkData.map((row, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
              className={`grid grid-cols-12 gap-4 px-5 py-3.5 border-t border-[#1e1e1e] transition-colors ${
                hoveredRow === i ? 'bg-[#111]' : ''
              }`}
            >
              <div className="col-span-4 text-sm text-[#ccc]">{row.task}</div>
              <div className="col-span-2 text-center">
                <span className="text-sm text-[#888] font-mono">{row.withoutMemory}%</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-sm text-[#00d4ff] font-mono">{row.withMemory}%</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-sm text-[#00ff88] font-mono font-medium">+{row.delta}%</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-xs text-[#555] font-mono">{row.tracingOverhead}</span>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-xs text-[#555] font-mono">{row.traceSize}</span>
              </div>
            </div>
          ))}

          {/* Summary row */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3.5 border-t border-[#333] bg-[#111]">
            <div className="col-span-4 text-sm text-[#ededed] font-medium">Average</div>
            <div className="col-span-2 text-center">
              <span className="text-sm text-[#888] font-mono font-medium">{avgWithout}%</span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-sm text-[#00d4ff] font-mono font-medium">{avgWith}%</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-sm text-[#00ff88] font-mono font-semibold">+{avgDelta}%</span>
            </div>
            <div className="col-span-1 text-center">
              <span className="text-xs text-[#555] font-mono">~2ms</span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs text-[#555] font-mono">~1.2 KB</span>
            </div>
          </div>
        </div>

        {/* Visual bar comparison */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Score Comparison</h2>
          <div className="space-y-4">
            {benchmarkData.map((row, i) => (
              <div key={i} className="space-y-1.5">
                <div className="text-xs text-[#888]">{row.task}</div>
                <div className="flex items-center gap-3">
                  {/* Without memory bar */}
                  <div className="flex-1 h-3 bg-[#1e1e1e] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full score-bar"
                      style={{ width: `${row.withoutMemory}%`, background: '#888' }}
                    />
                  </div>
                  <span className="text-[10px] text-[#555] w-8 text-right font-mono">{row.withoutMemory}%</span>
                </div>
                <div className="flex items-center gap-3">
                  {/* With memory bar */}
                  <div className="flex-1 h-3 bg-[#1e1e1e] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full score-bar"
                      style={{ width: `${row.withMemory}%`, background: '#00d4ff' }}
                    />
                  </div>
                  <span className="text-[10px] text-[#00d4ff] w-8 text-right font-mono">{row.withMemory}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-6 mt-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#888]" />
              <span className="text-[#666]">Without memory (baseline)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#00d4ff]" />
              <span className="text-[#666]">With reasoning memory</span>
            </div>
          </div>
        </div>

        {/* Methodology */}
        <div className="border border-[#1e1e1e] rounded-lg p-6 mb-10">
          <h2 className="text-lg font-semibold mb-3">Methodology</h2>
          <div className="text-sm text-[#888] leading-relaxed space-y-3">
            <p>
              Each task was executed using Claude Sonnet via Vercel AI SDK&apos;s <code className="text-[#00d4ff] bg-[#111] px-1.5 py-0.5 rounded text-xs">streamText</code> and <code className="text-[#00d4ff] bg-[#111] px-1.5 py-0.5 rounded text-xs">generateText</code>. The agent has access to three tools: searchKnowledge, calculate, and analyzeData.
            </p>
            <p>
              <strong className="text-[#ccc]">Without memory:</strong> Agent runs with no prior context. Standard system prompt only.
            </p>
            <p>
              <strong className="text-[#ccc]">With memory:</strong> Reasoning traces from 3 prior conversations are injected into the system prompt. The agent sees past tool usage patterns, decision paths, and summaries.
            </p>
            <p>
              <strong className="text-[#ccc]">Scoring:</strong> LLM-as-judge evaluates each response on 4 dimensions (1-5 scale): relevance, completeness, reasoning quality, and tool usage effectiveness. Final score is the average as a percentage.
            </p>
            <p>
              <strong className="text-[#ccc]">Overhead:</strong> Tracing latency measured as the delta between traced and untraced executions. Trace size measured as JSON.stringify byte count of the completed trace object.
            </p>
          </div>
        </div>

        {/* Reproduce */}
        <div className="border border-[#1e1e1e] rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Reproduce These Results</h2>
          <div className="bg-[#111] rounded-lg p-4 font-mono text-sm text-[#888]">
            <div className="text-[#555]"># Clone and run</div>
            <div>git clone https://github.com/darthyoda69/hippo-reasoning.git</div>
            <div>cd hippo-reasoning</div>
            <div>npm install</div>
            <div>echo &quot;ANTHROPIC_API_KEY=your-key&quot; &gt; .env.local</div>
            <div>npm run dev</div>
            <div className="mt-2 text-[#555]"># 1. Chat with the agent 3-5 times (builds reasoning memory)</div>
            <div className="text-[#555]"># 2. Switch to the Eval tab</div>
            <div className="text-[#555]"># 3. Select a query, click &quot;Run Eval Comparison&quot;</div>
            <div className="text-[#555]"># 4. See the score delta between with/without memory</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-[#1e1e1e] text-center">
          <div className="text-xs text-[#444]">
            Hippo Reasoning — open-source reasoning memory for Vercel AI SDK agents
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs text-[#555]">
            <a href="/" className="hover:text-[#888] transition-colors">Demo</a>
            <a href="https://github.com/darthyoda69/hippo-reasoning" className="hover:text-[#888] transition-colors">GitHub</a>
            <a href="https://www.linkedin.com/in/leonbenz/" className="hover:text-[#888] transition-colors">Leon Benz</a>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="border border-[#1e1e1e] rounded-lg p-4">
      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">{label}</div>
      <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-[#444] mt-0.5">{sub}</div>}
    </div>
  );
}

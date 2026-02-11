'use client';

import { useState } from 'react';
import Link from 'next/link';

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
    task: 'Cross-domain synthesis (neuroscience -> AI)',
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
    <div className="min-h-screen bg-[#000000] text-[#b0b0b0]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        body, html {
          font-family: 'JetBrains Mono', monospace;
        }

        .terminal-glow {
          text-shadow: 0 0 10px #00ff41, 0 0 20px #00ff41;
          color: #00ff41;
        }

        .terminal-dim {
          color: #404040;
        }

        .terminal-green {
          color: #00ff41;
        }

        .terminal-cyan {
          color: #0abdc6;
        }

        .terminal-red {
          color: #ff0040;
        }

        .score-bar {
          display: inline-block;
          height: 100%;
        }

        .border-terminal {
          border: 1px solid #1a1a1a;
        }
      `}</style>

      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1 hover:opacity-80 transition-opacity">
              <span className="terminal-glow text-lg font-bold">hippo</span>
              <span className="terminal-dim">// benchmarks</span>
            </Link>
          </div>
          <a
            href="https://github.com/darthyoda69/hippo-reasoning"
            target="_blank"
            rel="noopener"
            className="text-xs text-[#404040] hover:text-[#0abdc6] transition-colors"
          >
            github
          </a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <div className="terminal-green font-bold text-lg mb-6">$ hippo bench --results</div>
          <p className="text-[#404040] text-sm leading-relaxed max-w-2xl">
            5 diverse research queries executed with and without reasoning memory.
            Baseline vs. with stored traces. LLM-as-judge scoring on 4 dimensions.
          </p>
        </div>

        {/* Summary Stats - Raw Terminal Format */}
        <div className="bg-[#000000] border-terminal p-4 mb-10 font-mono text-sm">
          <div className="terminal-green">
            avg_without: {avgWithout}% | avg_with: {avgWith}% | delta: +{avgDelta}% | overhead: ~2ms/step
          </div>
        </div>

        {/* Results Table - Pure Text-Based */}
        <div className="border-terminal overflow-hidden mb-10">
          {/* Header Row */}
          <div className="border-b border-[#1a1a1a] grid grid-cols-12 gap-2 px-4 py-2 bg-[#000000]">
            <div className="col-span-4 text-[#404040] text-xs uppercase">TASK</div>
            <div className="col-span-2 text-[#404040] text-xs uppercase text-center">WITHOUT</div>
            <div className="col-span-2 text-[#404040] text-xs uppercase text-center">WITH</div>
            <div className="col-span-1 text-[#404040] text-xs uppercase text-center">DELTA</div>
            <div className="col-span-1 text-[#404040] text-xs uppercase text-center">OVH</div>
          </div>

          {/* Data Rows */}
          {benchmarkData.map((row, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
              className={`border-b border-[#1a1a1a] grid grid-cols-12 gap-2 px-4 py-2 transition-colors ${
                hoveredRow === i ? 'bg-[#0a0a0a]' : 'bg-[#000000]'
              }`}
            >
              <div className="col-span-4 text-xs text-[#b0b0b0] truncate">{row.task}</div>
              <div className="col-span-2 text-xs text-center text-[#b0b0b0] font-mono">{row.withoutMemory}%</div>
              <div className="col-span-2 text-xs text-center terminal-cyan font-mono font-bold">{row.withMemory}%</div>
              <div className="col-span-1 text-xs text-center terminal-green font-mono font-bold">+{row.delta}%</div>
              <div className="col-span-1 text-xs text-center terminal-dim font-mono">{row.tracingOverhead}</div>
            </div>
          ))}

          {/* Summary Row */}
          <div className="border-t-2 border-[#1a1a1a] grid grid-cols-12 gap-2 px-4 py-2 bg-[#000000]">
            <div className="col-span-4 text-xs text-[#b0b0b0] font-bold uppercase">AVERAGE</div>
            <div className="col-span-2 text-xs text-center text-[#b0b0b0] font-mono font-bold">{avgWithout}%</div>
            <div className="col-span-2 text-xs text-center terminal-cyan font-mono font-bold">{avgWith}%</div>
            <div className="col-span-1 text-xs text-center terminal-green font-mono font-bold">+{avgDelta}%</div>
            <div className="col-span-1 text-xs text-center terminal-dim font-mono">~2ms</div>
          </div>
        </div>

        {/* ASCII Bar Charts */}
        <div className="mb-12">
          <div className="terminal-green font-bold text-sm mb-6">$ score_comparison --ascii</div>
          <div className="space-y-4">
            {benchmarkData.map((row, i) => (
              <div key={i} className="space-y-1">
                <div className="text-xs terminal-dim">{row.task}</div>

                {/* Without memory bar */}
                <div className="flex items-center gap-2">
                  <div className="w-32 text-right">
                    <span className="text-[10px] terminal-dim">baseline</span>
                  </div>
                  <div className="flex-1 flex items-center">
                    <div className="h-1 bg-[#1a1a1a]" style={{ width: `${row.withoutMemory}%` }} />
                    <div className="h-1 bg-[#0a0a0a]" style={{ width: `${100 - row.withoutMemory}%` }} />
                  </div>
                  <span className="text-[10px] text-[#b0b0b0] w-12 text-right font-mono">{row.withoutMemory}%</span>
                </div>

                {/* With memory bar */}
                <div className="flex items-center gap-2">
                  <div className="w-32 text-right">
                    <span className="text-[10px] terminal-cyan font-bold">+memory</span>
                  </div>
                  <div className="flex-1 flex items-center">
                    <div className="h-1" style={{ background: '#0abdc6', width: `${row.withMemory}%` }} />
                    <div className="h-1 bg-[#0a0a0a]" style={{ width: `${100 - row.withMemory}%` }} />
                  </div>
                  <span className="text-[10px] terminal-cyan w-12 text-right font-mono font-bold">{row.withMemory}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 space-y-1 text-xs">
            <div className="terminal-dim">--- baseline (no memory)</div>
            <div className="terminal-cyan">=== with reasoning memory</div>
          </div>
        </div>

        {/* Methodology - Man Page Style */}
        <div className="border-terminal p-4 mb-10 bg-[#000000]">
          <div className="terminal-green font-bold mb-4">$ man hippo_methodology</div>
          <div className="font-mono text-xs space-y-3 text-[#b0b0b0] leading-relaxed">
            <div>
              <span className="terminal-green">NAME</span>
              <br />
              {' '}hippo -- agent reasoning memory benchmarks
            </div>

            <div>
              <span className="terminal-green">SETUP</span>
              <br />
              {' '}Each task executed via Claude Sonnet + Vercel AI SDK (streamText,<br />
              {' '}generateText). Agent has access to: searchWeb (Tavily), calculate,<br />
              {' '}analyzeData (Claude Haiku).
            </div>

            <div>
              <span className="terminal-green">EXECUTION MODES</span>
              <br />
              {' '}<span className="terminal-dim">--baseline</span> Agent runs with no prior context.<br />
              {' '}Standard system prompt only.<br />
              <br />
              {' '}<span className="terminal-cyan">--with-memory</span> Reasoning traces from 3 prior<br />
              {' '}conversations injected into system prompt. Agent sees past tool<br />
              {' '}usage patterns, decision paths, summaries.
            </div>

            <div>
              <span className="terminal-green">SCORING</span>
              <br />
              {' '}LLM-as-judge evaluates each response on 4 dimensions (1-5 scale):<br />
              {' '}relevance, completeness, reasoning quality, tool usage effectiveness.<br />
              {' '}Final score is the average as a percentage.
            </div>

            <div>
              <span className="terminal-green">OVERHEAD METRICS</span>
              <br />
              {' '}<span className="terminal-cyan">latency</span> Delta between traced and untraced<br />
              {' '}executions.<br />
              {' '}<span className="terminal-cyan">trace_size</span> JSON.stringify byte count of<br />
              {' '}completed trace object.
            </div>
          </div>
        </div>

        {/* Reproduce - Terminal Commands */}
        <div className="border-terminal p-4 bg-[#000000] mb-12">
          <div className="terminal-green font-bold mb-4">$ hippo_reproduce</div>
          <div className="font-mono text-xs space-y-1 text-[#b0b0b0]">
            <div className="terminal-green">$ git clone https://github.com/darthyoda69/hippo-reasoning.git</div>
            <div className="terminal-green">$ cd hippo-reasoning</div>
            <div className="terminal-green">$ npm install</div>
            <div className="terminal-green">$ echo "ANTHROPIC_API_KEY=your-key" &gt; .env.local</div>
            <div className="terminal-green">$ npm run dev</div>
            <br />
            <div className="terminal-dim"># 1. Chat with the agent 3-5 times (builds reasoning memory)</div>
            <div className="terminal-dim"># 2. Switch to the Eval tab</div>
            <div className="terminal-dim"># 3. Select a query, click "Run Eval Comparison"</div>
            <div className="terminal-dim"># 4. See the score delta between with/without memory</div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-[#1a1a1a] text-center">
          <div className="terminal-dim text-xs mb-3">
            hippo // agent reliability infrastructure
          </div>
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/" className="terminal-dim hover:terminal-cyan transition-colors">
              home
            </Link>
            <a
              href="https://github.com/darthyoda69/hippo-reasoning"
              className="terminal-dim hover:terminal-cyan transition-colors"
            >
              source
            </a>
            <a
              href="https://www.linkedin.com/in/leonbenz/"
              className="terminal-dim hover:terminal-cyan transition-colors"
            >
              creator
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}

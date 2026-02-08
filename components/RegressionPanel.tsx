'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RegressionTest } from '@/lib/hippo';

interface RegressionPanelProps {
  sessionId: string;
}

export function RegressionPanel({ sessionId }: RegressionPanelProps) {
  const [tests, setTests] = useState<RegressionTest[]>([]);
  const [runningAll, setRunningAll] = useState(false);
  const [gateResult, setGateResult] = useState<{
    gate: string;
    results: Array<{ testId: string; name: string; passed: boolean; score: number }>;
    summary: string;
  } | null>(null);
  const [expandedTest, setExpandedTest] = useState<string | null>(null);

  const refreshTests = useCallback(async () => {
    try {
      const res = await fetch('/api/regressions');
      const data = await res.json();
      setTests(data.tests ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshTests();
    const interval = setInterval(refreshTests, 5000);
    return () => clearInterval(interval);
  }, [refreshTests]);

  const runAllRegressions = async () => {
    setRunningAll(true);
    setGateResult(null);
    try {
      const res = await fetch('/api/regressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_all' }),
      });
      const data = await res.json();
      setGateResult(data);
      refreshTests();
    } catch {
      setGateResult({ gate: 'ERROR', results: [], summary: 'Failed to run' });
    } finally {
      setRunningAll(false);
    }
  };

  const deleteTest = async (testId: string) => {
    await fetch('/api/regressions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testId }),
    });
    refreshTests();
  };

  const passing = tests.filter(t => t.lastRunPassed === true).length;
  const failing = tests.filter(t => t.lastRunPassed === false).length;
  const untested = tests.filter(t => t.lastRunPassed === undefined).length;

  if (tests.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="text-2xl mb-3 opacity-30">🛡</div>
        <p className="text-sm text-[#444]">No regression tests yet</p>
        <p className="text-xs text-[#333] mt-2 max-w-xs">
          Chat with the agent, then click <span className="text-[#00d4ff]">&quot;Save as Regression Test&quot;</span> in
          the Trace tab to create your first test.
        </p>
        <div className="mt-6 border border-[#1e1e1e] rounded-lg p-4 max-w-xs">
          <p className="text-[10px] text-[#555] uppercase tracking-wider mb-2">How it works</p>
          <div className="space-y-2 text-xs text-[#666]">
            <div className="flex items-start gap-2">
              <span className="text-[#00d4ff]">1.</span>
              <span>Agent handles a query with good reasoning</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#00d4ff]">2.</span>
              <span>You save the trace as a regression test</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#00d4ff]">3.</span>
              <span>Before deploying, run all tests to catch regressions</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[#00ff88]">4.</span>
              <span className="text-[#00ff88]">Deploy gate: PASS or FAIL</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header with deploy gate button */}
      <div className="sticky top-0 bg-[#0a0a0a] border-b border-[#1e1e1e] px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-[#ededed]">Regression Suite</span>
            <div className="flex items-center gap-2 text-[10px]">
              {passing > 0 && <span className="text-[#00ff88]">{passing} passing</span>}
              {failing > 0 && <span className="text-[#ff4444]">{failing} failing</span>}
              {untested > 0 && <span className="text-[#888]">{untested} untested</span>}
            </div>
          </div>
          <span className="text-[10px] text-[#555]">{tests.length} test{tests.length !== 1 ? 's' : ''}</span>
        </div>

        <button
          onClick={runAllRegressions}
          disabled={runningAll}
          className="w-full py-2.5 rounded-lg text-xs font-medium transition-all bg-[#ededed] text-[#0a0a0a] hover:bg-white disabled:opacity-30"
        >
          {runningAll ? 'Running regression suite...' : '🛡 Run Deploy Gate (All Tests)'}
        </button>
      </div>

      {/* Deploy gate result */}
      {gateResult && (
        <div className={`mx-4 mt-3 rounded-lg border p-4 ${
          gateResult.gate === 'PASS'
            ? 'bg-[#00ff88]/5 border-[#00ff88]/20'
            : 'bg-[#ff4444]/5 border-[#ff4444]/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${
                gateResult.gate === 'PASS' ? 'text-[#00ff88]' : 'text-[#ff4444]'
              }`}>
                {gateResult.gate === 'PASS' ? '✓ PASS' : '✗ FAIL'}
              </span>
            </div>
            <span className="text-xs text-[#888]">{gateResult.summary}</span>
          </div>

          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">
            {gateResult.gate === 'PASS' ? 'Safe to deploy' : 'Regressions detected — block deployment'}
          </div>

          <div className="space-y-1">
            {gateResult.results.map(r => (
              <div key={r.testId} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span className={r.passed ? 'text-[#00ff88]' : 'text-[#ff4444]'}>
                    {r.passed ? '✓' : '✗'}
                  </span>
                  <span className="text-xs text-[#888] truncate max-w-[200px]">{r.name}</span>
                </div>
                <span className="text-xs font-mono text-[#555]">{r.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test list */}
      <div className="p-3 space-y-2">
        {tests.map(test => (
          <div
            key={test.id}
            className="border border-[#1e1e1e] rounded-lg overflow-hidden hover:border-[#333] transition-colors"
          >
            <button
              onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
              className="w-full text-left px-3 py-2.5 flex items-center gap-3"
            >
              {/* Status indicator */}
              <span className={`w-2 h-2 rounded-full ${
                test.lastRunPassed === true ? 'bg-[#00ff88]' :
                test.lastRunPassed === false ? 'bg-[#ff4444]' :
                'bg-[#555]'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="text-xs text-[#ededed] truncate">{test.name}</div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[#555]">
                  <span>min score: {test.minScore}%</span>
                  <span>{test.expectedToolCalls.length} expected tools</span>
                  <span>{test.runs.length} run{test.runs.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <span className="text-[10px] text-[#333]">
                {expandedTest === test.id ? '▼' : '▶'}
              </span>
            </button>

            {/* Expanded view */}
            {expandedTest === test.id && (
              <div className="border-t border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 space-y-2">
                <div className="text-[10px] text-[#555]">
                  Query: <span className="text-[#888] font-mono">{test.query}</span>
                </div>
                <div className="text-[10px] text-[#555]">
                  Expected tools: <span className="text-[#00d4ff]">{test.expectedToolCalls.join(', ') || 'none'}</span>
                </div>

                {test.runs.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Run history</div>
                    {test.runs.slice(-5).reverse().map(run => (
                      <div key={run.id} className="flex items-center justify-between py-0.5 text-[10px]">
                        <div className="flex items-center gap-2">
                          <span className={run.passed ? 'text-[#00ff88]' : 'text-[#ff4444]'}>
                            {run.passed ? '✓' : '✗'}
                          </span>
                          <span className="text-[#888]">Score: {run.score}%</span>
                        </div>
                        <span className="text-[#444]">
                          {new Date(run.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => deleteTest(test.id)}
                  className="text-[10px] text-[#ff4444]/50 hover:text-[#ff4444] transition-colors mt-1"
                >
                  delete test
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

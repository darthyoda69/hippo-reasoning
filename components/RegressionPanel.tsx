'use client';

import { useState, useEffect, useCallback } from 'react';
import type { RegressionTest } from '@/lib/hippo';

interface RegressionPanelProps {
  sessionId: string;
}

function getStoredTests(): RegressionTest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw: RegressionTest[] = JSON.parse(sessionStorage.getItem('hippo-regression-tests') ?? '[]');
    // Deduplicate by query text — keep the entry with the most runs (richest history)
    const byQuery = new Map<string, RegressionTest>();
    for (const t of raw) {
      const existing = byQuery.get(t.query);
      if (!existing || t.runs.length > existing.runs.length) {
        // Merge runs from both if replacing
        if (existing) {
          const allRuns = [...existing.runs, ...t.runs];
          const seenRuns = new Set<string>();
          t.runs = allRuns.filter(r => {
            if (seenRuns.has(r.id)) return false;
            seenRuns.add(r.id);
            return true;
          });
        }
        byQuery.set(t.query, t);
      }
    }
    const deduped = Array.from(byQuery.values());
    if (deduped.length !== raw.length) {
      sessionStorage.setItem('hippo-regression-tests', JSON.stringify(deduped));
    }
    return deduped;
  } catch { return []; }
}

function saveStoredTests(tests: RegressionTest[]) {
  sessionStorage.setItem('hippo-regression-tests', JSON.stringify(tests));
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

  // Load tests from sessionStorage on mount
  useEffect(() => {
    setTests(getStoredTests());
  }, []);

  // Re-sync from sessionStorage periodically (picks up saves from TracePanel/MemoryPanel)
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = getStoredTests();
      if (stored.length !== tests.length) setTests(stored);
    }, 2000);
    return () => clearInterval(interval);
  }, [tests.length]);

  const runAllRegressions = async () => {
    setRunningAll(true);
    setGateResult(null);
    try {
      const res = await fetch('/api/regressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run_all', tests }),
      });
      const data = await res.json();
      setGateResult(data);
      // Update tests with run results from server
      if (data.results) {
        const updated = tests.map(t => {
          const result = data.results.find((r: { testId: string }) => r.testId === t.id);
          if (result) {
            return {
              ...t,
              lastRunAt: Date.now(),
              lastRunPassed: result.passed,
              runs: [...t.runs, {
                id: `run-${Date.now()}-${t.id}`,
                timestamp: Date.now(),
                passed: result.passed,
                score: result.score,
                actualToolCalls: [],
                actualStepCount: 1,
                delta: result.score - t.minScore,
              }],
            };
          }
          return t;
        });
        setTests(updated);
        saveStoredTests(updated);
      }
    } catch {
      setGateResult({ gate: 'ERROR', results: [], summary: 'Failed to run' });
    } finally {
      setRunningAll(false);
    }
  };

  const deleteTest = (testId: string) => {
    const updated = tests.filter(t => t.id !== testId);
    setTests(updated);
    saveStoredTests(updated);
  };

  const passing = tests.filter(t => t.lastRunPassed === true).length;
  const failing = tests.filter(t => t.lastRunPassed === false).length;
  const untested = tests.filter(t => t.lastRunPassed === undefined).length;

  if (tests.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-[#000] font-mono">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
          .matrix-terminal { font-family: 'JetBrains Mono', monospace; }
        `}</style>
        <div className="matrix-terminal max-w-sm">
          <div className="text-[#00ff41] mb-6 text-lg leading-tight">
            $ hippo gate
          </div>
          <div className="text-[#b0b0b0] mb-8 space-y-1 text-sm">
            <div>no regression tests configured</div>
          </div>
          <div className="border border-[#1a1a1a] p-4 bg-[#000] space-y-3">
            <div className="text-[#0abdc6] text-xs uppercase tracking-wider font-medium">How it works</div>
            <div className="space-y-2 text-[#b0b0b0] text-xs leading-relaxed">
              <div>1. agent handles query</div>
              <div>2. save trace as test</div>
              <div>3. run gate before deploy</div>
              <div>4. PASS or FAIL</div>
            </div>
          </div>
          <div className="text-[#404040] text-xs mt-6">
            create tests from trace panel
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#000]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
        .matrix-terminal { font-family: 'JetBrains Mono', monospace; }
        .gate-pass-glow { color: #00ff41; text-shadow: 0 0 8px #00ff41, 0 0 16px #00ff41; }
        .gate-fail-glow { color: #ff0040; text-shadow: 0 0 8px #ff0040, 0 0 16px #ff0040; }
      `}</style>

      <div className="matrix-terminal">
        {/* Header with stats */}
        <div className="sticky top-0 bg-[#000] border-b border-[#1a1a1a] px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[#0abdc6] text-xs font-medium">
              passing: {passing} | failing: {failing} | untested: {untested}
            </div>
            <div className="text-[#404040] text-xs">
              {tests.length} test{tests.length !== 1 ? 's' : ''}
            </div>
          </div>

          <button
            onClick={runAllRegressions}
            disabled={runningAll}
            className="w-full py-2 border border-[#00ff41] bg-[#000] text-[#00ff41] text-xs font-medium transition-all hover:bg-[#00ff41]/5 disabled:opacity-50 disabled:border-[#404040] disabled:text-[#404040]"
            style={{ borderRadius: '0px' }}
          >
            {runningAll ? '$ hippo gate --run-all [RUNNING]' : '$ hippo gate --run-all'}
          </button>
        </div>

        {/* Deploy gate result */}
        {gateResult && (
          <div className="mx-4 mt-4 border border-[#1a1a1a] p-4 bg-[#000]">
            <div className="mb-4">
              {gateResult.gate === 'PASS' ? (
                <div className="gate-pass-glow text-3xl font-bold tracking-wider">
                  GATE: PASS
                </div>
              ) : (
                <div className="gate-fail-glow text-3xl font-bold tracking-wider">
                  GATE: FAIL
                </div>
              )}
            </div>

            <div className={`text-xs font-medium mb-4 ${
              gateResult.gate === 'PASS' ? 'text-[#00ff41]' : 'text-[#ff0040]'
            }`}>
              {gateResult.gate === 'PASS' ? '>> deploy authorized' : '>> BLOCKED -- regressions detected'}
            </div>

            <div className="space-y-1 text-[#b0b0b0] text-xs">
              {gateResult.results.map(r => (
                <div key={r.testId} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={r.passed ? 'text-[#00ff41]' : 'text-[#ff0040]'}>
                      [{r.passed ? 'PASS' : 'FAIL'}]
                    </span>
                    <span className="truncate max-w-[200px]">{r.name}</span>
                  </div>
                  <span className="text-[#404040]">{r.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test list */}
        <div className="p-4 space-y-2">
          {tests.map(test => (
            <div key={test.id} className="border border-[#1a1a1a] bg-[#000] overflow-hidden">
              <button
                onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
                className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-[#0a0a0a] transition-colors text-[#b0b0b0] text-xs"
              >
                <span className={`font-bold min-w-fit ${
                  test.lastRunPassed === true ? 'text-[#00ff41]' :
                  test.lastRunPassed === false ? 'text-[#ff0040]' :
                  'text-[#404040]'
                }`}>
                  {test.lastRunPassed === true ? '[PASS]' :
                   test.lastRunPassed === false ? '[FAIL]' :
                   '[--]'}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{test.name}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[#404040]">
                    <span>min:{test.minScore}%</span>
                    <span>tools:{test.expectedToolCalls.length}</span>
                    <span>runs:{test.runs.length}</span>
                  </div>
                </div>

                <span className="text-[#404040] text-xs min-w-fit">
                  {expandedTest === test.id ? '[-]' : '[+]'}
                </span>
              </button>

              {/* Expanded view */}
              {expandedTest === test.id && (
                <div className="border-t border-[#1a1a1a] bg-[#000] px-3 py-2 space-y-2 text-[#b0b0b0] text-xs">
                  <div>
                    <span className="text-[#0abdc6]">query:</span> {test.query}
                  </div>
                  <div>
                    <span className="text-[#0abdc6]">expected:</span> {test.expectedToolCalls.join(', ') || 'none'}
                  </div>

                  {test.runs.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[#1a1a1a]">
                      <div className="text-[#0abdc6] text-[10px] uppercase tracking-wider font-medium mb-1">history:</div>
                      {test.runs.slice(-5).reverse().map(run => (
                        <div key={run.id} className="flex items-center justify-between py-0.5 text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className={run.passed ? 'text-[#00ff41]' : 'text-[#ff0040]'}>
                              {run.passed ? '[PASS]' : '[FAIL]'}
                            </span>
                            <span className="text-[#404040]">score: {run.score}%</span>
                          </div>
                          <span className="text-[#404040]">
                            {new Date(run.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => deleteTest(test.id)}
                    className="text-[#ff0040] hover:text-[#ff0040] transition-colors mt-2 text-[10px] font-medium"
                  >
                    rm --test
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

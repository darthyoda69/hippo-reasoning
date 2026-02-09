'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ChatPanel } from '@/components/ChatPanel';
import { TracePanel } from '@/components/TracePanel';
import { MemoryPanel } from '@/components/MemoryPanel';
import { EvalPanel } from '@/components/EvalPanel';
import { RegressionPanel } from '@/components/RegressionPanel';
import { DiffPanel } from '@/components/DiffPanel';
import { MatrixRain } from '@/components/MatrixRain';
import type { ReasoningTrace } from '@/lib/hippo';

type RightTab = 'trace' | 'memory' | 'eval' | 'regression' | 'diff';

function getSessionId(): string {
  if (typeof window === 'undefined') return 'demo-0';
  const stored = sessionStorage.getItem('hippo-session-id');
  if (stored) return stored;
  const id = 'demo-' + Date.now();
  sessionStorage.setItem('hippo-session-id', id);
  return id;
}

function getStoredTraces(): ReasoningTrace[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem('hippo-traces');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function Home() {
  const [rightTab, setRightTab] = useState<RightTab>('trace');
  const [currentTrace, setCurrentTrace] = useState<ReasoningTrace | null>(null);
  const [storedTraces, setStoredTraces] = useState<ReasoningTrace[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState('demo-0');
  const [hydrated, setHydrated] = useState(false);
  const [diffTraces, setDiffTraces] = useState<[ReasoningTrace | null, ReasoningTrace | null]>([null, null]);

  // Restore state from sessionStorage after hydration
  useEffect(() => {
    const id = getSessionId();
    setSessionId(id);
    const traces = getStoredTraces();
    if (traces.length > 0) setStoredTraces(traces);
    setHydrated(true);
  }, []);

  // Persist traces to sessionStorage whenever they change
  useEffect(() => {
    if (hydrated && storedTraces.length > 0) {
      sessionStorage.setItem('hippo-traces', JSON.stringify(storedTraces));
    }
  }, [storedTraces, hydrated]);

  const refreshTraces = useCallback(async () => {
    try {
      const res = await fetch(`/api/traces?sessionId=${sessionId}`);
      const data = await res.json();
      if (data.traces?.length > 0) {
        setStoredTraces(data.traces);
      }
    } catch { /* ignore */ }
  }, [sessionId]);

  const handleTraceUpdate = useCallback((trace: ReasoningTrace | null) => {
    setCurrentTrace(trace);
    if (trace) {
      // Add to client-side stored traces (serverless functions don't share memory)
      setStoredTraces(prev => {
        if (prev.some(t => t.id === trace.id)) return prev;
        return [trace, ...prev];
      });
    }
  }, []);

  const handleDiffSelect = useCallback((trace: ReasoningTrace) => {
    setDiffTraces(prev => {
      // Toggle off if already selected
      if (prev[0] && prev[0].id === trace.id) return [null, prev[1]];
      if (prev[1] && prev[1].id === trace.id) return [prev[0], null];
      // Fill empty slot
      if (!prev[0]) return [trace, prev[1]];
      if (!prev[1]) return [trace, prev[0]];
      // Both full — rotate
      return [prev[1], trace];
    });
    setRightTab('diff');
  }, []);

  const tabs: { id: RightTab; label: string; count?: number }[] = [
    { id: 'trace', label: 'TRACE' },
    { id: 'memory', label: 'MEMORY', count: storedTraces.length },
    { id: 'diff', label: 'DIFF' },
    { id: 'eval', label: 'EVAL' },
    { id: 'regression', label: 'CI/CD' },
  ];

  // Don't render until sessionStorage is restored (prevents wrong sessionId reaching ChatPanel)
  if (!hydrated) {
    return <div className="h-screen bg-black" />;
  }

  return (
    <div className="h-screen flex flex-col bg-black">
      <MatrixRain />
      {/* Header — terminal style */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[#00ff41] glow-green font-semibold">hippo</span>
            <span className="text-[#404040]">//</span>
            <span className="text-[#606060] text-[11px]">agent reliability infrastructure</span>
          </div>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-[10px] text-[#00ff41]">
              <span className="cursor-blink">|</span>
              <span className="live-pulse">LIVE</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-[#404040]">
          <span className="text-[#333]">vercel ai sdk v4</span>
          <Link href="/benchmarks" className="text-[#505050] hover:text-[#00ff41] transition-colors">
            benchmarks
          </Link>
          <a href="https://github.com/darthyoda69/hippo-reasoning" target="_blank" rel="noopener" className="text-[#505050] hover:text-[#00ff41] transition-colors">
            github
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat */}
        <div className="w-[55%] border-r border-[#1a1a1a] flex flex-col">
          <ChatPanel sessionId={sessionId} onTraceUpdate={handleTraceUpdate} onStreamingChange={setIsStreaming} />
        </div>

        {/* Right panel */}
        <div className="w-[45%] flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-[#1a1a1a]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`px-3 py-2 text-[10px] tracking-widest transition-colors relative ${
                  rightTab === tab.id ? 'text-[#00ff41]' : 'text-[#404040] hover:text-[#606060]'
                }`}
              >
                {rightTab === tab.id && <span className="mr-1">&gt;</span>}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 text-[#404040]">[{tab.count}]</span>
                )}
                {rightTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-[#00ff41]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === 'trace' && <TracePanel trace={currentTrace} isStreaming={isStreaming} />}
            {rightTab === 'memory' && (
              <MemoryPanel
                traces={storedTraces}
                onRefresh={refreshTraces}
                sessionId={sessionId}
                onDiffSelect={handleDiffSelect}
                diffSelectedIds={[diffTraces[0]?.id ?? null, diffTraces[1]?.id ?? null]}
              />
            )}
            {rightTab === 'diff' && <DiffPanel traceA={diffTraces[0]} traceB={diffTraces[1]} />}
            {rightTab === 'eval' && <EvalPanel sessionId={sessionId} hasMemory={storedTraces.length > 0} />}
            {rightTab === 'regression' && <RegressionPanel sessionId={sessionId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

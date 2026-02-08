'use client';

import { useState, useCallback } from 'react';
import { ChatPanel } from '@/components/ChatPanel';
import { TracePanel } from '@/components/TracePanel';
import { MemoryPanel } from '@/components/MemoryPanel';
import { EvalPanel } from '@/components/EvalPanel';
import { RegressionPanel } from '@/components/RegressionPanel';
import type { ReasoningTrace } from '@/lib/hippo';

type RightTab = 'trace' | 'memory' | 'eval' | 'regression';

export default function Home() {
  const [rightTab, setRightTab] = useState<RightTab>('trace');
  const [currentTrace, setCurrentTrace] = useState<ReasoningTrace | null>(null);
  const [storedTraces, setStoredTraces] = useState<ReasoningTrace[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId] = useState('demo-' + Date.now());

  const refreshTraces = useCallback(async () => {
    try {
      const res = await fetch(`/api/traces?sessionId=${sessionId}`);
      const data = await res.json();
      setStoredTraces(data.traces ?? []);
    } catch { /* ignore */ }
  }, [sessionId]);

  const handleTraceUpdate = useCallback((trace: ReasoningTrace | null) => {
    setCurrentTrace(trace);
    if (trace) refreshTraces();
  }, [refreshTraces]);

  const tabs: { id: RightTab; label: string; count?: number }[] = [
    { id: 'trace', label: 'Trace' },
    { id: 'memory', label: 'Memory', count: storedTraces.length },
    { id: 'eval', label: 'Eval' },
    { id: 'regression', label: 'CI/CD' },
  ];

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <span className="text-2xl">🦛</span>
            <span>Hippo</span>
            <span className="text-[#888] font-normal text-sm ml-1">Reasoning</span>
          </div>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-[#00d4ff]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] live-pulse" />
              tracing
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-[#666]">
          <span>Agent reliability infrastructure for Vercel AI SDK</span>
          <a
            href="/benchmarks"
            className="text-[#888] hover:text-[#ededed] transition-colors"
          >
            Benchmarks
          </a>
          <a
            href="https://github.com/darthyoda/hippo-reasoning"
            target="_blank"
            rel="noopener"
            className="text-[#888] hover:text-[#ededed] transition-colors"
          >
            GitHub →
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Chat */}
        <div className="w-[55%] border-r border-[#1e1e1e] flex flex-col">
          <ChatPanel
            sessionId={sessionId}
            onTraceUpdate={handleTraceUpdate}
            onStreamingChange={setIsStreaming}
          />
        </div>

        {/* Right: Trace / Memory / Eval / CI/CD */}
        <div className="w-[45%] flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-[#1e1e1e]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
                  rightTab === tab.id
                    ? 'text-[#ededed]'
                    : 'text-[#666] hover:text-[#888]'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1.5 text-[10px] bg-[#1e1e1e] text-[#888] px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
                {rightTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-[#00d4ff]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === 'trace' && (
              <TracePanel
                trace={currentTrace}
                isStreaming={isStreaming}
              />
            )}
            {rightTab === 'memory' && (
              <MemoryPanel
                traces={storedTraces}
                onRefresh={refreshTraces}
                sessionId={sessionId}
              />
            )}
            {rightTab === 'eval' && (
              <EvalPanel
                sessionId={sessionId}
                hasMemory={storedTraces.length > 0}
              />
            )}
            {rightTab === 'regression' && (
              <RegressionPanel
                sessionId={sessionId}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

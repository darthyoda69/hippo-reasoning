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
    { id: 'trace', label: 'TRACE' },
    { id: 'memory', label: 'MEMORY', count: storedTraces.length },
    { id: 'eval', label: 'EVAL' },
    { id: 'regression', label: 'CI/CD' },
  ];

  return (
    <div className="h-screen flex flex-col bg-black">
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
          <a href="/benchmarks" className="text-[#505050] hover:text-[#00ff41] transition-colors">
            benchmarks
          </a>
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
            {rightTab === 'memory' && <MemoryPanel traces={storedTraces} onRefresh={refreshTraces} sessionId={sessionId} />}
            {rightTab === 'eval' && <EvalPanel sessionId={sessionId} hasMemory={storedTraces.length > 0} />}
            {rightTab === 'regression' && <RegressionPanel sessionId={sessionId} />}
          </div>
        </div>
      </div>
    </div>
  );
}

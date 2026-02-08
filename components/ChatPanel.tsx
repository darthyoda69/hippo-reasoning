'use client';

import { useChat } from 'ai/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReasoningTrace } from '@/lib/hippo';

interface ChatPanelProps {
  sessionId: string;
  onTraceUpdate: (trace: ReasoningTrace | null) => void;
  onStreamingChange: (streaming: boolean) => void;
}

export function ChatPanel({ sessionId, onTraceUpdate, onStreamingChange }: ChatPanelProps) {
  const [useMemory, setUseMemory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { sessionId, useMemory },
    onResponse: async (response) => {
      onStreamingChange(true);
      // Fetch trace after a short delay to let server store it
      const traceId = response.headers.get('X-Hippo-Trace-Id');
      if (traceId) {
        setTimeout(async () => {
          try {
            const res = await fetch(`/api/traces?traceId=${traceId}`);
            const data = await res.json();
            if (data.trace) onTraceUpdate(data.trace);
          } catch { /* retry below */ }
        }, 500);
      }
    },
    onFinish: async () => {
      onStreamingChange(false);
      // Final trace fetch
      try {
        const res = await fetch(`/api/traces?sessionId=${sessionId}`);
        const data = await res.json();
        const latest = data.traces?.[0];
        if (latest) onTraceUpdate(latest);
      } catch { /* ignore */ }
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const exampleQueries = [
    'What is the state of AI agent memory systems?',
    'How big is the AI infrastructure market?',
    'Compare the performance characteristics of Rust vs Python for infrastructure',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4">🦛</div>
            <h2 className="text-lg font-semibold mb-2">Hippo Reasoning Demo</h2>
            <p className="text-sm text-[#666] mb-6 max-w-md">
              Chat with the agent. Watch reasoning traces appear in real-time.
              Memory improves future responses. Toggle eval to see the difference.
            </p>
            <div className="space-y-2 w-full max-w-md">
              {exampleQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const event = { target: { value: q } } as React.ChangeEvent<HTMLInputElement>;
                    handleInputChange(event);
                  }}
                  className="w-full text-left px-4 py-3 rounded-lg border border-[#1e1e1e] hover:border-[#333] text-sm text-[#888] hover:text-[#ededed] transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#1a1a2e] text-[#ededed]'
                      : 'bg-[#111] border border-[#1e1e1e] text-[#ccc]'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-[#555]">
                      <span>🦛</span>
                      <span>hippo agent</span>
                      {useMemory && <span className="text-[#00d4ff]">• memory active</span>}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 text-[#666]">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full live-pulse" />
                      <span className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full live-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1.5 h-1.5 bg-[#00d4ff] rounded-full live-pulse" style={{ animationDelay: '0.4s' }} />
                    </div>
                    reasoning...
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#1e1e1e] px-5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setUseMemory(!useMemory)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all ${
              useMemory
                ? 'bg-[#00d4ff]/10 text-[#00d4ff] border border-[#00d4ff]/20'
                : 'bg-[#111] text-[#666] border border-[#1e1e1e]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${useMemory ? 'bg-[#00d4ff]' : 'bg-[#333]'}`} />
            Memory {useMemory ? 'ON' : 'OFF'}
          </button>
          <span className="text-[10px] text-[#444]">
            {useMemory ? 'Agent uses past reasoning traces' : 'Agent runs without memory (baseline)'}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask the agent anything..."
            className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-2.5 text-sm text-[#ededed] placeholder-[#444] focus:outline-none focus:border-[#333] transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 bg-[#ededed] text-[#0a0a0a] rounded-lg text-sm font-medium hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

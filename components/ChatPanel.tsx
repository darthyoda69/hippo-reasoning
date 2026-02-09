'use client';

import { useChat } from 'ai/react';
import type { Message } from 'ai';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReasoningTrace } from '@/lib/hippo';

interface ChatPanelProps {
  sessionId: string;
  onTraceUpdate: (trace: ReasoningTrace | null) => void;
  onStreamingChange: (streaming: boolean) => void;
}

function getSavedMessages(sessionId: string): Message[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(`hippo-messages-${sessionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function ChatPanel({ sessionId, onTraceUpdate, onStreamingChange }: ChatPanelProps) {
  const [useMemory, setUseMemory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, setMessages, input, handleInputChange, handleSubmit, isLoading, data } = useChat({
    api: '/api/chat',
    body: { sessionId, useMemory },
    onResponse: async () => {
      onStreamingChange(true);
    },
    onFinish: async () => {
      onStreamingChange(false);
    },
  });

  // Restore messages from sessionStorage after mount
  useEffect(() => {
    const saved = getSavedMessages(sessionId);
    if (saved.length > 0) setMessages(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(`hippo-messages-${sessionId}`, JSON.stringify(messages));
    }
  }, [messages, sessionId]);

  // Extract trace data streamed from the server
  useEffect(() => {
    if (data && data.length > 0) {
      const lastItem = data[data.length - 1] as { type?: string; trace?: ReasoningTrace };
      if (lastItem?.type === 'trace' && lastItem?.trace) {
        onTraceUpdate(lastItem.trace);
      }
    }
  }, [data, onTraceUpdate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const exampleQueries = [
    'What is the state of AI agent memory systems?',
    'How big is the AI infrastructure market?',
    'Compare the performance characteristics of Rust vs Python for infrastructure',
  ];

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#000' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

        .glow-green {
          text-shadow: 0 0 8px #00ff41;
        }

        .glow-cyan {
          text-shadow: 0 0 8px #0abdc6;
        }

        .cursor-blink {
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ backgroundColor: '#000' }}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-start justify-center text-left">
            <div className="mb-6" style={{ color: '#404040' }}>
              <div style={{ color: '#00ff41' }} className="glow-green text-sm leading-6">
                $ hippo.agent --ready<br/>
                {'>'} initializing matrix terminal...<br/>
                {'>'} memory engine: {useMemory ? 'online' : 'offline'}<br/>
                {'>'} waiting for input...<br/>
              </div>
            </div>
            <div className="space-y-2 w-full max-w-2xl">
              <div style={{ color: '#404040' }} className="text-xs mb-4">
                -- example queries --
              </div>
              {exampleQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const event = { target: { value: q } } as React.ChangeEvent<HTMLInputElement>;
                    handleInputChange(event);
                  }}
                  className="w-full text-left px-3 py-2 border transition-all"
                  style={{
                    borderColor: '#00ff41',
                    color: '#00ff41',
                    backgroundColor: '#000',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#0abdc6';
                    e.currentTarget.style.borderColor = '#0abdc6';
                    e.currentTarget.style.textShadow = '0 0 8px #0abdc6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#00ff41';
                    e.currentTarget.style.borderColor = '#00ff41';
                    e.currentTarget.style.textShadow = 'none';
                  }}
                >
                  {'>'} {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  style={{
                    backgroundColor: '#000',
                    borderColor: m.role === 'user' ? '#404040' : '#00ff41',
                    color: m.role === 'user' ? '#b0b0b0' : '#00ff41',
                    maxWidth: '85%',
                  }}
                  className={`border px-3 py-2 text-sm leading-relaxed ${
                    m.role === 'user' ? '' : 'glow-green'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div style={{ color: '#0abdc6' }} className="text-xs mb-1.5 glow-cyan">
                      -- hippo.agent // memory:{useMemory ? 'active' : 'inactive'} --
                    </div>
                  )}
                  {m.role === 'user' && (
                    <div style={{ color: '#404040' }} className="text-xs mb-1.5">
                      {'>'} user input
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div
                  style={{
                    backgroundColor: '#000',
                    borderColor: '#0abdc6',
                    color: '#0abdc6',
                  }}
                  className="border px-3 py-2 text-sm glow-cyan"
                >
                  <div className="flex items-center gap-2">
                    <span className="cursor-blink">|</span>
                    <span>reasoning trace processing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ borderColor: '#404040' }} className="border-t px-5 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setUseMemory(!useMemory)}
            style={{
              backgroundColor: '#000',
              borderColor: useMemory ? '#00ff41' : '#404040',
              color: useMemory ? '#00ff41' : '#404040',
            }}
            className={`border px-2.5 py-1 text-xs transition-all ${useMemory ? 'glow-green' : ''}`}
          >
            [MEMORY: {useMemory ? 'ON' : 'OFF'}]
          </button>
          <span style={{ color: '#404040' }} className="text-xs">
            {useMemory ? '// memory trace: enabled' : '// memory trace: disabled'}
          </span>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div style={{ borderColor: '#404040' }} className="flex-1 border px-3 py-2 flex items-center gap-2">
            <span style={{ color: '#00ff41' }}>$</span>
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="enter query..."
              style={{
                backgroundColor: '#000',
                color: '#00ff41',
                fontSize: '0.875rem',
              }}
              className="flex-1 outline-none glow-green"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              backgroundColor: isLoading || !input.trim() ? '#404040' : '#00ff41',
              color: isLoading || !input.trim() ? '#404040' : '#000',
              borderColor: '#00ff41',
              opacity: isLoading || !input.trim() ? 0.5 : 1,
            }}
            className="px-4 py-2 border text-xs font-semibold transition-all"
          >
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}

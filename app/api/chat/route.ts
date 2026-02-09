import { streamText, tool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { TraceBuilder, hippoMemory } from '@/lib/hippo';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, sessionId = 'default', useMemory = true } = await req.json();

  const traceId = nanoid(12);
  const userMessage = messages[messages.length - 1]?.content ?? '';
  const trace = new TraceBuilder(traceId, sessionId, userMessage);

  // Get reasoning context from stored traces
  const reasoningContext = useMemory
    ? await hippoMemory.getReasoningContext(userMessage, sessionId)
    : '';

  trace.addStep('user_message', userMessage);

  const systemPrompt = [
    `You are a research assistant. Answer questions thoroughly using the tools available to you.`,
    `When you use tools, explain your reasoning step by step.`,
    reasoningContext
      ? `\n\nYou have reasoning memory from past tasks in this session. Use it to give better, more informed answers:\n\n${reasoningContext}`
      : '',
  ].join('');

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: systemPrompt,
    messages,
    maxSteps: 5,
    tools: {
      searchKnowledge: tool({
        description: 'Search for factual information about a topic. Use this when you need to look up data, statistics, or facts.',
        parameters: z.object({
          query: z.string().describe('The search query'),
          domain: z.string().optional().describe('Specific domain to search: science, business, tech, history'),
        }),
        execute: async ({ query, domain }) => {
          trace.addStep('tool_call', `Searching: "${query}"${domain ? ` in ${domain}` : ''}`, {
            toolName: 'searchKnowledge',
            toolArgs: { query, domain },
          });

          // Simulated search with realistic responses
          const results = getSearchResults(query, domain);

          trace.addStep('tool_result', JSON.stringify(results).slice(0, 300), {
            toolName: 'searchKnowledge',
          });

          return results;
        },
      }),

      calculate: tool({
        description: 'Perform mathematical calculations. Use for any math, percentages, conversions, or data analysis.',
        parameters: z.object({
          expression: z.string().describe('The math expression to evaluate'),
          context: z.string().optional().describe('What this calculation is for'),
        }),
        execute: async ({ expression, context }) => {
          trace.addStep('tool_call', `Calculating: ${expression}${context ? ` (${context})` : ''}`, {
            toolName: 'calculate',
            toolArgs: { expression, context },
          });

          let result: number;
          try {
            // Safe math evaluation (basic arithmetic only)
            result = Function(`"use strict"; return (${expression.replace(/[^0-9+\-*/().%\s]/g, '')})`)() as number;
          } catch {
            result = NaN;
          }

          const output = { expression, result: isNaN(result) ? 'Error' : result, context };

          trace.addStep('tool_result', `Result: ${output.result}`, {
            toolName: 'calculate',
          });

          return output;
        },
      }),

      analyzeData: tool({
        description: 'Analyze data patterns, compare metrics, or draw conclusions from information. Use when synthesizing multiple data points.',
        parameters: z.object({
          data: z.string().describe('The data or information to analyze'),
          analysisType: z.enum(['compare', 'trend', 'summary', 'recommendation']).describe('Type of analysis'),
        }),
        execute: async ({ data, analysisType }) => {
          trace.addStep('tool_call', `Analyzing (${analysisType}): ${data.slice(0, 100)}...`, {
            toolName: 'analyzeData',
            toolArgs: { analysisType, dataLength: data.length },
          });

          const analysis = {
            type: analysisType,
            input: data.slice(0, 200),
            insights: `Analysis of type "${analysisType}" completed on ${data.length} chars of input.`,
          };

          trace.addStep('tool_result', analysis.insights, {
            toolName: 'analyzeData',
          });

          return analysis;
        },
      }),
    },

    onStepFinish: async (event) => {
      if (event.text) {
        trace.addStep('assistant_message', event.text.slice(0, 500));
      }
    },

    onFinish: async (event) => {
      if (event.text) {
        trace.addStep('assistant_message', event.text.slice(0, 500));
      }

      const completedTrace = trace.complete(
        event.text ? event.text.slice(0, 200) : undefined
      );
      await hippoMemory.store(completedTrace);
    },
  });

  // Return stream with trace ID in headers
  const response = result.toDataStreamResponse();

  // Add trace ID header so client can fetch trace data
  const headers = new Headers(response.headers);
  headers.set('X-Hippo-Trace-Id', traceId);
  headers.set('X-Hippo-Session-Id', sessionId);
  headers.set('X-Hippo-Memory-Used', reasoningContext ? 'true' : 'false');
  headers.set('X-Hippo-Memory-Size', String(await hippoMemory.getSize()));

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

// ─── Simulated Knowledge Base ─────────────────────────────────────

function getSearchResults(query: string, domain?: string): { results: Array<{ title: string; snippet: string; relevance: number }> } {
  const q = query.toLowerCase();
  const knowledgeBase: Array<{ keywords: string[]; title: string; snippet: string }> = [
    {
      keywords: ['ai', 'agent', 'memory', 'llm'],
      title: 'AI Agent Memory Systems — State of the Art 2026',
      snippet: 'Current AI agents lack persistent reasoning memory. While solutions like Mem0 ($24M Series A) store factual memory, none capture reasoning traces — the decision paths, tool usage patterns, and problem-solving strategies agents use. This gap prevents agents from learning across sessions.',
    },
    {
      keywords: ['market', 'size', 'ai', 'infrastructure'],
      title: 'AI Infrastructure Market Analysis',
      snippet: 'The AI infrastructure market is projected to exceed $150B by 2028. Memory and observability represent the fastest-growing segments as enterprise adoption of AI agents accelerates. Agent orchestration spending grew 340% YoY in 2025.',
    },
    {
      keywords: ['vercel', 'sdk', 'deployment', 'nextjs'],
      title: 'Vercel AI SDK Ecosystem Report',
      snippet: 'The Vercel AI SDK has become the de facto standard for building AI-powered web applications. Over 200K projects use the SDK, with agent-based architectures growing fastest. Key missing piece: native reasoning trace and memory capabilities.',
    },
    {
      keywords: ['hippocampus', 'memory', 'brain', 'neuroscience'],
      title: 'Hippocampal Memory Architecture',
      snippet: 'The hippocampus, representing only 0.1% of brain volume, is responsible for all episodic memory formation and pattern completion. Its dual-process architecture (fast encoding in CA3, slow consolidation to cortex) inspired modern AI memory research including HEMA (2025) which achieved 87% factual recall.',
    },
    {
      keywords: ['startup', 'growth', 'revenue', 'saas'],
      title: 'Developer Tool Startup Growth Benchmarks',
      snippet: 'Developer-focused infrastructure startups with OSS adoption strategies show median 15% MoM growth in year 1. Key success factor: solving a pain point developers encounter daily. Top performers: Vercel, Supabase, Railway — all started as dev tools with strong DX.',
    },
    {
      keywords: ['climate', 'energy', 'renewable', 'carbon'],
      title: 'Global Energy Transition Report 2026',
      snippet: 'Renewable energy now accounts for 42% of global electricity generation. Solar costs dropped 89% over the past decade. The transition requires $4.5T annual investment through 2030 to meet Paris Agreement targets.',
    },
    {
      keywords: ['productivity', 'remote', 'work', 'tools'],
      title: 'Workplace Productivity Analysis',
      snippet: 'Knowledge workers spend 28% of their time searching for information. AI-assisted workflows reduce this to 11%. Companies using AI agents for routine tasks report 34% productivity gains, but 67% cite "lack of context continuity" as the primary limitation.',
    },
    {
      keywords: ['rust', 'performance', 'systems', 'programming'],
      title: 'Rust in Production Infrastructure',
      snippet: 'Rust adoption in production infrastructure grew 180% in 2025. Key adopters: Cloudflare (network edge), Discord (real-time), Figma (multiplayer). Primary advantage: memory safety with zero-cost abstractions, enabling sub-millisecond latency in hot-path operations.',
    },
  ];

  const results = knowledgeBase
    .map(item => {
      const relevance = item.keywords.filter(k => q.includes(k)).length / item.keywords.length;
      return { title: item.title, snippet: item.snippet, relevance: Math.round(relevance * 100) / 100 };
    })
    .filter(r => r.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3);

  if (results.length === 0) {
    return {
      results: [{
        title: `Search results for "${query}"`,
        snippet: `Found relevant information about ${query}${domain ? ` in the ${domain} domain` : ''}. Key findings suggest this is an active area of development with significant market opportunity.`,
        relevance: 0.5,
      }],
    };
  }

  return { results };
}

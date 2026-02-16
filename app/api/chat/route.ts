import { createDataStreamResponse, streamText, generateText, tool } from 'ai';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { TraceBuilder, hippoMemory } from '@/lib/hippo';
import { getModel } from '@/lib/models';
import { tavily } from '@tavily/core';
import { anthropic } from '@ai-sdk/anthropic';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, sessionId = 'default', useMemory = true, model: requestedModel } = await req.json();

  const { model: aiModel, providerId } = getModel(requestedModel);

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
    `When you use tools, explain your reasoning step by step. Limit yourself to 2-3 tool calls, then synthesize the results into a comprehensive final answer.`,
    reasoningContext
      ? `\n\nYou have reasoning memory from past tasks in this session. Use it to give better, more informed answers:\n\n${reasoningContext}`
      : '',
  ].join('');

  return createDataStreamResponse({
    execute: async (dataStream) => {
      const result = streamText({
        model: aiModel,
        system: systemPrompt,
        messages,
        maxSteps: 10,
        tools: {
          searchKnowledge: tool({
            description: 'Search the web for factual information about a topic. Use this when you need to look up data, statistics, or facts.',
            parameters: z.object({
              query: z.string().describe('The search query'),
              domain: z.string().optional().describe('Specific domain to search: science, business, tech, history'),
            }),
            execute: async ({ query, domain }) => {
              trace.addStep('tool_call', `Searching: "${query}"${domain ? ` in ${domain}` : ''}`, {
                toolName: 'searchKnowledge',
                toolArgs: { query, domain },
              });

              const results = await searchWeb(query, domain);

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

              let calcResult: number;
              try {
                calcResult = Function(`"use strict"; return (${expression.replace(/[^0-9+\-*/().%\s]/g, '')})`)() as number;
              } catch {
                calcResult = NaN;
              }

              const output = { expression, result: isNaN(calcResult) ? 'Error' : calcResult, context };

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

              let insights: string;
              try {
                const result = await generateText({
                  model: anthropic('claude-haiku-4-5-20251001'),
                  system: `You are a data analyst. Perform a ${analysisType} analysis. Be concise (2-3 sentences).`,
                  prompt: data.slice(0, 1000),
                });
                insights = result.text;
              } catch {
                insights = `Analysis of ${data.length} chars: key patterns identified in ${analysisType} context.`;
              }

              trace.addStep('tool_result', insights.slice(0, 300), {
                toolName: 'analyzeData',
              });

              return { type: analysisType, insights };
            },
          }),
        },

        onStepFinish: async (event) => {
          // Only capture intermediate step text (tool-using steps).
          // The final text is captured in onFinish to avoid duplicates.
          if (event.text && event.toolCalls && event.toolCalls.length > 0) {
            trace.addStep('reasoning', event.text.slice(0, 500));
          }
        },

        onFinish: async (event) => {
          // Always capture the final assistant response as a trace step.
          // This ensures every query (even simple ones with no tools) produces
          // a trace with at least: user_message + assistant_message.
          if (event.text) {
            trace.addStep('assistant_message', event.text.slice(0, 500));
          } else {
            trace.addStep('assistant_message', '[empty response]');
          }

          const completedTrace = trace.complete(
            event.text ? event.text.slice(0, 200) : undefined
          );

          // Store in memory (for reasoning context in future chats)
          await hippoMemory.store(completedTrace);

          // Stream the trace data directly to the client
          dataStream.writeData(JSON.parse(JSON.stringify({ type: 'trace', trace: completedTrace, model: providerId })));
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    headers: {
      'X-Hippo-Trace-Id': traceId,
      'X-Hippo-Session-Id': sessionId,
      'X-Hippo-Memory-Used': reasoningContext ? 'true' : 'false',
      'X-Hippo-Model': providerId,
    },
  });
}

// ─── Web Search (Tavily) ─────────────────────────────────────────

const tavilyClient = process.env.TAVILY_API_KEY
  ? tavily({ apiKey: process.env.TAVILY_API_KEY })
  : null;

async function searchWeb(
  query: string,
  domain?: string,
): Promise<{ results: Array<{ title: string; snippet: string; url: string; relevance: number }> }> {
  const searchQuery = domain ? `${query} ${domain}` : query;

  if (tavilyClient) {
    try {
      const response = await tavilyClient.search(searchQuery, {
        maxResults: 3,
        searchDepth: 'basic',
      });
      return {
        results: response.results.map((r) => ({
          title: r.title,
          snippet: r.content.slice(0, 300),
          url: r.url,
          relevance: r.score ?? 0.8,
        })),
      };
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: let the model answer from its own knowledge (no fake results)
  return {
    results: [{
      title: `Web search unavailable`,
      snippet: `Search API not configured. Answer from your own knowledge about: ${searchQuery}`,
      url: '',
      relevance: 0.5,
    }],
  };
}

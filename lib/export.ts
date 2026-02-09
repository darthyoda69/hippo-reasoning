/**
 * Hippo Reasoning — Trace Export
 * Convert ReasoningTraces to fine-tuning datasets (OpenAI, Anthropic, CSV, JSONL)
 */

import type { ReasoningTrace } from '@/lib/hippo';

// ─── OpenAI Fine-Tuning Format ──────────────────────────────────────

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

/**
 * Converts a ReasoningTrace into OpenAI fine-tuning format.
 * Produces a `{ messages: [...] }` object suitable for JSONL upload.
 *
 * Mapping:
 *   user_message   -> { role: "user" }
 *   assistant_message / reasoning -> { role: "assistant" }
 *   tool_call      -> { role: "assistant", tool_calls: [...] }
 *   tool_result    -> { role: "tool", tool_call_id: ... }
 */
export function traceToOpenAIFineTune(trace: ReasoningTrace): object {
  const messages: OpenAIMessage[] = [];

  // System message with trace context
  messages.push({
    role: 'system',
    content: `You are a reasoning assistant. Trace session: ${trace.sessionId}`,
  });

  let toolCallCounter = 0;

  for (const step of trace.steps) {
    switch (step.type) {
      case 'user_message':
        messages.push({ role: 'user', content: step.content });
        break;

      case 'assistant_message':
      case 'reasoning':
        messages.push({ role: 'assistant', content: step.content });
        break;

      case 'tool_call': {
        const callId = `call_${trace.id}_${toolCallCounter++}`;
        messages.push({
          role: 'assistant',
          content: '',
          tool_calls: [
            {
              id: callId,
              type: 'function',
              function: {
                name: step.metadata?.toolName ?? 'unknown',
                arguments: JSON.stringify(step.metadata?.toolArgs ?? {}),
              },
            },
          ],
        });
        break;
      }

      case 'tool_result': {
        // Match back to the most recent tool_call id
        const lastAssistantWithTools = [...messages]
          .reverse()
          .find(m => m.role === 'assistant' && m.tool_calls?.length);
        const matchedCallId =
          lastAssistantWithTools?.tool_calls?.[0]?.id ?? `call_${trace.id}_orphan`;

        messages.push({
          role: 'tool',
          content: step.content,
          tool_call_id: matchedCallId,
        });
        break;
      }
    }
  }

  return { messages };
}

// ─── Anthropic Message Format ───────────────────────────────────────

interface AnthropicContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

/**
 * Converts a ReasoningTrace into Anthropic Messages API format.
 * Produces `{ system, messages: [...] }`.
 *
 * Anthropic requires strict user/assistant alternation, so consecutive
 * same-role messages are merged. Tool use/results follow Anthropic's
 * content-block structure.
 */
export function traceToAnthropicFormat(trace: ReasoningTrace): object {
  const messages: AnthropicMessage[] = [];
  let toolUseCounter = 0;

  for (const step of trace.steps) {
    switch (step.type) {
      case 'user_message':
        pushAnthropicMessage(messages, 'user', step.content);
        break;

      case 'assistant_message':
      case 'reasoning':
        pushAnthropicMessage(messages, 'assistant', step.content);
        break;

      case 'tool_call': {
        const toolUseId = `toolu_${trace.id}_${toolUseCounter++}`;
        const block: AnthropicContentBlock = {
          type: 'tool_use',
          id: toolUseId,
          name: step.metadata?.toolName ?? 'unknown',
          input: (step.metadata?.toolArgs as Record<string, unknown>) ?? {},
        };
        pushAnthropicContentBlock(messages, 'assistant', block);
        break;
      }

      case 'tool_result': {
        // Find the most recent tool_use block to get its id
        const lastToolUseId = findLastToolUseId(messages);
        const block: AnthropicContentBlock = {
          type: 'tool_result',
          tool_use_id: lastToolUseId ?? `toolu_${trace.id}_orphan`,
          content: step.content,
        };
        pushAnthropicContentBlock(messages, 'user', block);
        break;
      }
    }
  }

  return {
    system: `You are a reasoning assistant. Trace session: ${trace.sessionId}`,
    messages,
  };
}

/** Push a text message, merging with the last message if roles match. */
function pushAnthropicMessage(
  messages: AnthropicMessage[],
  role: 'user' | 'assistant',
  text: string,
): void {
  const last = messages[messages.length - 1];
  if (last?.role === role) {
    // Merge: convert to content-block array if not already
    if (typeof last.content === 'string') {
      last.content = [{ type: 'text', text: last.content }];
    }
    (last.content as AnthropicContentBlock[]).push({ type: 'text', text });
  } else {
    messages.push({ role, content: text });
  }
}

/** Push a content block into the last message (if same role) or create a new message. */
function pushAnthropicContentBlock(
  messages: AnthropicMessage[],
  role: 'user' | 'assistant',
  block: AnthropicContentBlock,
): void {
  const last = messages[messages.length - 1];
  if (last?.role === role) {
    if (typeof last.content === 'string') {
      last.content = [{ type: 'text', text: last.content }];
    }
    (last.content as AnthropicContentBlock[]).push(block);
  } else {
    messages.push({ role, content: [block] });
  }
}

/** Walk backwards through messages to find the last tool_use block id. */
function findLastToolUseId(messages: AnthropicMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (Array.isArray(msg.content)) {
      for (let j = msg.content.length - 1; j >= 0; j--) {
        if (msg.content[j].type === 'tool_use') {
          return msg.content[j].id;
        }
      }
    }
  }
  return undefined;
}

// ─── JSONL Export ────────────────────────────────────────────────────

/**
 * Converts an array of traces to JSONL (one JSON object per line).
 * Each line is formatted for the chosen provider's fine-tuning pipeline.
 */
export function tracesToJSONL(
  traces: ReasoningTrace[],
  format: 'openai' | 'anthropic',
): string {
  const converter =
    format === 'openai' ? traceToOpenAIFineTune : traceToAnthropicFormat;

  return traces.map(trace => JSON.stringify(converter(trace))).join('\n');
}

// ─── CSV Export ─────────────────────────────────────────────────────

/**
 * Converts traces to CSV with columns:
 * trace_id, query, tools_used, step_count, latency_ms, summary
 */
export function tracesToCSV(traces: ReasoningTrace[]): string {
  const header = 'trace_id,query,tools_used,step_count,latency_ms,summary';

  const rows = traces.map(trace => {
    const fields = [
      trace.id,
      trace.query,
      trace.toolsUsed.join(';'),
      String(trace.stepCount),
      String(trace.totalLatencyMs),
      trace.summary ?? '',
    ];
    return fields.map(csvEscape).join(',');
  });

  return [header, ...rows].join('\n');
}

/** Escape a CSV field: wrap in quotes if it contains commas, quotes, or newlines. */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

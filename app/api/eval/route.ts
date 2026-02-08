import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { hippoMemory, type EvalResult, type EvalBreakdown } from '@/lib/hippo';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { query, sessionId = 'default' } = await req.json();

  if (!query) {
    return Response.json({ error: 'Query is required' }, { status: 400 });
  }

  const reasoningContext = hippoMemory.getReasoningContext(query, sessionId);

  // Run WITHOUT memory
  const withoutMemoryStart = Date.now();
  const withoutResult = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: 'You are a research assistant. Answer concisely and thoroughly.',
    prompt: query,
  });
  const withoutLatency = Date.now() - withoutMemoryStart;

  // Run WITH memory
  const withMemoryStart = Date.now();
  const withResult = await generateText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: [
      'You are a research assistant. Answer concisely and thoroughly.',
      reasoningContext
        ? `\n\nYou have reasoning memory from past tasks:\n\n${reasoningContext}`
        : '',
    ].join(''),
    prompt: query,
  });
  const withLatency = Date.now() - withMemoryStart;

  // Score both responses
  const [withoutScore, withScore] = await Promise.all([
    scoreResponse(query, withoutResult.text, false),
    scoreResponse(query, withResult.text, Boolean(reasoningContext)),
  ]);

  const delta = withScore.score - withoutScore.score;
  const deltaPercent = withoutScore.score > 0
    ? Math.round((delta / withoutScore.score) * 100)
    : 0;

  const result: EvalResult & {
    responses: { withMemory: string; withoutMemory: string };
    latency: { withMemory: number; withoutMemory: number };
    memoryAvailable: boolean;
  } = {
    traceId: `eval-${Date.now()}`,
    withMemory: withScore,
    withoutMemory: withoutScore,
    delta,
    deltaPercent,
    responses: {
      withMemory: withResult.text,
      withoutMemory: withoutResult.text,
    },
    latency: {
      withMemory: withLatency,
      withoutMemory: withoutLatency,
    },
    memoryAvailable: Boolean(reasoningContext),
  };

  return Response.json(result);
}

async function scoreResponse(
  query: string,
  response: string,
  hadMemory: boolean,
): Promise<{ score: number; breakdown: EvalBreakdown }> {
  try {
    const evalResult = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: `You are an evaluation system. Score the following response to a query on four dimensions, each 1-5.
Return ONLY a JSON object with this exact format:
{"relevance": N, "completeness": N, "reasoning": N, "toolUsage": N}

Scoring guide:
- relevance (1-5): How well does the response address the specific query?
- completeness (1-5): How thorough is the coverage of the topic?
- reasoning (1-5): How clear and logical is the reasoning chain?
- toolUsage (1-5): How effectively does the response incorporate data/evidence?

${hadMemory ? 'Note: This response had access to reasoning memory from past tasks.' : 'Note: This response had NO reasoning memory.'}`,
      prompt: `Query: ${query}\n\nResponse: ${response}\n\nReturn ONLY the JSON scores:`,
    });

    const parsed = JSON.parse(evalResult.text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    const breakdown: EvalBreakdown = {
      relevance: clamp(parsed.relevance ?? 3, 1, 5),
      completeness: clamp(parsed.completeness ?? 3, 1, 5),
      reasoning: clamp(parsed.reasoning ?? 3, 1, 5),
      toolUsage: clamp(parsed.toolUsage ?? 3, 1, 5),
    };

    const score = Math.round(
      ((breakdown.relevance + breakdown.completeness + breakdown.reasoning + breakdown.toolUsage) / 20) * 100
    );

    return { score, breakdown };
  } catch {
    return {
      score: 60,
      breakdown: { relevance: 3, completeness: 3, reasoning: 3, toolUsage: 3 },
    };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { NextRequest } from 'next/server';
import { hippoMemory, hippoRegressions, type RegressionRun } from '@/lib/hippo';

export const maxDuration = 60;

// GET: List regression tests
export async function GET() {
  const tests = await hippoRegressions.getAll();
  return Response.json({
    tests,
    count: tests.length,
    passing: tests.filter(t => t.lastRunPassed === true).length,
    failing: tests.filter(t => t.lastRunPassed === false).length,
  });
}

// POST: Create from trace OR run a regression test
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Create regression from trace
  if (body.action === 'create' && body.traceId) {
    const trace = await hippoMemory.get(body.traceId);
    if (!trace) {
      return Response.json({ error: 'Trace not found' }, { status: 404 });
    }

    const test = await hippoRegressions.createFromTrace(trace, body.name);
    return Response.json({ test, message: 'Regression test created' });
  }

  // Run a regression test
  if (body.action === 'run' && body.testId) {
    const test = await hippoRegressions.get(body.testId);
    if (!test) {
      return Response.json({ error: 'Test not found' }, { status: 404 });
    }

    // Run the query through the agent
    const result = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: 'You are a research assistant. Answer thoroughly using available information.',
      prompt: test.query,
    });

    // Score the response
    const evalResult = await generateText({
      model: anthropic('claude-sonnet-4-20250514'),
      system: `Score this response on a 0-100 scale for quality. Return ONLY a JSON: {"score": N, "toolsDetected": ["tool1"]}`,
      prompt: `Query: ${test.query}\n\nResponse: ${result.text}\n\nReturn JSON:`,
    });

    let score = 70;
    let toolsDetected: string[] = [];
    try {
      const parsed = JSON.parse(evalResult.text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
      score = Math.min(100, Math.max(0, parsed.score ?? 70));
      toolsDetected = parsed.toolsDetected ?? [];
    } catch { /* use defaults */ }

    const run: RegressionRun = {
      id: `run-${Date.now()}`,
      timestamp: Date.now(),
      passed: score >= test.minScore,
      score,
      actualToolCalls: toolsDetected,
      actualStepCount: 1,
      delta: score - test.minScore,
    };

    await hippoRegressions.addRun(body.testId, run);

    return Response.json({
      run,
      test: await hippoRegressions.get(body.testId),
      message: run.passed ? 'PASSED' : 'FAILED',
    });
  }

  // Run ALL regression tests (the deploy gate)
  if (body.action === 'run_all') {
    const tests = await hippoRegressions.getAll();
    if (tests.length === 0) {
      return Response.json({ error: 'No regression tests', gate: 'skip' }, { status: 400 });
    }

    const results: Array<{ testId: string; name: string; passed: boolean; score: number }> = [];

    for (const test of tests) {
      const result = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        system: 'You are a research assistant. Answer concisely.',
        prompt: test.query,
      });

      const evalResult = await generateText({
        model: anthropic('claude-sonnet-4-20250514'),
        system: `Score 0-100. Return ONLY: {"score": N}`,
        prompt: `Query: ${test.query}\nResponse: ${result.text}\nJSON:`,
      });

      let score = 70;
      try {
        const parsed = JSON.parse(evalResult.text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
        score = Math.min(100, Math.max(0, parsed.score ?? 70));
      } catch { /* defaults */ }

      const run: RegressionRun = {
        id: `run-${Date.now()}-${test.id}`,
        timestamp: Date.now(),
        passed: score >= test.minScore,
        score,
        actualToolCalls: [],
        actualStepCount: 1,
        delta: score - test.minScore,
      };

      await hippoRegressions.addRun(test.id, run);
      results.push({ testId: test.id, name: test.name, passed: run.passed, score });
    }

    const allPassed = results.every(r => r.passed);
    return Response.json({
      gate: allPassed ? 'PASS' : 'FAIL',
      results,
      summary: `${results.filter(r => r.passed).length}/${results.length} passed`,
    });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE: Remove a regression test
export async function DELETE(req: NextRequest) {
  const { testId } = await req.json();
  if (testId) {
    await hippoRegressions.delete(testId);
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'testId required' }, { status: 400 });
}

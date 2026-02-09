/**
 * GET /api/export — Download reasoning traces as fine-tuning datasets
 *
 * Query params:
 *   format     — "openai_jsonl" | "anthropic_jsonl" | "csv" | "json" (default: "json")
 *   sessionId  — optional filter by session
 */

import { hippoMemory } from '@/lib/hippo';
import { tracesToJSONL, tracesToCSV } from '@/lib/export';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get('format') ?? 'json';
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  // Fetch traces — filtered by session or all
  const traces = sessionId
    ? await hippoMemory.getBySession(sessionId)
    : await hippoMemory.getAll();

  if (traces.length === 0) {
    return Response.json(
      { error: 'No traces found', sessionId: sessionId ?? undefined },
      { status: 404 },
    );
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  switch (format) {
    case 'openai_jsonl': {
      const body = tracesToJSONL(traces, 'openai');
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/jsonl',
          'Content-Disposition': `attachment; filename="hippo-openai-${timestamp}.jsonl"`,
        },
      });
    }

    case 'anthropic_jsonl': {
      const body = tracesToJSONL(traces, 'anthropic');
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/jsonl',
          'Content-Disposition': `attachment; filename="hippo-anthropic-${timestamp}.jsonl"`,
        },
      });
    }

    case 'csv': {
      const body = tracesToCSV(traces);
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="hippo-traces-${timestamp}.csv"`,
        },
      });
    }

    case 'json': {
      const body = JSON.stringify(traces, null, 2);
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="hippo-traces-${timestamp}.json"`,
        },
      });
    }

    default:
      return Response.json(
        {
          error: `Unknown format: "${format}"`,
          supported: ['openai_jsonl', 'anthropic_jsonl', 'csv', 'json'],
        },
        { status: 400 },
      );
  }
}

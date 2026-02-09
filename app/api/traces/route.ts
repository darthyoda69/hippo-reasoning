import { hippoMemory } from '@/lib/hippo';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') ?? 'default';
  const traceId = req.nextUrl.searchParams.get('traceId');

  if (traceId) {
    const trace = await hippoMemory.get(traceId);
    if (!trace) {
      return Response.json({ error: 'Trace not found' }, { status: 404 });
    }
    return Response.json({ trace });
  }

  const traces = await hippoMemory.getBySession(sessionId);
  const stats = await hippoMemory.getStats();

  return Response.json({ traces, stats });
}

export async function DELETE() {
  await hippoMemory.clear();
  return Response.json({ ok: true, message: 'All traces cleared' });
}

import { hippoMemory } from '@/lib/hippo';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId') ?? 'default';
  const traceId = req.nextUrl.searchParams.get('traceId');

  if (traceId) {
    const trace = hippoMemory.get(traceId);
    if (!trace) {
      return Response.json({ error: 'Trace not found' }, { status: 404 });
    }
    return Response.json({ trace });
  }

  const traces = hippoMemory.getBySession(sessionId);
  const stats = hippoMemory.getStats();

  return Response.json({ traces, stats });
}

export async function DELETE(req: NextRequest) {
  hippoMemory.clear();
  return Response.json({ ok: true, message: 'All traces cleared' });
}

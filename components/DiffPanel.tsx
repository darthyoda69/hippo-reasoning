'use client';

import type { ReasoningTrace, TraceStep } from '@/lib/hippo';

interface DiffPanelProps {
  traceA: ReasoningTrace | null;
  traceB: ReasoningTrace | null;
}

type DiffStatus = 'added' | 'removed' | 'changed' | 'equal';

interface DiffRow {
  status: DiffStatus;
  stepA?: TraceStep;
  stepB?: TraceStep;
  index: number;
}

function computeDiff(traceA: ReasoningTrace, traceB: ReasoningTrace): DiffRow[] {
  const rows: DiffRow[] = [];
  const maxLen = Math.max(traceA.steps.length, traceB.steps.length);

  for (let i = 0; i < maxLen; i++) {
    const a = traceA.steps[i];
    const b = traceB.steps[i];

    if (a && b) {
      const sameType = a.type === b.type;
      const sameContent = a.content === b.content;
      const sameTool = a.metadata?.toolName === b.metadata?.toolName;
      rows.push({
        status: sameType && sameContent && sameTool ? 'equal' : 'changed',
        stepA: a,
        stepB: b,
        index: i,
      });
    } else if (a && !b) {
      rows.push({ status: 'removed', stepA: a, index: i });
    } else if (!a && b) {
      rows.push({ status: 'added', stepB: b, index: i });
    }
  }

  return rows;
}

const statusLabel: Record<DiffStatus, string> = {
  added: '[+]',
  removed: '[-]',
  changed: '[~]',
  equal: '[=]',
};

const statusColor: Record<DiffStatus, string> = {
  added: '#00ff41',
  removed: '#ff0040',
  changed: '#0abdc6',
  equal: '#404040',
};

const typeLabel = (type: TraceStep['type']): string => {
  switch (type) {
    case 'user_message': return 'user';
    case 'assistant_message': return 'agent';
    case 'tool_call': return 'call';
    case 'tool_result': return 'result';
    case 'reasoning': return 'reason';
  }
};

export function DiffPanel({ traceA, traceB }: DiffPanelProps) {
  if (!traceA && !traceB) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8 font-mono"
        style={{ background: '#000', color: '#404040' }}
      >
        <div className="text-center">
          <div style={{ color: '#00ff41' }} className="text-sm mb-4">
            $ hippo diff
          </div>
          <div className="text-sm mb-2">no traces selected</div>
          <div className="text-xs">select 2 traces from the memory tab to compare</div>
        </div>
      </div>
    );
  }

  if (!traceA || !traceB) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center p-8 font-mono"
        style={{ background: '#000', color: '#404040' }}
      >
        <div className="text-center">
          <div style={{ color: '#0abdc6' }} className="text-sm mb-2">
            1 trace selected — select 1 more
          </div>
          <div className="text-xs">go to memory tab and select another trace</div>
        </div>
      </div>
    );
  }

  const diffRows = computeDiff(traceA, traceB);
  const stats = {
    equal: diffRows.filter(r => r.status === 'equal').length,
    changed: diffRows.filter(r => r.status === 'changed').length,
    added: diffRows.filter(r => r.status === 'added').length,
    removed: diffRows.filter(r => r.status === 'removed').length,
  };

  return (
    <div className="h-full overflow-y-auto font-mono" style={{ background: '#000', color: '#b0b0b0' }}>
      {/* Header */}
      <div className="sticky top-0 border-b px-4 py-3" style={{ background: '#000', borderColor: '#1a1a1a' }}>
        <div style={{ color: '#00ff41' }} className="text-sm mb-3">
          $ diff trace-A trace-B
        </div>

        {/* Metadata comparison */}
        <div className="grid grid-cols-3 gap-2 text-[10px] mb-3">
          <div />
          <div style={{ color: '#0abdc6' }} className="text-center font-bold">TRACE A</div>
          <div style={{ color: '#00ff41' }} className="text-center font-bold">TRACE B</div>

          <div style={{ color: '#404040' }}>steps</div>
          <div className="text-center">{traceA.stepCount}</div>
          <div className="text-center" style={{ color: traceA.stepCount !== traceB.stepCount ? '#0abdc6' : undefined }}>
            {traceB.stepCount}
            {traceA.stepCount !== traceB.stepCount && (
              <span style={{ color: traceB.stepCount > traceA.stepCount ? '#00ff41' : '#ff0040' }}>
                {' '}({traceB.stepCount > traceA.stepCount ? '+' : ''}{traceB.stepCount - traceA.stepCount})
              </span>
            )}
          </div>

          <div style={{ color: '#404040' }}>latency</div>
          <div className="text-center">{traceA.totalLatencyMs}ms</div>
          <div className="text-center" style={{ color: traceA.totalLatencyMs !== traceB.totalLatencyMs ? '#0abdc6' : undefined }}>
            {traceB.totalLatencyMs}ms
            {traceA.totalLatencyMs !== traceB.totalLatencyMs && (
              <span style={{ color: traceB.totalLatencyMs < traceA.totalLatencyMs ? '#00ff41' : '#ff0040' }}>
                {' '}({traceB.totalLatencyMs < traceA.totalLatencyMs ? '' : '+'}{traceB.totalLatencyMs - traceA.totalLatencyMs}ms)
              </span>
            )}
          </div>

          <div style={{ color: '#404040' }}>tools</div>
          <div className="text-center">{traceA.toolsUsed.join(', ') || 'none'}</div>
          <div className="text-center">{traceB.toolsUsed.join(', ') || 'none'}</div>
        </div>

        {/* Diff stats */}
        <div className="flex gap-4 text-[10px]">
          <span style={{ color: '#404040' }}>
            [=] {stats.equal}
          </span>
          <span style={{ color: '#0abdc6' }}>
            [~] {stats.changed}
          </span>
          <span style={{ color: '#00ff41' }}>
            [+] {stats.added}
          </span>
          <span style={{ color: '#ff0040' }}>
            [-] {stats.removed}
          </span>
        </div>
      </div>

      {/* Query comparison */}
      <div className="px-4 py-3 border-b" style={{ borderColor: '#1a1a1a' }}>
        <div className="text-[10px] mb-2" style={{ color: '#404040' }}>-- query comparison --</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 border" style={{ borderColor: '#1a1a1a' }}>
            <div className="text-[10px] mb-1" style={{ color: '#0abdc6' }}>A:</div>
            <div style={{ color: traceA.query === traceB.query ? '#b0b0b0' : '#0abdc6' }}>
              {traceA.query.length > 80 ? traceA.query.slice(0, 80) + '...' : traceA.query}
            </div>
          </div>
          <div className="p-2 border" style={{ borderColor: '#1a1a1a' }}>
            <div className="text-[10px] mb-1" style={{ color: '#00ff41' }}>B:</div>
            <div style={{ color: traceA.query === traceB.query ? '#b0b0b0' : '#00ff41' }}>
              {traceB.query.length > 80 ? traceB.query.slice(0, 80) + '...' : traceB.query}
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-step diff */}
      <div className="p-4 space-y-0.5">
        <div className="text-[10px] mb-3" style={{ color: '#404040' }}>-- step diff --</div>

        {diffRows.map((row) => (
          <div
            key={row.index}
            className="flex items-start gap-2 text-xs py-1.5 px-2 border-l-2"
            style={{
              borderColor: statusColor[row.status],
              background: row.status === 'equal' ? 'transparent' : 'rgba(255,255,255,0.01)',
            }}
          >
            {/* Status indicator */}
            <span
              className="font-bold min-w-[24px]"
              style={{ color: statusColor[row.status] }}
            >
              {statusLabel[row.status]}
            </span>

            {/* Step index */}
            <span style={{ color: '#404040' }} className="min-w-[16px]">
              {String(row.index).padStart(2, '0')}
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {row.status === 'equal' && row.stepA && (
                <div>
                  <span style={{ color: '#404040' }}>{typeLabel(row.stepA.type)}</span>
                  {row.stepA.metadata?.toolName && (
                    <span style={{ color: '#404040' }}> ({row.stepA.metadata.toolName})</span>
                  )}
                  <span style={{ color: '#404040' }}>
                    {' '}{row.stepA.content.length > 60 ? row.stepA.content.slice(0, 60) + '...' : row.stepA.content}
                  </span>
                </div>
              )}

              {row.status === 'changed' && (
                <div className="space-y-1">
                  {row.stepA && (
                    <div>
                      <span style={{ color: '#0abdc6' }}>A:</span>{' '}
                      <span style={{ color: '#0abdc6' }}>{typeLabel(row.stepA.type)}</span>
                      {row.stepA.metadata?.toolName && (
                        <span style={{ color: '#0abdc6' }}> ({row.stepA.metadata.toolName})</span>
                      )}
                      <span style={{ color: '#b0b0b0' }}>
                        {' '}{row.stepA.content.length > 50 ? row.stepA.content.slice(0, 50) + '...' : row.stepA.content}
                      </span>
                    </div>
                  )}
                  {row.stepB && (
                    <div>
                      <span style={{ color: '#00ff41' }}>B:</span>{' '}
                      <span style={{ color: '#00ff41' }}>{typeLabel(row.stepB.type)}</span>
                      {row.stepB.metadata?.toolName && (
                        <span style={{ color: '#00ff41' }}> ({row.stepB.metadata.toolName})</span>
                      )}
                      <span style={{ color: '#b0b0b0' }}>
                        {' '}{row.stepB.content.length > 50 ? row.stepB.content.slice(0, 50) + '...' : row.stepB.content}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {row.status === 'added' && row.stepB && (
                <div>
                  <span style={{ color: '#00ff41' }}>{typeLabel(row.stepB.type)}</span>
                  {row.stepB.metadata?.toolName && (
                    <span style={{ color: '#00ff41' }}> ({row.stepB.metadata.toolName})</span>
                  )}
                  <span style={{ color: '#b0b0b0' }}>
                    {' '}{row.stepB.content.length > 60 ? row.stepB.content.slice(0, 60) + '...' : row.stepB.content}
                  </span>
                </div>
              )}

              {row.status === 'removed' && row.stepA && (
                <div>
                  <span style={{ color: '#ff0040' }}>{typeLabel(row.stepA.type)}</span>
                  {row.stepA.metadata?.toolName && (
                    <span style={{ color: '#ff0040' }}> ({row.stepA.metadata.toolName})</span>
                  )}
                  <span style={{ color: '#b0b0b0' }}>
                    {' '}{row.stepA.content.length > 60 ? row.stepA.content.slice(0, 60) + '...' : row.stepA.content}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="border-t px-4 py-3" style={{ borderColor: '#1a1a1a' }}>
        <div className="flex gap-4 text-[10px]">
          <span style={{ color: '#404040' }}>[=] identical</span>
          <span style={{ color: '#0abdc6' }}>[~] changed</span>
          <span style={{ color: '#00ff41' }}>[+] added</span>
          <span style={{ color: '#ff0040' }}>[-] removed</span>
        </div>
      </div>
    </div>
  );
}

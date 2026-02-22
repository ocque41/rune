'use client';

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type ScheduleNodeData = {
  label: string;
  cron: string;
  timezone?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export const ScheduleNode = ({ id, data, selected }: NodeProps<any>) => {
  const { openNodeConfig } = useNodeConfig();
  const summary = `${data.cron || 'No cron'} · ${data.timezone || 'UTC'}`;

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Schedule'}
      subtitle="Time-based trigger"
      icon={<Clock size={16} />}
      status={data.status}
      tone="trigger"
      categoryLabel="Trigger"
      summary={summary}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[280px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    >
      <div className="px-3 pb-3 text-[10px] text-white/40">Cron format: min hour day month weekday</div>
    </NodeCardShell>
  );
};

ScheduleNode.displayName = 'ScheduleNode';

'use client';

import React from 'react';
import { NodeProps, Position } from '@xyflow/react';
import { AlertTriangle } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type ErrorHandlerNodeData = {
  label: string;
  description?: string;
  actionType: 'email' | 'slack' | 'webhook';
  config: {
    recipient?: string;
    subject?: string;
    body?: string;
    webhookUrl?: string;
    channel?: string;
    message?: string;
    payload?: string;
  };
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export default function ErrorHandlerNode({ id, data, selected }: NodeProps<any>) {
  const { openNodeConfig } = useNodeConfig();

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Error Handler'}
      subtitle="Failure routing"
      icon={<AlertTriangle size={16} />}
      status={data.status}
      tone="safety"
      categoryLabel="Recovery"
      summary={`Action: ${data.actionType || 'email'}`}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[280px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
}

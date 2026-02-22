'use client';

import React from 'react';
import { Node, NodeProps, Position } from '@xyflow/react';
import { Package } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type BatchProcessNodeData = {
  label: string;
  items?: string;
  workflowId?: string;
  concurrency?: number;
  outputAggregation?: 'array' | 'sum' | 'object' | 'none';
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomBatchNode = Node<BatchProcessNodeData>;

export default function BatchProcessNode({ id, data, selected }: NodeProps<CustomBatchNode>) {
  const { openNodeConfig } = useNodeConfig();

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Batch Process'}
      subtitle="Run sub-workflow per item"
      icon={<Package size={16} />}
      status={data.status}
      summary={`Workflow: ${data.workflowId || 'Not set'} · Concurrency: ${data.concurrency || 1}`}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[300px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
}

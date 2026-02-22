'use client';

import React from 'react';
import { Node, NodeProps, Position } from '@xyflow/react';
import { CheckSquare } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type DataValidationNodeData = {
  label: string;
  schema?: string;
  dataPath?: string;
  onFailure?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomDataValidationNode = Node<DataValidationNodeData>;

export default function DataValidationNode({ id, data, selected }: NodeProps<CustomDataValidationNode>) {
  const { openNodeConfig } = useNodeConfig();

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Data Validation'}
      subtitle="Validate payload against schema"
      icon={<CheckSquare size={16} />}
      status={data.status}
      tone="safety"
      categoryLabel="Guard"
      summary={`Path: ${data.dataPath || 'params'} · Failure: ${data.onFailure || 'failWorkflow'}`}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[300px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
}

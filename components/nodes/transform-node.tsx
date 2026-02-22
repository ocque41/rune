'use client';

import React from 'react';
import { Position, NodeProps } from '@xyflow/react';
import { Code } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type TransformNodeData = {
  label: string;
  mapping?: string;
  transformType?: 'javascript' | 'jsonata';
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export const TransformNode = ({ id, data, selected }: NodeProps<any>) => {
  const { openNodeConfig } = useNodeConfig();
  const type = data.transformType || 'javascript';

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Transform'}
      subtitle={`${type.toUpperCase()} mapping`}
      icon={<Code size={16} />}
      status={data.status}
      tone="data"
      categoryLabel="Transform"
      summary={data.mapping ? `Expression configured` : 'No transform expression configured'}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[280px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
};

TransformNode.displayName = 'TransformNode';

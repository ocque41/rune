'use client';

import React from 'react';
import { Node, NodeProps, Position } from '@xyflow/react';
import { Code } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type CustomCodeNodeData = {
  label: string;
  language?: 'javascript' | 'python' | 'wasm';
  code?: string;
  entrypoint?: string;
  inputMapping?: string;
  outputMapping?: string;
  timeoutMs?: number;
  dependencies?: string;
  envVars?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomCodeNode = Node<CustomCodeNodeData>;

export default function CustomCodeNode({ id, data, selected }: NodeProps<CustomCodeNode>) {
  const { openNodeConfig } = useNodeConfig();

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Custom Code'}
      subtitle={`${data.language || 'javascript'} · ${data.entrypoint || 'handler'}`}
      icon={<Code size={16} />}
      status={data.status}
      summary={data.code ? `Code configured (${data.code.length} chars)` : 'No code configured'}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[300px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
}

'use client';

import React from 'react';
import { Node, NodeProps, Handle, Position } from '@xyflow/react';
import { Split } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type IfNodeData = {
  label: string;
  condition?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure' | 'skipped';
};

export type CustomIfNode = Node<IfNodeData>;

export default function IfNode({ id, data, selected }: NodeProps<CustomIfNode>) {
  const { openNodeConfig } = useNodeConfig();

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'If / Else'}
      subtitle="Conditional routing"
      icon={<Split size={16} />}
      status={data.status}
      tone="logic"
      categoryLabel="Logic"
      summary={data.condition ? `Condition: ${data.condition}` : 'No condition configured'}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[280px]"
      handles={[{ type: 'target', position: Position.Top }]}
    >
      <div className="relative h-10 border-t border-white/5">
        <div className="absolute left-[25%] top-2 -translate-x-1/2 text-[10px] text-white/75">True</div>
        <div className="absolute left-[75%] top-2 -translate-x-1/2 text-[10px] text-white/55">False</div>
        <Handle type="source" position={Position.Bottom} id="true" style={{ left: '25%' }} className="!bg-[color:var(--text)] !border-2 !border-[color:var(--bg)]" />
        <Handle type="source" position={Position.Bottom} id="false" style={{ left: '75%' }} className="!bg-[color:var(--text)] !border-2 !border-[color:var(--bg)]" />
      </div>
    </NodeCardShell>
  );
}

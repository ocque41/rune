'use client';

import React from 'react';
import { Node, NodeProps, Handle, Position } from '@xyflow/react';
import { Repeat } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type LoopNodeData = {
  label: string;
  items?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomLoopNode = Node<LoopNodeData>;

export default function LoopNode({ id, data, selected }: NodeProps<CustomLoopNode>) {
  const { openNodeConfig } = useNodeConfig();

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Loop'}
      subtitle="Iterate over a collection"
      icon={<Repeat size={16} />}
      status={data.status}
      tone="logic"
      categoryLabel="Logic"
      summary={data.items ? `Items: ${data.items}` : 'No items expression configured'}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[280px]"
      handles={[{ type: 'target', position: Position.Top }]}
    >
      <div className="relative h-10 border-t border-white/5">
        <div className="absolute left-[35%] top-2 -translate-x-1/2 text-[10px] text-blue-300 uppercase tracking-wide">Body</div>
        <div className="absolute left-[70%] top-2 -translate-x-1/2 text-[10px] text-white/50 uppercase tracking-wide">Done</div>
        <Handle type="source" position={Position.Bottom} id="body" style={{ left: '35%' }} className="!bg-[color:var(--text)] !border-2 !border-[color:var(--bg)]" />
        <Handle type="source" position={Position.Bottom} id="done" style={{ left: '70%' }} className="!bg-[color:var(--text)] !border-2 !border-[color:var(--bg)]" />
      </div>
    </NodeCardShell>
  );
}

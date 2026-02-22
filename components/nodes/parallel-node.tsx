'use client';

import React from 'react';
import { Node, NodeProps, Handle, Position } from '@xyflow/react';
import { GitMerge } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type ParallelNodeData = {
  label: string;
  branches?: number;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomParallelNode = Node<ParallelNodeData>;

const ParallelNode = ({ id, data, selected }: NodeProps<CustomParallelNode>) => {
  const { openNodeConfig } = useNodeConfig();
  const branches = Math.max(2, Math.min(10, Number(data.branches ?? 2)));

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Parallel Execution'}
      subtitle="Run branches concurrently"
      icon={<GitMerge size={16} className="rotate-90" />}
      status={data.status}
      summary={`Branches: ${branches}`}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[280px]"
      handles={[{ type: 'target', position: Position.Top }]}
    >
      <div className="relative h-16 border-t border-white/5">
        {Array.from({ length: branches }).map((_, index) => {
          const leftPos = ((index + 1) / (branches + 1)) * 100;
          return (
            <div key={index} className="absolute -bottom-2 flex flex-col items-center" style={{ left: `${leftPos}%`, transform: 'translateX(-50%)' }}>
              <span className="mb-1 text-[9px] font-medium opacity-60">B{index + 1}</span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={`branch-${index}`}
                className="!h-2.5 !w-2.5 !bg-[color:var(--text)] !border-2 !border-[color:var(--bg)]"
                style={{ position: 'static' }}
              />
            </div>
          );
        })}
      </div>
      <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center">
        <div className="mb-1 h-4 w-[1px] bg-white/20" />
        <span className="mb-1 text-[10px] font-medium text-[color:var(--subtitle)]">Merge</span>
        <Handle
          type="source"
          position={Position.Bottom}
          id="merge"
          className="!h-3 !w-3 !bg-[color:var(--text)] !border-2 !border-[color:var(--bg)]"
          style={{ position: 'static' }}
        />
      </div>
    </NodeCardShell>
  );
};

export default ParallelNode;

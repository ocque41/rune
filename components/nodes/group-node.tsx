'use client';

import React from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Group, ChevronDown, ChevronRight } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type GroupNodeData = {
  label: string;
  isCollapsed?: boolean;
  originalWidth?: number;
  originalHeight?: number;
  onToggleCollapse?: (nodeId: string, isCollapsed: boolean) => void;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomGroupNode = Node<GroupNodeData>;

export default function GroupNode({ id, data, selected }: NodeProps<CustomGroupNode>) {
  const { openNodeConfig } = useNodeConfig();
  const isCollapsed = Boolean(data.isCollapsed);

  const handleToggleCollapse = () => {
    data.onToggleCollapse?.(id, !isCollapsed);
  };

  return (
    <div
      style={{
        width: isCollapsed ? 260 : data.originalWidth,
        height: isCollapsed ? 72 : data.originalHeight,
      }}
    >
      <NodeCardShell
        selected={selected}
        title={data.label || 'Group'}
        subtitle={isCollapsed ? 'Collapsed group' : 'Expanded group'}
        icon={<Group size={16} />}
        status={data.status}
        summary={isCollapsed ? 'Click chevron to expand group nodes.' : 'Use group to organize related steps.'}
        onOpenSettings={() => openNodeConfig(id)}
        className="min-w-[280px]"
      >
        <div className="px-3 pb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/70 hover:bg-white/5"
            aria-label={isCollapsed ? 'Expand group' : 'Collapse group'}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            {isCollapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
        {!isCollapsed ? (
          <>
            <Handle type="target" position={Position.Top} className="!bg-[color:var(--text)] !border-2 !border-[color:var(--bg)]" />
            <Handle type="source" position={Position.Bottom} className="!bg-[color:var(--text)] !border-2 !border-[color:var(--bg)]" />
          </>
        ) : null}
      </NodeCardShell>
    </div>
  );
}

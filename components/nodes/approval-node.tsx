'use client';

import React from 'react';
import { Node, NodeProps, Position } from '@xyflow/react';
import { UserCheck } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type ApprovalNodeData = {
  label: string;
  approverEmail?: string;
  timeout?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure' | 'waiting';
};

export type CustomApprovalNode = Node<ApprovalNodeData>;

export const ApprovalNode = ({ id, data, selected }: NodeProps<CustomApprovalNode>) => {
  const { openNodeConfig } = useNodeConfig();

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Approval'}
      subtitle="Human-in-the-loop gate"
      icon={<UserCheck size={16} />}
      status={data.status}
      summary={`Approver: ${data.approverEmail || 'Not set'}${data.timeout ? ` · Timeout: ${data.timeout}` : ''}`}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[280px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
};

ApprovalNode.displayName = 'ApprovalNode';

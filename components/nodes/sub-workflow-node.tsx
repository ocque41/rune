'use client';

import React from 'react';
import { Node, NodeProps, Position } from '@xyflow/react';
import { Workflow } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type SubWorkflowNodeData = {
  label: string;
  workflowId?: string;
  params?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomSubWorkflowNode = Node<SubWorkflowNodeData>;

const SubWorkflowNode = ({ id, data, selected }: NodeProps<CustomSubWorkflowNode>) => {
  const { openNodeConfig } = useNodeConfig();
  const summary = data.workflowId
    ? `Workflow: ${data.workflowId}`
    : 'No target workflow configured';

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Sub-Workflow'}
      subtitle="Invoke another workflow"
      icon={<Workflow size={16} />}
      status={data.status}
      tone="data"
      categoryLabel="Orchestration"
      summary={summary}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[280px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
};

export default SubWorkflowNode;

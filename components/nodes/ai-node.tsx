'use client';

import React from 'react';
import { Position, NodeProps } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type AINodeData = {
  label: string;
  prompt?: string;
  model?: string;
  thinkingLevel?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export const AINode = ({ id, data, selected }: NodeProps<any>) => {
  const { openNodeConfig } = useNodeConfig();

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'AI Generation'}
      subtitle={data.model || 'Model not selected'}
      icon={<Sparkles size={16} />}
      status={data.status}
      tone="ai"
      categoryLabel="AI"
      summary={data.prompt ? `Prompt configured (${String(data.prompt).length} chars)` : 'Prompt not configured'}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[300px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
};

AINode.displayName = 'AINode';

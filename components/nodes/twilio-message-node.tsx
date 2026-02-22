'use client';

import React from 'react';
import { Node, NodeProps, Position } from '@xyflow/react';
import { MessageSquareText } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type TwilioMessageNodeData = {
  label: string;
  fromPhoneNumber?: string;
  toPhoneNumber?: string;
  messageBody?: string;
  accountSidSecretName?: string;
  authTokenSecretName?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomTwilioNode = Node<TwilioMessageNodeData>;

export default function TwilioMessageNode({ id, data, selected }: NodeProps<CustomTwilioNode>) {
  const { openNodeConfig } = useNodeConfig();
  const summary = `${data.fromPhoneNumber || 'from'} → ${data.toPhoneNumber || 'to'}`;

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Send SMS (Twilio)'}
      subtitle="Twilio message"
      icon={<MessageSquareText size={16} />}
      status={data.status}
      summary={summary}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[300px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
}

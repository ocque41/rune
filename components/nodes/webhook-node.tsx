'use client';

import React from 'react';
import { Node, NodeProps, Position } from '@xyflow/react';
import { Globe, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type WebhookNodeData = {
  label: string;
  description?: string;
  webhookUrl?: string;
  method?: 'POST' | 'GET' | 'PUT';
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomNode = Node<WebhookNodeData>;

export default function WebhookNode({ id, data, selected }: NodeProps<CustomNode>) {
  const { openNodeConfig } = useNodeConfig();
  const [copied, setCopied] = React.useState(false);

  const webhookUrl = data.webhookUrl || `https://api.cumulus.dev/v1/webhooks/${id}`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success('Webhook URL copied to clipboard');
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Webhook Trigger'}
      subtitle={`Method: ${data.method || 'POST'}`}
      icon={<Globe size={16} />}
      status={data.status}
      tone="trigger"
      categoryLabel="Trigger"
      summary={webhookUrl}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[320px]"
      handles={[{ type: 'source', position: Position.Bottom }]}
    >
      <div className="px-3 pb-3 flex justify-end">
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/70 hover:bg-white/5"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy URL'}
        </button>
      </div>
    </NodeCardShell>
  );
}

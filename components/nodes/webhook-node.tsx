'use client';

import React, { memo } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { Globe, Copy, Check } from 'lucide-react';
import { NodeWrapper } from './node-wrapper';
import { toast } from 'sonner';

export type WebhookNodeData = {
    label: string;
    description?: string;
    webhookUrl?: string;
    method?: 'POST' | 'GET' | 'PUT';
};

export type CustomNode = Node<WebhookNodeData>;

export default memo(function WebhookNode({ data, selected }: NodeProps<CustomNode>) {
    const [copied, setCopied] = React.useState(false);

    // Mock URL if not provided - using a placeholder for now
    const webhookUrl = data.webhookUrl || `https://api.cumulus.dev/v1/webhooks/${crypto.randomUUID().split('-')[0]}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        toast.success('Webhook URL copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <NodeWrapper
            selected={selected}
            handles={[
                { type: 'source', position: Position.Bottom }
            ]}
            className="min-w-[300px]"
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        <Globe size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        {data.label || 'Webhook Trigger'}
                    </span>
                </div>
                <div className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20">
                    {data.method || 'POST'}
                </div>
            </div>

            <div className="p-4 space-y-4">
                {data.description && (
                    <p className="text-xs text-white/50 leading-relaxed font-medium">
                        {data.description}
                    </p>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">
                        Webhook URL
                    </label>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1 group">
                            <input
                                type="text"
                                readOnly
                                value={webhookUrl}
                                className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs font-mono text-white/70 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors pr-8 cursor-text"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none bg-gradient-to-l from-[#222222] via-[#222222] to-transparent pl-4"></div>
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#222222] text-white/40 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
                            title="Copy URL"
                        >
                            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                    <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/5 border border-yellow-500/10">
                        <div className="mt-0.5 text-yellow-500/60">
                            <Globe size={12} />
                        </div>
                        <p className="text-[10px] text-white/40 leading-relaxed">
                            This workflow will start when a request is sent to this URL. The payload will be available in the workflow context.
                        </p>
                    </div>
                </div>
            </div>
        </NodeWrapper>
    );
});

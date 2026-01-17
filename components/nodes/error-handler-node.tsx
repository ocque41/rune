'use client';

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { AlertTriangle, Settings, X, Mail, MessageSquare, Globe } from 'lucide-react';
import { NodeWrapper } from './node-wrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
// import { useLocalWorkflowSession } from '@/hooks/useLocalWorkflowSession'; // Removed invalid import

export type ErrorHandlerNodeData = {
    label: string;
    description?: string;
    actionType: 'email' | 'slack' | 'webhook';
    config: {
        recipient?: string;
        subject?: string;
        body?: string;
        webhookUrl?: string; // For slack or generic webhook
        channel?: string; // For slack
        message?: string; // For slack
        payload?: string; // For webhook
    };
};

export default memo(function ErrorHandlerNode({ data, id, selected }: NodeProps<any>) {
    const { setNodes } = useReactFlow();

    // Helper to update node data
    const updateNodeData = useCallback((nodeId: string, newData: any) => {
        setNodes((nodes) => nodes.map((n) => {
            if (n.id === nodeId) {
                return { ...n, data: { ...n.data, ...newData } };
            }
            return n;
        }));
    }, [setNodes]);

    const [showConfig, setShowConfig] = useState(false);
    const [actionType, setActionType] = useState<ErrorHandlerNodeData['actionType']>(data.actionType || 'email');
    const [config, setConfig] = useState<ErrorHandlerNodeData['config']>(data.config || {
        recipient: 'support@cumulus.app',
        subject: 'Workflow Error Alert',
        body: 'An error occurred in workflow {{workflow.name}} at node {{error.nodeId}}.',
        webhookUrl: '',
        channel: '#alerts',
        message: 'Error in workflow {{workflow.name}}: {{error.message}}',
        payload: '{}'
    });

    const handleSave = () => {
        updateNodeData(id, {
            ...data,
            actionType,
            config
        });
        setShowConfig(false);
    };

    return (
        <div className="relative group">
            <NodeWrapper
                selected={selected}
                className="border-red-500/50 bg-red-500/5 min-w-[200px]"
            >
                {/* Custom Header rendered as child since NodeWrapper doesn't support title/icon props */}
                <div className="flex items-center justify-between border-b border-red-500/20 px-4 py-3 bg-red-500/10 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500 ring-1 ring-red-500/20">
                            <AlertTriangle size={16} />
                        </div>
                        <span className="text-sm font-semibold text-white/90 tracking-wide">
                            {data.label || 'Error Handler'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2 p-3">
                    <div className="text-xs text-muted-foreground line-clamp-2">
                        {data.description || `Handle errors via ${actionType}`}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs border-red-500/20 hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => setShowConfig(!showConfig)}
                    >
                        <Settings className="w-3 h-3 mr-1.5" />
                        Configure
                    </Button>
                </div>

                {/* Handles */}
                <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3 !border-2 !border-[#000000]" />
                <Handle type="source" position={Position.Bottom} className="!bg-red-500 !w-3 !h-3 !border-2 !border-[#000000]" />
            </NodeWrapper>

            {/* Configuration Panel - Simplified for this node */}
            {showConfig && (
                <div className="absolute top-0 left-[calc(100%+12px)] w-[300px] bg-[#0A0A0A] border border-white/10 rounded-lg shadow-xl p-4 z-50 animate-in fade-in slide-in-from-left-2">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                            <Settings className="w-4 h-4 text-red-500" />
                            Error Handler Details
                        </h4>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowConfig(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                                value={data.label}
                                onChange={(e) => updateNodeData(id, { label: e.target.value })}
                                className="bg-white/5 border-white/10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Action Type</Label>
                            <Select value={actionType} onValueChange={(v: any) => setActionType(v)}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="email"><div className="flex items-center gap-2"><Mail className="w-4 h-4" /> Send Email</div></SelectItem>
                                    <SelectItem value="slack"><div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Slack Alert</div></SelectItem>
                                    <SelectItem value="webhook"><div className="flex items-center gap-2"><Globe className="w-4 h-4" /> Webhook</div></SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {actionType === 'email' && (
                            <div className="space-y-3 pt-2 border-t border-white/10">
                                <div className="space-y-1">
                                    <Label className="text-xs">Recipient</Label>
                                    <Input value={config.recipient} onChange={(e) => setConfig({ ...config, recipient: e.target.value })} className="bg-white/5 h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Subject</Label>
                                    <Input value={config.subject} onChange={(e) => setConfig({ ...config, subject: e.target.value })} className="bg-white/5 h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Body</Label>
                                    <Textarea value={config.body} onChange={(e) => setConfig({ ...config, body: e.target.value })} className="bg-white/5 text-xs min-h-[60px]" />
                                </div>
                            </div>
                        )}

                        {actionType === 'slack' && (
                            <div className="space-y-3 pt-2 border-t border-white/10">
                                <div className="space-y-1">
                                    <Label className="text-xs">Webhook URL</Label>
                                    <Input value={config.webhookUrl} onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })} className="bg-white/5 h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Channel</Label>
                                    <Input value={config.channel} onChange={(e) => setConfig({ ...config, channel: e.target.value })} className="bg-white/5 h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Message</Label>
                                    <Textarea value={config.message} onChange={(e) => setConfig({ ...config, message: e.target.value })} className="bg-white/5 text-xs min-h-[60px]" />
                                </div>
                            </div>
                        )}

                        {actionType === 'webhook' && (
                            <div className="space-y-3 pt-2 border-t border-white/10">
                                <div className="space-y-1">
                                    <Label className="text-xs">URL</Label>
                                    <Input value={config.webhookUrl} onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })} className="bg-white/5 h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Payload (JSON)</Label>
                                    <Textarea value={config.payload} onChange={(e) => setConfig({ ...config, payload: e.target.value })} className="bg-white/5 text-xs min-h-[60px] font-mono" />
                                </div>
                            </div>
                        )}

                        <Button onClick={handleSave} className="w-full bg-red-600 hover:bg-red-700">Save Changes</Button>
                    </div>
                </div>
            )}
        </div>
    );
});

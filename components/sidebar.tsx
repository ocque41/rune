'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { DragEvent } from 'react';
import { MessageSquare, Mail, Database, Globe, Clock, Code, PauseCircle, Split, Repeat, Lock, GitMerge, Workflow, Info, ChevronDown, UserCheck, Sparkles, Box, Play } from 'lucide-react';

export const Sidebar = ({ hasStartNode }: { hasStartNode: boolean }) => {
    const [showSecrets, setShowSecrets] = useState(false);
    const [secrets, setSecrets] = useState<string[]>([]);
    const [secretsLoading, setSecretsLoading] = useState(true);
    const [secretsError, setSecretsError] = useState<string | null>(null);

    // Fetch available secrets on mount
    useEffect(() => {
        const fetchSecrets = async () => {
            try {
                const response = await fetch('/api/secrets/list');
                const data = await response.json();

                if (data.success) {
                    setSecrets(data.keys);
                } else {
                    setSecretsError(data.error || 'Failed to load secrets');
                }
            } catch (error) {
                console.error('Error fetching secrets:', error);
                setSecretsError('Failed to connect to secrets API');
            } finally {
                setSecretsLoading(false);
            }
        };

        fetchSecrets();
    }, []);

    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/reactflow', nodeType);
            event.dataTransfer.setData('application/reactflow/label', label);
            event.dataTransfer.effectAllowed = 'move';
        }
    };

    const steps = [
        { type: 'step', label: 'Send Email', icon: Mail },
        { type: 'step', label: 'HTTP Request', icon: Globe },
        { type: 'step', label: 'Database Query', icon: Database },
        { type: 'step', label: 'Run Script', icon: Code },
        { type: 'step', label: 'Slack Message', icon: MessageSquare },
        { type: 'step', label: 'Stream', icon: MessageSquare },
    ];

    const controlFlow = [
        // Start Workflow can only be added if one doesn't exist
        { type: 'step', label: 'Start Workflow', icon: Play, disabled: hasStartNode },
        { type: 'webhook', label: 'Webhook', icon: Globe },
        { type: 'schedule', label: 'Schedule', icon: Clock },
        { type: 'step', label: 'Sleep', icon: Clock },
        { type: 'step', label: 'Wait', icon: PauseCircle },
        { type: 'approval', label: 'Approval', icon: UserCheck },
        { type: 'if', label: 'If / Else', icon: Split },
        { type: 'loop', label: 'Loop', icon: Repeat },
        { type: 'parallel', label: 'Parallel', icon: GitMerge },
        { type: 'subWorkflow', label: 'Sub-Workflow', icon: Workflow },
        { type: 'ai', label: 'AI Gen', icon: Sparkles },
        { type: 'transform', label: 'Transform', icon: Code },
    ];

    return (
        <aside
            className="h-full w-48 border-r flex flex-col py-4 px-2 z-20"
            style={{
                backgroundColor: '#131313',
                borderColor: 'rgba(255, 255, 255, 0.1)'
            }}
        >
            {/* Workflow Steps */}
            <div className="flex flex-col gap-1 mb-4">
                <span className="text-[9px] uppercase tracking-wider text-white/30 mb-2 px-1">Steps</span>
                {steps.map((step) => (
                    <SidebarIconButton
                        key={step.label}
                        item={step}
                        onDragStart={onDragStart}
                    />
                ))}
            </div>

            {/* Divider */}
            <div className="w-8 h-px bg-white/10 my-2" />

            {/* Control Flow */}
            <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-wider text-white/30 mb-2 px-1">Flow</span>
                {controlFlow.map((control) => (
                    <SidebarIconButton
                        key={control.label}
                        item={control}
                        onDragStart={onDragStart}
                    />
                ))}
            </div>
        </aside>
    );
};

// Compact button component with label
const SidebarIconButton = ({ item, onDragStart }: { item: any, onDragStart: any }) => {
    const isDisabled = item.disabled;

    return (
        <div
            className={`w-full flex items-center gap-2 px-2 py-1.5 transition-all text-xs font-medium truncate rounded-[5px]
                ${isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-[#222222]/50 text-white/50'
                    : 'cursor-grab active:cursor-grabbing hover:opacity-80 bg-[#222222] text-[#F0EEE9]'
                }`}
            draggable={!isDisabled}
            onDragStart={(e) => !isDisabled && onDragStart(e, item.type, item.label)}
        >
            <item.icon size={14} className="shrink-0" />
            <span>{item.label}</span>
        </div>
    );
};

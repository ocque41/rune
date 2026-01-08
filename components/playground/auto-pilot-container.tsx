import React, { useEffect } from 'react';
import { Playground } from './components/playground';
import { useAgentStore } from './store';
import { Tool } from './tool-selector';

export interface AutoPilotContainerProps {
    onMcpConfigure?: () => void;
    workflowId?: string | null;
}

export function AutoPilotContainer({ onMcpConfigure, workflowId }: AutoPilotContainerProps) {
    const { config, updateConfig } = useAgentStore();

    // Load Profile when workflowId changes
    useEffect(() => {
        if (!workflowId) return;

        const fetchProfile = async () => {
            try {
                const res = await fetch(`/api/rune/agent/${workflowId}`);
                if (res.status === 401) return; // Not auth

                const data = await res.json();
                if (data && !data.error) {
                    updateConfig(data);
                }
            } catch (e) {
                console.error("Failed to load agent profile", e);
            }
        };
        fetchProfile();
    }, [workflowId, updateConfig]);

    // Auto-save when config changes
    useEffect(() => {
        if (!workflowId) return;

        // Debounce save
        const timer = setTimeout(async () => {
            try {
                await fetch(`/api/rune/agent/${workflowId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });
            } catch (e) {
                console.error("Failed to save agent profile", e);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [config, workflowId]);

    return (
        <div className="w-full h-full">
            <Playground />
        </div>
    );
}


import React, { useEffect, useState } from 'react';
import { ShimmeringJunoConfig } from './shimmering-juno-config';
import { ToolSelector, Tool } from './tool-selector';
import { toast } from 'sonner';
import { useAgentStore } from './store';

import { LLMConfig } from '@/lib/types/agent';

export interface AutoPilotContainerProps {
    onMcpConfigure?: () => void;
}

export function AutoPilotContainer({ onMcpConfigure }: AutoPilotContainerProps) {
    const { config, updateConfig } = useAgentStore();
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    // Tool Selection State
    const [toolSelectorOpen, setToolSelectorOpen] = useState(false);
    const [availableTools, setAvailableTools] = useState<Tool[]>([]);

    // Mock fetching models (simulating API call)
    useEffect(() => {
        const fetchModels = async () => {
            setIsLoadingModels(true);
            try {
                // In a real scenario, this would be: await fetch('/api/rune/models');
                await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network delay

                // Determine available models based on context or subscription level
                const models = [
                    'gpt-4-turbo',
                    'claude-3-5-sonnet-20240620',
                    'mistral-large-latest',
                    'gemini-1.5-pro'
                ];
                setAvailableModels(models);
            } catch (error) {
                console.error('Failed to fetch models:', error);
                toast.error('Could not load AI models');
            } finally {
                setIsLoadingModels(false);
            }
        };

        // Mock fetching tools
        const fetchTools = async () => {
            try {
                const response = await fetch('/api/rune/tools');
                if (!response.ok) throw new Error('Failed to fetch tools');
                const tools: Tool[] = await response.json();
                setAvailableTools(tools);
            } catch (error) {
                console.error('Failed to fetch tools:', error);
                toast.error('Could not load tools');
            }
        }

        fetchModels();
        fetchTools();
    }, []);

    const handleRunAnalysis = async () => {
        toast.info("Analyzing workflow...", {
            description: "Agent is processing current graph context."
        });
        // Logic to trigger agent analysis would go here
    };

    const handleToolSelection = (selectedIds: string[]) => {
        updateConfig({ tools: selectedIds });
    };

    return (
        <>
            <ShimmeringJunoConfig
                config={config}
                onChange={updateConfig}
                onMcpConfigure={() => setToolSelectorOpen(true)}
            />

            <ToolSelector
                open={toolSelectorOpen}
                onOpenChange={setToolSelectorOpen}
                availableTools={availableTools}
                selectedTools={config.tools || []}
                onSelectionChange={handleToolSelection}
            />
        </>
    );
}

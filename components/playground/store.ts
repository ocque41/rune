import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLMConfig } from '@/lib/types/agent';

interface AgentState {
    config: LLMConfig;
    setConfig: (config: LLMConfig) => void;
    updateConfig: (updates: Partial<LLMConfig>) => void;
    resetConfig: () => void;
}

const defaultConfig: LLMConfig = {
    model: 'gpt-4-turbo',
    temperature: 0.7,
    systemPrompt: '',
    tools: []
};

export const useAgentStore = create<AgentState>()(
    persist(
        (set) => ({
            config: defaultConfig,
            setConfig: (config) => set({ config }),
            updateConfig: (updates) => set((state) => ({ config: { ...state.config, ...updates } })),
            resetConfig: () => set({ config: defaultConfig }),
        }),
        {
            name: 'rune-agent-storage',
        }
    )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLMConfig } from '@/lib/types/agent';

interface AgentState {
    // --- Workspace Context ---
    workspace: {
        userId: string | null;
        userEmail: string | null;
        plan: string | null;
        activeWorkflowId: string | null;
        activeDraftId: string | null;
        activeRunId: string | null;
        agentSessionId: string | null;
        limits: any;
    };
    recentWorkflows: any[];
    recentRuns: any[];

    // --- LLM Config ---
    config: LLMConfig;

    // --- Actions ---
    // Workspace
    hydrateAccountContext: () => Promise<void>;
    setActiveWorkflow: (workflowId: string, draftId?: string) => void;
    setActiveRun: (runId: string) => void;

    // Config
    setConfig: (config: LLMConfig) => void;
    updateConfig: (updates: Partial<LLMConfig>) => void;
    resetConfig: () => void;
}

const defaultConfig: LLMConfig = {
    model: 'gpt-4-turbo',
    temperature: 0.7,
    systemPrompt: '',
    topP: 0.9,
    maxLength: 256,
    responseFormat: 'text',
    frequencyPenalty: 0,
    presencePenalty: 0,
    tools: []
};

export const useAgentStore = create<AgentState>()(
    persist(
        (set) => ({
            // Initial Workspace State
            workspace: {
                userId: null,
                userEmail: null,
                plan: null,
                activeWorkflowId: null,
                activeDraftId: null,
                activeRunId: null,
                agentSessionId: null,
                limits: {},
            },
            recentWorkflows: [],
            recentRuns: [],

            // Initial Config State
            config: defaultConfig,

            // Workspace Actions
            hydrateAccountContext: async () => {
                try {
                    const res = await fetch('/api/account/context');
                    if (!res.ok) throw new Error('Failed to fetch account context');
                    const data = await res.json();

                    set({
                        workspace: {
                            userId: data.user.id,
                            userEmail: data.user.email,
                            plan: data.user.plan,
                            activeWorkflowId: data.active.workflowId,
                            activeDraftId: data.active.draftId,
                            activeRunId: data.active.runId,
                            agentSessionId: data.active.agentSessionId,
                            limits: data.limits
                        },
                        recentWorkflows: data.workflows,
                        recentRuns: data.recentRuns
                    });
                } catch (error) {
                    console.error('Hydration Error:', error);
                }
            },

            setActiveWorkflow: (workflowId, draftId) => set(state => ({
                workspace: { ...state.workspace, activeWorkflowId: workflowId, activeDraftId: draftId || state.workspace.activeDraftId }
            })),

            setActiveRun: (runId) => set(state => ({
                workspace: { ...state.workspace, activeRunId: runId }
            })),

            // Config Actions
            setConfig: (config) => set({ config }),
            updateConfig: (updates) => set((state) => ({ config: { ...state.config, ...updates } })),
            resetConfig: () => set({ config: defaultConfig }),
        }),
        {
            name: 'rune-agent-storage',
            // Optional: Filter what parts of state strictly persist if needed. 
            // For now, persisting everything is likely fine or we can partial it.
            // partialize: (state) => ({ config: state.config }) // Example if we only wanted to persist config
        }
    )
);

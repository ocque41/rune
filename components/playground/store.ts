import { create } from 'zustand';

interface AgentState {
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

    // Actions
    hydrateAccountContext: () => Promise<void>;
    setActiveWorkflow: (workflowId: string, draftId?: string) => void;
    setActiveRun: (runId: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
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
    }))
}));

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LLMConfig } from '@/lib/types/agent';
export type { LLMConfig };

export interface ChatMessage {
    id?: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCalls?: any;
    approval_status?: 'pending' | 'approved' | 'rejected' | 'auto_approved' | null;
    createdAt?: string;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
}

export interface Chat {
    id: string;
    title: string;
    workflowId?: string;
    isTemporary: boolean;
    createdAt: string;
    updatedAt: string;
    messageCount?: number;
    preview?: string;
}

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

    // --- Chat State ---
    currentChatId: string | null;
    lastActiveChats: Record<string, string>;
    messages: ChatMessage[];
    chats: Chat[];
    isTemporaryChat: boolean;
    isLoadingChats: boolean;

    // --- LLM Config ---
    config: LLMConfig;

    // --- Actions ---
    // Workspace
    hydrateAccountContext: () => Promise<void>;
    setActiveWorkflow: (workflowId: string, draftId?: string) => void;
    setActiveRun: (runId: string) => void;

    // Chat Actions
    setCurrentChat: (chatId: string | null) => void;
    setMessages: (messages: ChatMessage[]) => void;
    addMessage: (message: ChatMessage) => void;
    setChats: (chats: Chat[]) => void;
    setIsTemporaryChat: (isTemporary: boolean) => void;
    setIsLoadingChats: (loading: boolean) => void;
    clearCurrentChat: () => void;

    // Config
    setConfig: (config: LLMConfig) => void;
    updateConfig: (updates: Partial<LLMConfig>) => void;
    resetConfig: () => void;
}

const defaultConfig: LLMConfig = {
    model: 'gemini-1.5-flash',
    provider: 'google',
    temperature: 0.7,
    systemPrompt: '',
    topP: 0.9,
    maxTokens: 2000,
    outputMode: 'text',
    frequencyPenalty: 0,
    presencePenalty: 0,
    tools: [],
    toolExecutionPolicy: 'confirm_high_impact',
    maxToolCalls: 10,
    maxSteps: 20,
    persistHistory: true
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

            // Initial Chat State
            currentChatId: null,
            lastActiveChats: {},
            messages: [],
            chats: [],
            isTemporaryChat: false,
            isLoadingChats: false,

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

            // Chat Actions
            setCurrentChat: (chatId) => set(state => {
                const newMap = { ...state.lastActiveChats };
                const activeWf = state.workspace.activeWorkflowId;
                if (activeWf && chatId) {
                    newMap[activeWf] = chatId;
                }
                return { currentChatId: chatId, lastActiveChats: newMap };
            }),
            setMessages: (messages) => set({ messages }),
            addMessage: (message) => set(state => ({ messages: [...state.messages, message] })),
            setChats: (chats) => set({ chats }),
            setIsTemporaryChat: (isTemporary) => set({ isTemporaryChat: isTemporary }),
            setIsLoadingChats: (loading) => set({ isLoadingChats: loading }),
            clearCurrentChat: () => set(state => {
                // Don't clear the map, just the current view
                return { currentChatId: null, messages: [] };
            }),

            // Config Actions
            setConfig: (config) => set({ config }),
            updateConfig: (updates) => set((state) => ({ config: { ...state.config, ...updates } })),
            resetConfig: () => set({ config: defaultConfig }),
        }),
        {
            name: 'rune-agent-storage',
            partialize: (state) => ({
                config: state.config,
                currentChatId: state.currentChatId,
                isTemporaryChat: state.isTemporaryChat,
                lastActiveChats: state.lastActiveChats, // Persist the map
            })
        }
    )
);

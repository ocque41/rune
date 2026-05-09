import { describe, it, expect, vi } from 'vitest';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase
const mockSupabase = {
    from: vi.fn(() => ({
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => ({ data: {}, error: null })) })) })),
        update: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) })),
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(() => ({ data: {}, error: null })) })) })),
    })),
} as unknown as SupabaseClient;

// Mock GoogleGenerativeAI
const { mockGetGenerativeModel, mockGenerateContent } = vi.hoisted(() => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
        response: { text: () => "Mocked AI Response" }
    });
    const mockGetGenerativeModel = vi.fn(() => ({
        generateContent: mockGenerateContent
    }));
    return { mockGetGenerativeModel, mockGenerateContent };
});

vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn().mockImplementation(function () {
        return { getGenerativeModel: mockGetGenerativeModel };
    })
}));

vi.mock('@/lib/byok', () => ({
    getUserProviderApiKey: vi.fn().mockResolvedValue({ apiKey: 'TEST_KEY', keyRef: 'GOOGLE_API_KEY' }),
    providerFromModel: vi.fn((model: string) => model.startsWith('gemini-') ? 'google' : null),
}));

// Mock run-store functions
vi.mock('@/lib/run-store', () => ({
    saveRun: vi.fn(),
    updateRunStatus: vi.fn(),
    updateStepExecution: vi.fn(),
    setRunWaiting: vi.fn(),
    appendLog: vi.fn(),
}));

vi.mock('@/lib/usage/log', () => ({
    logUsageEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('WorkflowEngine AI Node', () => {
    it('should execute AI Generate node correctly', async () => {
        const startNode = {
            id: 'node_start',
            type: 'step',
            data: { label: 'Start Workflow' },
            position: { x: 0, y: 0 }
        };

        const aiNode = {
            id: 'node_ai_1',
            type: 'custom',
            data: {
                label: 'AI Generate',
                aiConfig: {
                    prompt: 'User data: {{input}}',
                    model: 'gemini-pro'
                }
            },
            position: { x: 100, y: 0 }
        };

        const nodes = [startNode, aiNode];
        const edges = [{ id: 'e1', source: 'node_start', target: 'node_ai_1' }];


        const engine = new WorkflowEngine(
            mockSupabase,
            'wf_1',
            'Test Workflow',
            nodes,
            edges,
            'user_1'
        );

        await engine.run({ name: 'World' });

        // Check if @google/generative-ai was called with the configured model
        expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-pro' });

        // Check if prompt was interpolated
        expect(mockGenerateContent).toHaveBeenCalledWith(expect.stringContaining('User data: {"name":"World"'));
    });
});

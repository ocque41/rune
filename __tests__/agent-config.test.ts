
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEffectiveAgentConfig, saveAgentConfig } from '../app/actions/agent-config';
import { AgentConfig } from '../lib/agent/types';
import { isHighImpactTool } from '../lib/agent/tools-metadata';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';

// Mock Supabase
vi.mock('@cumulus/auth/server', () => ({
    createServerSupabaseClient: vi.fn()
}));

describe('Agent Configuration Integration', () => {
    let mockSupabase: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabase = {
            auth: {
                getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
            },
            from: vi.fn(),
            rpc: vi.fn()
        };
        (createClient as any).mockResolvedValue(mockSupabase);
    });

    it('should load effective, hierarchical configuration', async () => {
        // Mock DB responses - the actual code uses .select('*').eq('user_id', ...)
        // and returns an array of configs to filter client-side
        mockSupabase.from.mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                    data: [
                        { config: { model: 'gemini-pro', temperature: 0.9 }, scope_type: 'workflow', workflow_id: 'test-workflow-id' },
                        { config: { model: 'gpt-4', maxTokens: 4000 }, scope_type: 'user_default' }
                    ],
                    error: null
                })
            })
        });

        const config = await getEffectiveAgentConfig('test-workflow-id');

        // Workflow config (gemini-pro) should override User Default (gpt-4)
        expect(config?.model).toBe('gemini-pro');
        // Workflow config didn't specify maxTokens, so it should inherit or use default
        // (Note: getEffectiveAgentConfig merges heavily)
    });

    it('should correctly identify High Impact tools', () => {
        expect(isHighImpactTool('run_workflow')).toBe(true);
        expect(isHighImpactTool('configure_node')).toBe(true);
        expect(isHighImpactTool('list_workflows')).toBe(false);
    });

    // Note: Testing actual Vercel/Gemini API behavior requires E2E or heavier mocks.
    // Here we verify the logic that *drives* those APIs.
});

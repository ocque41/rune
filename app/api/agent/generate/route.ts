import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface GenerateRequest {
    input: string;
    workflowId?: string | null;
    config: {
        model: string;
        temperature: number;
        systemPrompt: string;
        topP?: number;
        maxLength?: number;
        responseFormat?: 'text' | 'json';
        frequencyPenalty?: number;
        presencePenalty?: number;
    };
}

export async function POST(req: NextRequest) {
    try {
        // Auth check
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json() as GenerateRequest;
        const { input, config, workflowId } = body;

        if (!input || !config?.model) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Determine provider based on model
        const provider = getProvider(config.model);

        if (!provider) {
            return NextResponse.json({
                error: `Unsupported model: ${config.model}`
            }, { status: 400 });
        }

        // Get API key
        const apiKey = getApiKey(provider);

        if (!apiKey) {
            return NextResponse.json({
                error: `API key not configured for ${provider}. Please add ${provider.toUpperCase()}_API_KEY to your environment.`
            }, { status: 500 });
        }

        let workflowContext = '';
        if (workflowId) {
            workflowContext = await buildWorkflowContext(supabase, workflowId, user.id);
            console.log(`[Generate API] WorkflowID: ${workflowId}, Context Length: ${workflowContext.length}`);
            if (workflowContext.length === 0) {
                console.warn('[Generate API] Workflow context is empty despite ID provided');
            }
        } else {
            console.log('[Generate API] No WorkflowID provided');
        }

        // Build messages with workflow context injected
        const messages = [];
        const systemPromptWithContext = workflowContext
            ? `${workflowContext}\n\n## User's Additional Instructions\n${config.systemPrompt || 'None provided.'}`
            : config.systemPrompt;

        console.log('[Generate API] Final System Prompt Length:', systemPromptWithContext?.length || 0);

        if (systemPromptWithContext) {
            messages.push({ role: 'system', content: systemPromptWithContext });
        }
        messages.push({ role: 'user', content: input });

        // Stream response based on provider
        if (provider === 'openai') {
            return await streamOpenAI(apiKey, config, messages);
        } else if (provider === 'anthropic') {
            return await streamAnthropic(apiKey, config, messages);
        }

        return NextResponse.json({ error: 'Provider not implemented' }, { status: 501 });

    } catch (error) {
        console.error('Generate API error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}

async function buildWorkflowContext(supabase: any, workflowId: string, userId: string): Promise<string> {
    try {
        // Fetch workflow
        const { data: workflow, error: workflowError } = await supabase
            .from('rune_workflows')
            .select('name, description, graph_json')
            .eq('id', workflowId)
            .single();

        if (workflowError || !workflow) {
            console.error('[Generate API] Workflow fetch error:', workflowError);
            return '';
        }

        // Parse graph to extract node info
        const graph = workflow.graph_json || {};
        const nodes = (graph.nodes || []) as Array<{
            id: string;
            type: string;
            data?: {
                label?: string;
                stepType?: string;
                description?: string;
                [key: string]: any;
            }
        }>;
        const edges = (graph.edges || []) as Array<{ source: string; target: string }>;

        // Fetch recent runs for history
        const { data: recentRuns } = await supabase
            .from('rune_runs')
            .select('id, status, created_at, completed_at, error_message')
            .eq('workflow_id', workflowId)
            .order('created_at', { ascending: false })
            .limit(10);

        // Fetch stats (simplified via 2 queries for performance vs complex aggregation)
        // 1. Total runs in last 7 days
        const { count: totalRuns } = await supabase
            .from('rune_runs')
            .select('*', { count: 'exact', head: true })
            .eq('workflow_id', workflowId)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        // 2. Completed runs for success rate & timing
        const { data: completedRuns } = await supabase
            .from('rune_runs')
            .select('created_at, completed_at')
            .eq('workflow_id', workflowId)
            .eq('status', 'completed')
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        let successRate = 'N/A';
        let avgDuration = 'N/A';
        const total = totalRuns || 0;

        if (total > 0 && completedRuns) {
            successRate = `${Math.round((completedRuns.length / total) * 100)}%`;

            const durations = completedRuns
                .map((r: any) => {
                    const start = new Date(r.created_at).getTime();
                    const end = new Date(r.completed_at).getTime();
                    return end - start;
                })
                .filter((d: number) => !isNaN(d) && d > 0);

            if (durations.length > 0) {
                const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
                avgDuration = `${(avg / 1000).toFixed(2)}s`;
            }
        }

        // Build context string
        let context = `You are an AI assistant helping with a workflow automation system called Rune.

## Current Workflow: "${workflow.name}"
${workflow.description || 'No description provided.'}

### Analytics (Last 7 Days)
- **Success Rate**: ${successRate}
- **Avg Duration**: ${avgDuration}
- **Total Runs**: ${total}

### Workflow Structure
This workflow has ${nodes.length} nodes and ${edges.length} connections.

**Nodes Configuration:**
${nodes.map((n, i) => {
            let details = '';
            const d = n.data || {};
            // Extract key configuration details based on node type
            if (d.scriptConfig) details = ` - Script: ${d.scriptConfig.code?.substring(0, 50)}...`;
            else if (d.emailConfig) details = ` - Email to: ${d.emailConfig.recipient}, Subject: ${d.emailConfig.subject}`;
            else if (d.httpRequest) details = ` - ${d.httpRequest.method} ${d.httpRequest.url}`;
            else if (d.slackConfig) details = ` - Slack message to webhook`;
            else if (d.condition) details = ` - Condition: ${d.condition}`;

            return `${i + 1}. [${n.type}] **${d.label || n.id}**${d.description ? ` - ${d.description}` : ''}${details}`;
        }).join('\n')}

**Flow Graph:**
${edges.map(e => {
            const sourceNode = nodes.find(n => n.id === e.source);
            const targetNode = nodes.find(n => n.id === e.target);
            return `• ${sourceNode?.data?.label || e.source} → ${targetNode?.data?.label || e.target}`;
        }).join('\n')}
`;

        if (recentRuns && recentRuns.length > 0) {
            context += `
### Recent Run History (Last ${recentRuns.length})
${recentRuns.map((r: any) => {
                const status = r.status || 'unknown';
                const date = new Date(r.created_at).toLocaleString();
                const duration = r.completed_at ? `${((new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / 1000).toFixed(1)}s` : '...';
                return `• [${status.toUpperCase()}] ${date} (${duration})${r.error_message ? ` - Error: ${r.error_message}` : ''}`;
            }).join('\n')}
`;
        } else {
            context += `\n### Run History\nNo runs recorded yet.\n`;
        }

        context += `
### Your Role
Help the user understand, debug, improve, or interact with this workflow. Answer questions about what it does, suggest improvements, explain node behaviors, or help troubleshoot issues.
You have access to the live configuration and run history above. Use it to provide specific, evidence-based answers.
`;

        return context;
    } catch (err) {
        console.error('Failed to build workflow context:', err);
        return '';
    }
}

function getProvider(model: string): 'openai' | 'anthropic' | null {
    if (model.startsWith('gpt-')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('o1-')) return 'openai';
    return null;
}

function getApiKey(provider: 'openai' | 'anthropic'): string | undefined {
    if (provider === 'openai') return process.env.OPENAI_API_KEY;
    if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY;
    return undefined;
}

async function streamOpenAI(apiKey: string, config: any, messages: any[]) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: config.model,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxLength || 1000,
            top_p: config.topP || 1,
            frequency_penalty: config.frequencyPenalty || 0,
            presence_penalty: config.presencePenalty || 0,
            stream: true,
            ...(config.responseFormat === 'json' && { response_format: { type: 'json_object' } })
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'OpenAI API error');
    }

    // Create a TransformStream to convert OpenAI SSE to our format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new TransformStream({
        async transform(chunk, controller) {
            const text = decoder.decode(chunk);
            const lines = text.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    if (data === '[DONE]') {
                        continue;
                    }

                    try {
                        const json = JSON.parse(data);
                        const content = json.choices?.[0]?.delta?.content;

                        if (content) {
                            controller.enqueue(encoder.encode(content));
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    });

    return new NextResponse(response.body?.pipeThrough(stream), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

async function streamAnthropic(apiKey: string, config: any, messages: any[]) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: config.model,
            messages: messages.filter(m => m.role !== 'system'),
            system: config.systemPrompt || undefined,
            max_tokens: config.maxLength || 1000,
            temperature: config.temperature,
            top_p: config.topP || 1,
            stream: true,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'Anthropic API error');
    }

    // Create a TransformStream to convert Anthropic SSE to our format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new TransformStream({
        async transform(chunk, controller) {
            const text = decoder.decode(chunk);
            const lines = text.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);

                    try {
                        const json = JSON.parse(data);

                        if (json.type === 'content_block_delta') {
                            const content = json.delta?.text;
                            if (content) {
                                controller.enqueue(encoder.encode(content));
                            }
                        }
                    } catch (e) {
                        // Skip invalid JSON
                    }
                }
            }
        }
    });

    return new NextResponse(response.body?.pipeThrough(stream), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

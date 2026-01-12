import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAgentContext } from '@/lib/agent-context';

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

        // --- Build Context ---
        let systemPromptWithContext = config.systemPrompt;

        try {
            const contextData = await buildAgentContext(supabase, user.id, workflowId || undefined);

            if (contextData) {
                const contextString = formatContextToString(contextData);
                systemPromptWithContext = `${contextString}\n\n## User's Instructions\n${config.systemPrompt || 'None.'}`;
                console.log(`[Generate API] Context injected. Length: ${contextString.length}`);
            }
        } catch (ctxError) {
            console.error('[Generate API] Failed to build agent context:', ctxError);
            // Fallback to original prompt if context fails
        }

        // Build messages
        const messages = [];
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

function formatContextToString(ctx: any): string {
    let s = `You are an AI assistant helping with the Rune automation platform.\n\n`;

    // User
    s += `## User Context\n`;
    s += `Name: ${ctx.user.name}\nEmail: ${ctx.user.email}\nPlan: ${ctx.user.tier}\n`;

    // Active
    if (ctx.active.workflowId) {
        s += `\n## Active Context\n`;
        s += `Currently working on Workflow ID: ${ctx.active.workflowId}\n`;
        if (ctx.active.nodeId) s += `Selected Node: ${ctx.active.nodeId}\n`;
    }

    // Workflow
    if (ctx.workflow) {
        s += `\n## Workflow: "${ctx.workflow.name}"\n`;
        if (ctx.workflow.description) s += `${ctx.workflow.description}\n`;
        s += `Stats (7d): Success ${ctx.workflow.stats.successRate}, Avg ${ctx.workflow.stats.avgDuration}, Total ${ctx.workflow.stats.totalRuns}\n`;

        s += `\n### Structure\n`;
        s += `Nodes (${ctx.workflow.structure.nodes.length}):\n`;
        ctx.workflow.structure.nodes.forEach((n: any, i: number) => {
            s += `${i + 1}. [${n.type}] ${n.label} (${n.id})${n.description ? ` - ${n.description}` : ''}\n`;
        });
        s += `\nEdges (${ctx.workflow.structure.edges.length}):\n`;
        ctx.workflow.structure.edges.forEach((e: any) => {
            s += `• ${e.source} -> ${e.target}\n`;
        });
    }

    // Recent Workflows
    if (ctx.recentWorkflows && ctx.recentWorkflows.length > 0) {
        s += `\n## Saved Workflows (Recent)\n`;
        ctx.recentWorkflows.forEach((w: any) => {
            s += `• ${w.name} (ID: ${w.id}) - Updated: ${new Date(w.updatedAt).toLocaleDateString()}\n`;
        });
    }

    // Recent Runs
    if (ctx.recentRuns.length > 0) {
        s += `\n## Recent Runs\n`;
        ctx.recentRuns.forEach((r: any) => {
            s += `• [${r.status.toUpperCase()}] ${new Date(r.startedAt).toLocaleString()} (${r.duration}) ${r.error ? `Error: ${r.error}` : ''}\n`;
        });
    }

    return s;
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

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const stream = new TransformStream({
        async transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') continue;
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices?.[0]?.delta?.content;
                        if (content) controller.enqueue(encoder.encode(content));
                    } catch (e) { }
                }
            }
        }
    });

    return new NextResponse(response.body?.pipeThrough(stream), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}

async function streamAnthropic(apiKey: string, config: any, messages: any[]) {
    // ... (same as before)
    const systemMessage = messages.find(m => m.role === 'system');
    const systemPrompt = systemMessage ? systemMessage.content : config.systemPrompt;

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
            system: systemPrompt || undefined,
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

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const stream = new TransformStream({
        async transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6);
                    try {
                        const json = JSON.parse(data);
                        if (json.type === 'content_block_delta') {
                            const content = json.delta?.text;
                            if (content) controller.enqueue(encoder.encode(content));
                        }
                    } catch (e) { }
                }
            }
        }
    });

    return new NextResponse(response.body?.pipeThrough(stream), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}

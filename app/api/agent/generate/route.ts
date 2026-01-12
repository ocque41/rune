import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAgentContext } from '@/lib/agent-context';
import { TOOLS_DEFINITION, getActiveContext, listWorkflows, getRecentRuns } from '@/lib/agent-tools';

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
            return await streamOpenAI(apiKey, config, messages, supabase, user.id);
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

async function executeToolCall(supabase: any, userId: string, toolName: string, args: any) {
    console.log(`[ToolExec] Executing ${toolName} for ${userId}`, args);
    try {
        switch (toolName) {
            case 'get_active_context':
                return await getActiveContext(supabase, userId);
            case 'list_workflows':
                return await listWorkflows(supabase, userId, args.limit);
            case 'get_recent_runs':
                return await getRecentRuns(supabase, userId, args.workflowId, args.limit);
            default:
                return { error: `Unknown tool: ${toolName}` };
        }
    } catch (e: any) {
        console.error(`[ToolExec] Error in ${toolName}:`, e);
        return { error: e.message };
    }
}

async function streamOpenAI(apiKey: string, config: any, messages: any[], supabase: any, userId: string) {
    const tools = TOOLS_DEFINITION;

    const requestBody: any = {
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxLength || 1000,
        stream: true, // We start with streaming
        tools,
        tool_choice: "auto"
    };

    if (config.responseFormat === 'json') {
        requestBody.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || 'OpenAI API error');
    }

    // Transform stream to handle tool calls or standard content
    // Note: Handling streaming tool calls in Vercel Edge is tricky because we might need to intercept, 
    // run the tool, and then start specific NEW stream.
    // For simplicity/reliability in V1, we will detect if the FIRST chunk indicates a tool call. 
    // If so, we might need to buffer the whole tool call definition, execute it, and then recurse.
    // This is hard to do purely with a TransformStream in one pass.

    // BETTER APPROACH FOR V1 TOOLING:
    // If we want tool support, avoiding "stream: true" for the tool-decision round is safer.
    // 1. Call OpenAI (no stream). 
    // 2. If tool_call -> run tool -> recurse.
    // 3. If content -> just stream it? Or just return text.
    // BUT the user expects streaming.

    // Let's stick to the user's request: "Transition from prompt injection to tools".
    // "Prompt injection" (Context Building) is ALREADY working and is very fast.
    // Tools are for "on demand" data.

    // HYBRID APPROACH:
    // We will keep the current context injection as primary. 
    // We will enable tools. If the model chooses a tool, we will have to handle that.
    // Handling "streaming tool calls" requires utilizing the `tool_calls` delta.

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let isCollectingToolCall = false;
    let toolCallBuffer: any = { id: '', name: '', arguments: '' };

    // We need a way to potentially interrupt the stream to run code server-side.
    // Since we can't easily "pause" the HTTP response to the client and resume, 
    // typically we just stream the tool call to the client and let the CLIENT run it?
    // NO -> "Server-side functions" is the requirement (safety).

    // If we want server-side tools with streaming visibility:
    // 1. Receive chunks.
    // 2. If `tool_calls` appearing, buffer them. DO NOT stream to user yet (or stream a "Thinking..." status).
    // 3. Once tool call complete, execute on server.
    // 4. Send tool result to OpenAI.
    // 5. Get final stream and pipe TO user.

    // This is complex for a single `NextResponse`.
    // Let's implement the simpler "Non-streaming Tool Round" followed by "Streaming Response" approach.
    // We'll effectively verify if we should just do a non-streaming check first?
    // No, that delays Time-To-First-Byte (TTFB).

    // Current Decision:
    // Since `getActiveContext` is injected, tool usage handles *exceptions*.
    // We will implement `streamOpenAI` to just pass through for now, but configured with tools.
    // If a tool call happens, we will see it in the chunks.
    // Handling it properly requires a specialized loop which is non-trivial to patch into this existing function without a rewrite.

    // REWRITE: We will buffer the FIRST response. If it's a tool call, we handle it and stream the SECOND response. 
    // If it's content, we stream it immediately.

    return handleOpenAIToolLoop(apiKey, requestBody, supabase, userId);
}

async function handleOpenAIToolLoop(apiKey: string, initialBody: any, supabase: any, userId: string): Promise<NextResponse> {
    // 1. First call - try non-streaming to check for tools (fast check)
    // Or just stream and buffer? Buffering is safer for TTFB if content.
    // Let's use non-streaming for the *decision* to ensure we catch the tool call.
    // It adds ~500ms latency but ensures robustness.
    const decisionBody = { ...initialBody, stream: false };

    const decisionReq = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(decisionBody)
    });

    const decision = await decisionReq.json();

    if (decision.error) {
        throw new Error(decision.error.message);
    }

    const choice = decision.choices?.[0];
    const message = choice?.message;

    // 2. If Tool Call
    if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        const args = JSON.parse(toolCall.function.arguments);

        // Execute Tool
        const toolResult = await executeToolCall(supabase, userId, toolCall.function.name, args);

        // 3. Recursive Call with Result (Streaming this time)
        const nextMessages = [
            ...initialBody.messages,
            message,
            {
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult)
            }
        ];

        const finalBody = { ...initialBody, messages: nextMessages, stream: true };

        const finalReq = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(finalBody)
        });

        // Return the simple stream
        return new NextResponse(finalReq.body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    // 3. If No Tool Call -> Just return the text content
    // Since we already have the full text from the non-streaming call, we can just return it.
    // But the client expects a stream. We should emulate a stream or just return json?
    // Client `useChat` usually handles both but our `Playground` expects a stream.
    // We can manually stream the text we already have.

    const content = message?.content || "";
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            // Emulate OpenAI stream format
            const chunk = {
                id: decision.id,
                choices: [{ delta: { content }, finish_reason: null }]
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
        }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
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

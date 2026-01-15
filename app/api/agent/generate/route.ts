import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAgentContext } from '@/lib/agent-context';
import { TOOLS_DEFINITION, getActiveContext, listWorkflows, getRecentRuns, runWorkflow, runNode, configureNode, scheduleMessage } from '@/lib/agent-tools';

export const runtime = 'nodejs';

interface GenerateRequest {
    input: string;
    workflowId?: string | null;
    chatId?: string | null;
    isTemporary?: boolean;
    config: {
        model: string;
        temperature: number;
        systemPrompt: string;
        topP?: number;
        maxLength?: number;
        responseFormat?: 'text' | 'json';
        frequencyPenalty?: number;
        presencePenalty?: number;
        tools?: string[];
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
        const { input, config, workflowId, chatId, isTemporary } = body;

        if (!input || !config?.model) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // --- Chat Persistence: Get or Create Chat ---
        let activeChatId = chatId;

        if (!activeChatId && !isTemporary) {
            // Create a new chat if none provided and not temporary
            const { data: newChat } = await supabase
                .from('rune_chats')
                .insert({
                    user_id: user.id,
                    workflow_id: workflowId || null,
                    title: input.slice(0, 50) + (input.length > 50 ? '...' : ''),
                    is_temporary: false
                })
                .select('id')
                .single();

            activeChatId = newChat?.id;
        }

        // Save user message to chat (if not temporary)
        if (activeChatId) {
            await supabase.from('rune_chat_messages').insert({
                chat_id: activeChatId,
                role: 'user',
                content: input
            });
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
            return await streamOpenAI(apiKey, config, messages, supabase, user.id, activeChatId);
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
            case 'run_workflow':
                return await runWorkflow(supabase, userId, args.payload);
            case 'run_node':
                return await runNode(supabase, userId, args.nodeIdentifier, args.input);
            case 'configure_node':
                return await configureNode(supabase, userId, args.nodeIdentifier, args.config);
            case 'schedule_message':
                return await scheduleMessage(supabase, userId, {
                    message: args.message,
                    delayMinutes: args.delayMinutes,
                    priority: args.priority
                });
            default:
                return { error: `Unknown tool: ${toolName}` };
        }
    } catch (e: any) {
        console.error(`[ToolExec] Error in ${toolName}:`, e);
        return { error: e.message };
    }
}

async function streamOpenAI(apiKey: string, config: any, messages: any[], supabase: any, userId: string, chatId?: string | null) {
    // Filter tools based on user config
    const allowedTools = config.tools || [];
    const tools = TOOLS_DEFINITION.filter(t => allowedTools.includes(t.function.name));

    const requestBody: any = {
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxLength || 1000,
        stream: true, // We start with streaming
    };

    // Only add tools if there are any enabled
    if (tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = "auto";
    }

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
    return handleOpenAIToolLoop(apiKey, requestBody, supabase, userId, chatId);
}

// Helper to separate SSE stream parsing from main logic
function createTextStream(upstream: ReadableStream) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    const transformer = new TransformStream({
        async transform(chunk, controller) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                // Parse the native OpenAI format (data: {...}) and extract simple text
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

    return upstream.pipeThrough(transformer);
}

async function handleOpenAIToolLoop(apiKey: string, initialBody: any, supabase: any, userId: string, chatId?: string | null): Promise<NextResponse> {
    const MAX_TOOL_ROUNDS = 10; // Prevent infinite loops
    let currentMessages = [...initialBody.messages];
    let round = 0;

    while (round < MAX_TOOL_ROUNDS) {
        round++;
        console.log(`[OpenAI Tool Loop] Round ${round}`);

        // Make non-streaming call to check for tool calls
        const requestBody = { ...initialBody, messages: currentMessages, stream: false };

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        const choice = data.choices?.[0];
        const message = choice?.message;
        const finishReason = choice?.finish_reason;

        // If no tool calls, return the final response
        if (!message?.tool_calls || message.tool_calls.length === 0 || finishReason === 'stop') {
            console.log(`[OpenAI Tool Loop] Completed after ${round} rounds`);

            const content = message?.content || "";

            // Save assistant response to chat (if not temporary)
            if (chatId && content) {
                await supabase.from('rune_chat_messages').insert({
                    chat_id: chatId,
                    role: 'assistant',
                    content: content
                });
            }

            // Return content as a stream
            const encoder = new TextEncoder();
            const simpleStream = new ReadableStream({
                start(controller) {
                    if (content) controller.enqueue(encoder.encode(content));
                    controller.close();
                }
            });
            return new NextResponse(simpleStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Chat-Id': chatId || '' } });
        }

        // Execute tool calls
        console.log(`[OpenAI Tool Loop] Executing ${message.tool_calls.length} tool(s)`);

        const toolResults = await Promise.all(message.tool_calls.map(async (toolCall: any) => {
            let result;
            try {
                const args = JSON.parse(toolCall.function.arguments);
                result = await executeToolCall(supabase, userId, toolCall.function.name, args);
            } catch (e: any) {
                result = { error: e.message || 'Failed to execute tool' };
            }

            return {
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            };
        }));

        // Add assistant message and tool results to conversation
        currentMessages = [
            ...currentMessages,
            message,
            ...toolResults
        ];
    }

    // If we hit max rounds, return what we have
    console.warn(`[OpenAI Tool Loop] Hit max rounds (${MAX_TOOL_ROUNDS})`);
    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode("I've been working on this for a while. Let me summarize what I've done so far. Please try a simpler request or break this into smaller steps."));
            controller.close();
        }
    });
    return new NextResponse(errorStream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
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

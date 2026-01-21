import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildAgentContext } from '@/lib/agent-context';
import { TOOLS_DEFINITION, getActiveContext, listWorkflows, getRecentRuns, runWorkflow, runNode, configureNode, scheduleMessage, validateNodeConfig, markNodeFailed } from '@/lib/agent-tools';

export const runtime = 'nodejs';

interface GenerateRequest {
    input: string;
    workflowId?: string | null;
    chatId?: string | null;
    isTemporary?: boolean;
    autonomousMode?: boolean;  // Enable auto-continuation
    sessionId?: string;        // Resume from existing session
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
        const { input, config, workflowId, chatId, isTemporary, autonomousMode, sessionId } = body;

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
        const messages: any[] = [];
        if (systemPromptWithContext) {
            messages.push({ role: 'system', content: systemPromptWithContext });
        }

        // Fetch recent chat history if existing chat
        if (activeChatId) {
            const { data: history } = await supabase
                .from('rune_chat_messages')
                .select('role, content')
                .eq('chat_id', activeChatId)
                .order('created_at', { ascending: true })
                .limit(20); // Limit to last 20 messages to preserve context window

            if (history && history.length > 0) {
                // Determine if we should include the current input in the history check
                // If we JUST inserted it above (line 64), it will be returned in this query
                // We need to deduplicate or just append the history carefully.
                // However, line 64 inserts the *current* input.
                // So if we fetch history now, it WILL include the current input at the end.
                // Let's filter it out if it matches, or better yet:
                // We haven't inserted the *assistant* response yet.
                // The history will contain: [Old Msg 1, Old Msg 2, ..., Current User Input]

                // Whatever is in the DB is what we want the agent to see as "past conversation" + "current turn"
                // But typically LLM APIs expect: [System, History..., User Input]
                // If 'history' includes 'User Input' at the end, we shouldn't push 'input' again.
                // Let's check if the last message in history is the current input.

                // Actually, to be safe and avoid race conditions/duplication:
                // We inserted current input at line 64.
                // So 'history' contains the current input as the last item.

                messages.push(...history.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })));

                // If the last message in history IS the current input, we are good.
                // If for some reason it's not (race condition?), we might miss it.
                // But we just awaited the insert, so it should be there.

                // However, strictly speaking, 'messages' array for OpenAI usually follows:
                // [System, ...History] -> and the 'current' message is implicit if it's in history?
                // No, usually we send the whole chain.
                // If history includes the current prompt, we effectively just sent the prompt.
                // Let's verify if 'activeChatId' was just created or existing.

                // If we blindly add history, and history includes current input, 
                // and then we push 'input' again below (original line 110), we duplicate the user prompt.

                // FIX: We will NOT push 'input' explicitly if we fetched history, 
                // relying on the fact that we just inserted it into the DB.
                // BUT: If the insert failed or latency, we might miss it.
                // SAFER STRATEGY: 
                // 1. Fetch history excluding the very last message if it matches input? No.
                // 2. Fetch history *before* inserting current input?
                //    We already inserted it at line 64.

                // Let's rely on the DB. We just inserted it. It should be returned.
                // We will remove the explicit `messages.push({ role: 'user', content: input })` 
                // if we have history that ends with the input.

                // Actually, let's keep it simple: 
                // We will use the history as the source of truth for the conversation.
                // If history is empty (shouldn't be, we just inserted), we fallback to input.
            } else {
                messages.push({ role: 'user', content: input });
            }
        } else {
            messages.push({ role: 'user', content: input });
        }

        // Stream response based on provider
        if (provider === 'openai') {
            return await streamOpenAI(apiKey, config, messages, supabase, user.id, activeChatId, autonomousMode, sessionId, workflowId);
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

        if (ctx.active.completedNodes && ctx.active.completedNodes.length > 0) {
            s += `Completed Nodes: ${ctx.active.completedNodes.join(', ')}\n`;
        }
        if (ctx.active.failedNodes && Object.keys(ctx.active.failedNodes).length > 0) {
            s += `\n⚠️ FAILED NODES (These nodes have failed repeatedly or were marked as broken):\n`;
            Object.entries(ctx.active.failedNodes).forEach(([id, val]: [string, any]) => {
                s += `- Node ${id}: ${val.attempts} attempts. ${val.skipped ? '[SKIPPED]' : ''} Error: ${val.lastError}\n`;
            });
            s += `\nInstructions: try to fix these nodes using 'configure_node'. If unfixable, use 'mark_node_failed' to skip them.\n`;
        }
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
                    priority: args.priority,
                    chatId: undefined, // Only available if we passed it in context, but for now undefined is fine (will be null in DB)
                    workflowId: undefined
                });
            case 'validate_node_config':
                return await validateNodeConfig(args);
            case 'mark_node_failed':
                return await markNodeFailed(supabase, userId, args.nodeIdentifier, args.reason);
            default:
                // Check if it's an MCP tool (prefixed with mcp__)
                if (toolName.startsWith('mcp__')) {
                    return await executeMcpTool(supabase, userId, toolName, args);
                }
                return { error: `Unknown tool: ${toolName}` };
        }
    } catch (e: any) {
        console.error(`[ToolExec] Error in ${toolName}:`, e);
        return { error: e.message };
    }
}

async function executeMcpTool(supabase: any, userId: string, namespacedName: string, args: any) {
    // Format: mcp__SERVER__TOOL
    const parts = namespacedName.split('__');
    if (parts.length < 3) return { error: "Invalid MCP tool name format" };

    // const serverName = parts[1]; // Not strictly needed if we look up by name, but good for verify
    const toolName = parts.slice(2).join('__'); // Rejoin in case tool name had __ (unlikely but safe)

    // In a real implementation, we would call the persistent MCP client here.
    // For now, checks if the tool exists in DB and log execution.
    // TODO: Connect to actual MCP Runtime / Bridge

    const { data: tool } = await supabase
        .from('rune_mcp_tools')
        .select('*')
        .eq('tool_name', toolName)
        // .eq('user_id', userId) // optional depending on RLS
        .single();

    if (!tool) {
        return { error: `MCP tool not found: ${toolName}` };
    }

    console.log(`[MCP] Executing ${toolName} on server... (Simulation)`);
    // Here we would dispatch to the MCP server.
    // Return a mock success for now to ensure the loop works.
    return {
        status: "success",
        output: `Executed ${toolName} successfully. (MCP Integration Pending)`,
        args_received: args
    };
}

async function streamOpenAI(apiKey: string, config: any, messages: any[], supabase: any, userId: string, chatId?: string | null, autonomousMode?: boolean, sessionId?: string, workflowId?: string | null) {
    // Filter tools based on user config
    const allowedTools = config.tools || [];
    const systemTools = TOOLS_DEFINITION.filter(t => allowedTools.includes(t.function.name));

    // Fetch MCP tools if any selected (IDs start with mcp:)
    const mcpToolIds = allowedTools.filter((id: string) => id.startsWith('mcp:'));
    let mcpTools: any[] = [];

    if (mcpToolIds.length > 0) {
        // Parse IDs: mcp:server:tool_name
        const mcpNames = mcpToolIds.map((id: string) => {
            const parts = id.split(':');
            return parts.length >= 3 ? parts[2] : null;
        }).filter(Boolean);

        if (mcpNames.length > 0) {
            const { data: dbTools } = await supabase
                .from('rune_mcp_tools')
                .select('tool_name, description, input_schema, rune_mcp_servers(name)')
                .in('tool_name', mcpNames);

            if (dbTools) {
                mcpTools = dbTools.map((t: any) => ({
                    type: 'function',
                    function: {
                        // Sanitize name for OpenAI: mcp__SERVER__TOOL
                        name: `mcp__${t.rune_mcp_servers.name}__${t.tool_name}`.replace(/[^a-zA-Z0-9_]/g, '_'),
                        description: t.description || `Tool from ${t.rune_mcp_servers.name}`,
                        parameters: t.input_schema || { type: 'object', properties: {} }
                    }
                }));
            }
        }
    }

    const allTools = [...systemTools, ...mcpTools];

    const requestBody: any = {
        model: config.model,
        messages,
        temperature: config.temperature,
        max_tokens: config.maxLength || 1000,
        stream: true, // We start with streaming
    };

    // Only add tools if there are any enabled
    if (allTools.length > 0) {
        requestBody.tools = allTools;
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
    return handleOpenAIToolLoop(apiKey, requestBody, supabase, userId, chatId, autonomousMode, sessionId, workflowId || undefined);
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

async function handleOpenAIToolLoop(
    apiKey: string,
    initialBody: any,
    supabase: any,
    userId: string,
    chatId?: string | null,
    autonomousMode?: boolean,
    sessionId?: string,
    workflowId?: string
): Promise<NextResponse> {
    const MAX_TOOL_ROUNDS = 25;
    const MAX_TOTAL_ROUNDS = 50; // Absolute max for autonomous mode
    let currentMessages = [...initialBody.messages];
    let round = 0;
    let totalRounds = 0;
    let completedNodes: string[] = [];
    let failedNodes: Record<string, { attempts: number; lastError: string }> = {};

    // If resuming from session, load state
    if (sessionId) {
        const { data: session } = await supabase
            .from('rune_agent_sessions')
            .select('*')
            .eq('id', sessionId)
            .single();

        if (session) {
            currentMessages = session.messages_history || currentMessages;
            totalRounds = session.total_rounds || 0;
            completedNodes = session.completed_nodes || [];
            failedNodes = session.failed_nodes || {};
            console.log(`[OpenAI Tool Loop] Resuming session ${sessionId} at round ${totalRounds}`);
        }

        // CONTEXT FIX: Merge new user input if present
        // initialBody.messages contains the latest state triggers (e.g. new User input)
        // while session.messages_history contains the deep agent chain.
        const lastIncoming = initialBody.messages[initialBody.messages.length - 1];
        const lastHistory = currentMessages[currentMessages.length - 1];

        // If the incoming message is a User message and different from history end, append it
        if (lastIncoming && lastIncoming.role === 'user') {
            // Simple deduplication check
            if (!lastHistory || lastHistory.content !== lastIncoming.content) {
                currentMessages.push(lastIncoming);
                console.log('[OpenAI Tool Loop] Appended new user input to resumed context');
            }
        }
    }

    while (round < MAX_TOOL_ROUNDS && totalRounds < MAX_TOTAL_ROUNDS) {
        round++;
        totalRounds++;
        console.log(`[OpenAI Tool Loop] Round ${round} (Total: ${totalRounds})`);

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

        // If no tool calls, task is complete
        if (!message?.tool_calls || message.tool_calls.length === 0 || finishReason === 'stop') {
            console.log(`[OpenAI Tool Loop] Completed after ${totalRounds} total rounds`);

            // Clean up session if exists
            if (sessionId) {
                await supabase.from('rune_agent_sessions').update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                }).eq('id', sessionId);
            }

            const content = message?.content || "";

            if (chatId && content) {
                await supabase.from('rune_chat_messages').insert({
                    chat_id: chatId,
                    role: 'assistant',
                    content: content
                });
            }

            const encoder = new TextEncoder();
            const simpleStream = new ReadableStream({
                start(controller) {
                    if (content) controller.enqueue(encoder.encode(content));
                    controller.close();
                }
            });
            return new NextResponse(simpleStream, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'X-Chat-Id': chatId || '',
                    'X-Session-Complete': 'true'
                }
            });
        }

        // Execute tool calls and track progress
        console.log(`[OpenAI Tool Loop] Executing ${message.tool_calls.length} tool(s)`);

        const toolResults = await Promise.all(message.tool_calls.map(async (toolCall: any) => {
            let result;
            try {
                const args = JSON.parse(toolCall.function.arguments);
                result = await executeToolCall(supabase, userId, toolCall.function.name, args);

                // Track completed nodes
                if (toolCall.function.name === 'run_node' && result?.success) {
                    const nodeId = args.nodeIdentifier;
                    if (nodeId && !completedNodes.includes(nodeId)) {
                        completedNodes.push(nodeId);
                    }
                }
            } catch (e: any) {
                result = { error: e.message || 'Failed to execute tool' };

                // Track failed nodes
                if (toolCall.function.name === 'run_node') {
                    const args = JSON.parse(toolCall.function.arguments);
                    const nodeId = args.nodeIdentifier;
                    if (nodeId) {
                        failedNodes[nodeId] = failedNodes[nodeId] || { attempts: 0, lastError: '' };
                        failedNodes[nodeId].attempts++;
                        failedNodes[nodeId].lastError = e.message;
                    }
                }
            }

            return {
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            };
        }));

        currentMessages = [...currentMessages, message, ...toolResults];
    }

    // Hit max rounds
    console.warn(`[OpenAI Tool Loop] Hit max rounds (${round}/${MAX_TOOL_ROUNDS}, Total: ${totalRounds})`);

    // If autonomous mode, save session and return continuation token
    if (autonomousMode && totalRounds < MAX_TOTAL_ROUNDS) {
        let currentSessionId = sessionId;

        if (!currentSessionId) {
            // Create new session
            const { data: newSession } = await supabase
                .from('rune_agent_sessions')
                .insert({
                    user_id: userId,
                    workflow_id: workflowId || null,
                    chat_id: chatId || null,
                    status: 'paused',
                    total_rounds: totalRounds,
                    completed_nodes: completedNodes,
                    failed_nodes: failedNodes,
                    messages_history: currentMessages
                })
                .select('id')
                .single();
            currentSessionId = newSession?.id;
        } else {
            // Update existing session
            await supabase
                .from('rune_agent_sessions')
                .update({
                    status: 'paused',
                    total_rounds: totalRounds,
                    completed_nodes: completedNodes,
                    failed_nodes: failedNodes,
                    messages_history: currentMessages,
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentSessionId);
        }

        const encoder = new TextEncoder();
        const progressStream = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(`[AUTONOMOUS] Progress: ${completedNodes.length} nodes completed, ${Object.keys(failedNodes).length} failed. Continuing...`));
                controller.close();
            }
        });
        return new NextResponse(progressStream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Session-Id': currentSessionId || '',
                'X-Session-Status': 'paused',
                'X-Completed-Nodes': completedNodes.join(','),
                'X-Total-Rounds': String(totalRounds)
            }
        });
    }

    // Not autonomous or hit absolute max
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

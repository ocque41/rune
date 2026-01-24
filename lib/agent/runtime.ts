import { SupabaseClient } from '@supabase/supabase-js';
import { AgentConfig, AgentMessage, AgentProvider, RuntimeOptions } from './types';
import { executeToolCall, markNodeFailed } from '@/lib/agent-tools';

export class AgentRuntime {
    private provider: AgentProvider;
    private supabase: SupabaseClient;
    private userId: string;

    constructor(provider: AgentProvider, supabase: SupabaseClient, userId: string) {
        this.provider = provider;
        this.supabase = supabase;
        this.userId = userId;
    }

    async run(
        initialMessages: AgentMessage[],
        tools: any[],
        config: AgentConfig,
        options: RuntimeOptions = {}
    ): Promise<ReadableStream> {
        const encoder = new TextEncoder();
        const { maxRounds = 8, autonomousMode = false, sessionId } = options;

        let messages = [...initialMessages];
        let round = 0;
        let isComplete = false;
        let consecutiveFailures = 0;
        let lastErrorSignature = '';
        const MAX_CONSECUTIVE_FAILURES = 3;

        // Capture context to avoid 'this' binding issues in ReadableStream
        const provider = this.provider;
        const supabase = this.supabase;
        const userId = this.userId;

        // Create a ReadableStream to yield chunks to the UI
        return new ReadableStream({
            async start(controller) {
                const emit = (text: string) => controller.enqueue(encoder.encode(text));
                const emitDebug = (text: string) => console.log(`[Runtime] ${text}`);

                try {
                    while (round < maxRounds && !isComplete) {
                        round++;
                        emitDebug(`Round ${round} started`);

                        // 1. Call Provider
                        const response = await provider.generate(messages, tools, config);

                        const { message, finishReason } = response;

                        // Add assistant message to history
                        messages.push(message);

                        // If there's content, stream it
                        if (message.content) {
                            emit(message.content);
                            // Persist message
                            if (options.chatId) {
                                await supabase.from('rune_chat_messages').insert({
                                    chat_id: options.chatId,
                                    role: 'assistant',
                                    content: message.content
                                });
                            }
                        }

                        // 2. Handle Tool Calls
                        if (finishReason === 'tool_calls' && message.toolCalls) {
                            emitDebug(`Executing ${message.toolCalls.length} tool(s)`);

                            // Execute in parallel
                            const results = await Promise.all(message.toolCalls.map(async (call: any) => {
                                let output;
                                try {
                                    output = await executeToolCall(supabase, userId, call.name, call.arguments);
                                } catch (e: any) {
                                    output = { error: e.message };
                                }

                                return {
                                    role: 'tool' as const,
                                    toolResult: {
                                        toolCallId: call.name,
                                        output: JSON.stringify(output)
                                    }
                                };
                            }));

                            // Check for consecutive failures (detect same error repeating)
                            const hasErrors = results.some((r: any) => {
                                const parsed = JSON.parse(r.toolResult.output);
                                return parsed.error || parsed.success === false;
                            });

                            if (hasErrors) {
                                const errorSignature = results
                                    .map((r: any) => JSON.parse(r.toolResult.output).error || '')
                                    .filter(Boolean)
                                    .join('|');

                                if (errorSignature === lastErrorSignature) {
                                    consecutiveFailures++;
                                    emitDebug(`Consecutive failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}`);

                                    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                                        emit(`\n\n[Agent stopped: Same error occurred ${MAX_CONSECUTIVE_FAILURES} times. Please fix the underlying issue and try again.]`);
                                        isComplete = true;
                                    }
                                } else {
                                    lastErrorSignature = errorSignature;
                                    consecutiveFailures = 1;
                                }
                            } else {
                                // Reset on success
                                consecutiveFailures = 0;
                                lastErrorSignature = '';
                            }

                            // Add tool results to history
                            messages.push(...results);

                            // Continue loop
                        } else {
                            // Stop if no tool calls
                            isComplete = true;
                        }

                        // 3. Autonomous Handling
                        if (autonomousMode && !isComplete) {
                            // Logic for autonomous persistence would go here
                        }
                    }

                    controller.close();

                } catch (e: any) {
                    console.error('Runtime Error:', e);
                    emit(`\n[Error: ${e.message}]`);
                    controller.close();
                }
            }
        });
    }
}

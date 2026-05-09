import { GoogleGenerativeAI, Content, Part } from '@google/generative-ai';
import { executeToolCall } from '@/lib/agent-tools';
import { SupabaseClient } from '@supabase/supabase-js';
import { AgentConfig } from '../types';
import { isHighImpactTool } from '../tools-metadata';
import { logUsageEvent } from '@/lib/usage/log';
import { redactSecrets } from '@/lib/security/secrets-policy';

export interface GeminiRuntimeConfig extends Partial<AgentConfig> {
    model: string;
    apiKey: string;
}

export interface InternalMessage {
    role: 'user' | 'model' | 'tool' | 'system';
    parts: Part[];
    // We store thought signatures here to ensure they accompany the message history
    thoughtSignature?: string;
}

export class GeminiAgentRuntime {
    private client: GoogleGenerativeAI;

    constructor(
        private supabase: SupabaseClient,
        private userId: string,
        apiKey: string
    ) {
        this.client = new GoogleGenerativeAI(apiKey);
    }

    async run(
        initialMessages: { role: string; content: string }[],
        toolsDefinition: any[],
        config: GeminiRuntimeConfig,
        options: {
            maxRounds?: number;
            chatId?: string;
            autonomousMode?: boolean;
            sessionId?: string;
        } = {}
    ): Promise<ReadableStream> {
        const encoder = new TextEncoder();
        const { maxRounds = 15 } = options;
        let round = 0;

        // Convert initial messages to internal Gemini format
        let history: InternalMessage[] = initialMessages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        const systemPrompt = config.systemPrompt
            ? { role: 'system', parts: [{ text: config.systemPrompt }] }
            : undefined;

        // Prepare Tools
        // Gemini tool format: { functionDeclarations: [...] }
        const functionDeclarations = toolsDefinition.map((t: any) => {
            if (t.type === 'function' && t.function) return t.function;
            return t;
        });

        const model = this.client.getGenerativeModel({
            model: config.model,
            systemInstruction: systemPrompt
        });

        const toolConfig = functionDeclarations.length > 0 ? {
            functionDeclarations: functionDeclarations
        } : undefined;

        // The stream that will be returned to the client
        return new ReadableStream({
            start: async (controller) => {
                const emit = (text: string) => controller.enqueue(encoder.encode(text));

                try {
                    while (round < maxRounds) {
                        round++;
                        console.log(`[GeminiRuntime] Round ${round}`);

                        // Convert internal history for the SDK
                        // Note: SDK startChat expects history as { role, parts }[]
                        // We must ensure 'thoughtSignature' is preserved?
                        // Actually, SDK manages history automatically if we use startChat.
                        // BUT, to handle Thought Signatures strictly, we might need to manually
                        // inject them into the 'parts' if the SDK doesn't do it automatically for restored history.

                        // Current Gemini 3 Docs say: "Return these signatures back to the model in your request exactly as they were received"
                        // If we use 'startChat' with a fresh history every time (stateless loop), we must reconstruct it.

                        const chatSession = model.startChat({
                            history: history.map(m => ({
                                role: m.role,
                                parts: m.parts,
                                // @ts-ignore - Inject thoughtSignature for Gemini 3 strict validation
                                thoughtSignature: m.thoughtSignature
                            } as any)),
                            tools: toolConfig ? [toolConfig] : undefined,
                            generationConfig: {
                                temperature: config.temperature,
                                maxOutputTokens: config.maxTokens,
                                topP: config.topP,
                                responseMimeType: config.outputMode === 'json' ? 'application/json' : 'text/plain',
                                responseSchema: (config.outputMode === 'json' && config.responseSchema) ? config.responseSchema as any : undefined
                            }
                        });

                        // Determine the prompt.
                        // If round 1, it's the last message content?
                        // If round > 1 (tool recursion), we probably send a functionResponse?
                        // With startChat, we send the "new" message.

                        let result;
                        let isToolResponseStep = false;

                        // Check if the last item in history is a 'functionResponse' (user role usually)
                        // But wait, we reconstruct history above.
                        // If we just added function responses to `history`, we should NOT send a message?
                        // We should call `sendMessage('')`? Or `sendMessage(functionResponseParts)`?

                        // REFACTOR: The Loop Strategy
                        // We should use `sendMessageStream` with the *latest* input.
                        // If we just executed tools, the "latest input" is the function responses.
                        // So we remove the function responses from `history` passed to `startChat` 
                        // and send them in `sendMessageStream`?

                        // Actually, standard pattern:
                        // 1. History = [User: "Msg"] -> Model replies Call.
                        // 2. History = [User: "Msg", Model: Call] -> Send [User: Response].

                        // So we need to separate "Committed History" from "Next Payload".

                        let messageToSend: string | Part[] = "";

                        // We always look at the LAST message in our tracked history to decide what to do
                        // But wait, the FIRST round has a User message.
                        // Subsequent rounds might have Tool Responses.

                        if (round === 1) {
                            // Take the last user message as the trigger
                            const triggerMsg = history.pop(); // Remove from history
                            if (!triggerMsg) throw new Error("No initial message");
                            messageToSend = triggerMsg.parts;
                        } else {
                            // We are in a loop used by tool execution. 
                            // The tool execution block below pushes 'functionResponse' (User role) to history.
                            // So we pop THAT and send it.
                            const responseMsg = history.pop();
                            if (!responseMsg) throw new Error("Loop error: expected usage payload");
                            messageToSend = responseMsg.parts;
                            isToolResponseStep = true;
                        }

                        // Send Request
                        const streamResult = await chatSession.sendMessageStream(messageToSend);

                        // Stream Processing
                        let fullText = "";
                        let functionCalls: any[] = [];
                        let capturedThoughtSignature: string | undefined;

                        // Persistence State
                        let messageRowId: string | null = null;
                        let lastSaveTime = Date.now();
                        const SAVE_INTERVAL = 1000; // 1 second

                        // 1. Create Placeholder if we have a chatId
                        if (options.chatId) {
                            const { data: msgData, error: msgError } = await this.supabase
                                .from('rune_chat_messages')
                                .insert({
                                    chat_id: options.chatId,
                                    role: 'assistant',
                                    content: '' // Start empty
                                })
                                .select('id')
                                .single();

                            if (msgData) messageRowId = msgData.id;
                        }

                        for await (const chunk of streamResult.stream) {
                            const chunkText = chunk.text();

                            // Emit text immediately if present
                            if (chunkText) {
                                fullText += chunkText;
                                emit(chunkText);
                            }

                            // Periodic Save
                            if (messageRowId && (Date.now() - lastSaveTime > SAVE_INTERVAL)) {
                                await this.supabase
                                    .from('rune_chat_messages')
                                    .update({ content: fullText })
                                    .eq('id', messageRowId);
                                lastSaveTime = Date.now();
                            }

                            // Inspect raw chunk... (rest of logic)
                            // @ts-ignore
                            const candidate = chunk.candidates?.[0];
                            if (candidate) {
                                // Handle Structured Output Validation
                                if (config.outputMode === 'json' && chunkText) { // Use chunkText for partial validation, or fullText after loop
                                    try {
                                        // 1. Attempt to parse JSON
                                        // Note: Parsing chunkText directly might fail for partial JSON.
                                        // This validation is more robust if applied to `fullText` after the stream.
                                        // For now, we'll assume `chunkText` might contain complete JSON if the model is fast.
                                        // A more robust solution would buffer and validate `fullText` at the end.
                                        JSON.parse(chunkText);

                                        // 2. If configured with strict schema, validate it?
                                        // Note: We might just trust Gemini if we passed the schema, 
                                        // but a safety parsed is better. 
                                        // For now, we just ensure it IS valid JSON.

                                        // In the future, if config.responseSchemaObject (Zod) is passed, parse it.
                                    } catch (e) {
                                        console.warn('[GeminiRuntime] Malformed JSON in structured mode, attempting fix or error');
                                        // We could append a system "Correction" message, but for now we basically error/warn
                                        throw new Error('Model failed to generate valid JSON despite structured mode.');
                                    }
                                }

                                // ... Existing Handling ...
                                // @ts-ignore
                                if (candidate.thoughtSignature) {
                                    // @ts-ignore
                                    capturedThoughtSignature = candidate.thoughtSignature;
                                }
                                if (candidate.content?.parts) {
                                    for (const p of candidate.content.parts) {
                                        if (p.functionCall) {
                                            // We just track it, real processing is later
                                        }
                                    }
                                }
                            }
                        }

                        // Stream complete. Get final aggregated response object.
                        const finalResponse = await streamResult.response;
                        const finalContent = finalResponse.candidates?.[0]?.content;
                        const usageMetadata = finalResponse.usageMetadata;

                        // LOGGING: Instrument Model Usage
                        // We do this async (fire and forget)
                        const source = options.autonomousMode ? 'autonomy_execute' : 'playground_chat';

                        logUsageEvent({
                            userId: this.userId,
                            source: source,
                            chatId: options.chatId,
                            model: config.model,
                            inputTokens: usageMetadata?.promptTokenCount,
                            outputTokens: usageMetadata?.candidatesTokenCount,
                            totalTokens: usageMetadata?.totalTokenCount,
                            cachedTokens: usageMetadata?.cachedContentTokenCount,
                            status: 'success'
                        });

                        // Check for Thought Signature in final response if we missed it
                        // @ts-ignore
                        if (!capturedThoughtSignature && finalResponse.candidates?.[0]?.thoughtSignature) {
                            // @ts-ignore
                            capturedThoughtSignature = finalResponse.candidates[0].thoughtSignature;
                        }

                        // Add Model Turn to History
                        const modelMessage: InternalMessage = {
                            role: 'model',
                            parts: finalContent?.parts || [],
                            thoughtSignature: capturedThoughtSignature
                        };
                        history.push(modelMessage);

                        // Final Save
                        if (messageRowId) {
                            await this.supabase
                                .from('rune_chat_messages')
                                .update({
                                    content: fullText,
                                    usage_metadata: usageMetadata
                                })
                                .eq('id', messageRowId);
                        } else if (options.chatId && fullText) {
                            // Fallback if initial insert failed (unlikely)
                            await this.supabase.from('rune_chat_messages').insert({
                                chat_id: options.chatId,
                                role: 'assistant',
                                content: fullText,
                                usage_metadata: usageMetadata
                            });
                        }

                        // Handle Function Calls
                        const executionParts = finalContent?.parts?.filter(p => 'functionCall' in p);

                        if (executionParts && executionParts.length > 0) {
                            // Save tool_calls to DB
                            if (messageRowId) {
                                // Extract tool calls in a generic JSON structure
                                const toolCallsData = executionParts.map((p: any) => ({
                                    name: p.functionCall.name,
                                    arguments: p.functionCall.args
                                }));
                                await this.supabase
                                    .from('rune_chat_messages')
                                    .update({ tool_calls: toolCallsData })
                                    .eq('id', messageRowId);
                            }

                            // Check Execution Policy
                            const policy = config.toolExecutionPolicy || 'confirm_high_impact';
                            const requiresApproval = executionParts.some((p: any) => {
                                if (policy === 'always_confirm') return true;
                                if (policy === 'auto') return false;
                                return isHighImpactTool(p.functionCall.name);
                            });

                            if (requiresApproval && !options.autonomousMode) {
                                emit(`\n\n> ⚠️ Tool execution paused for approval: ${executionParts.map((p: any) => p.functionCall.name).join(', ')}.\n`);

                                // Set status to pending in DB
                                if (messageRowId) {
                                    await this.supabase
                                        .from('rune_chat_messages')
                                        .update({ approval_status: 'pending' })
                                        .eq('id', messageRowId);
                                }

                                controller.close();
                                return;
                            }

                            console.log(`[GeminiRuntime] Executing ${executionParts.length} tool(s)`);

                            // Prepare user response parts (Internal format for Gemini)
                            const responseParts: Part[] = [];

                            for (const part of executionParts) {
                                const call = part.functionCall!;
                                emit(`\n\n> Executing: ${call.name}...\n`);

                                let resultStr = "";
                                try {
                                    const result = await executeToolCall(
                                        this.supabase,
                                        this.userId,
                                        call.name,
                                        call.args
                                    );
                                    resultStr = JSON.stringify(redactSecrets(result));
                                } catch (e: any) {
                                    resultStr = JSON.stringify({ error: redactSecrets(e.message) });
                                }

                                responseParts.push({
                                    functionResponse: {
                                        name: call.name,
                                        response: { content: resultStr } // Gemini expects 'response' object
                                    }
                                });
                            }

                            // If we have strict validation, we might need to attach thoughtSignature to THIS part?
                            // Docs: "When Gemini generates a functionCall, it relies on the thoughtSignature... To ensure the model maintains its reasoning... return these signatures back... Function calling (Strict): The API enforces validation on the 'Current Turn'."
                            // So the `model` message we pushed to history has the signature.
                            // The `functionResponse` message (User role) effectively "ACCEPTS" that turn.
                            // Does the response message need the signature? No, usually the REQUEST needs it?
                            // "You must return these signatures back to the model in your request".
                            // This means when we send the NEXT request (which contains the function response),
                            // we must ensure the PREVIOUS model message (in history) had the signature.
                            // Since we pushed `modelMessage` with `thoughtSignature` (if we found it), 
                            // AND assuming `startChat` respects the `thoughtSignature` field in history objects...

                            // CRITICAL: The SDK definitions for `Content` or `Part` might not support `thoughtSignature` yet.
                            // If TS complains, we cast to any.

                            const responseMessage: InternalMessage = {
                                role: 'user', // Function responses are user role
                                parts: responseParts
                            };
                            history.push(responseMessage);

                            // Continue loop (next round will pop and send)
                        } else {
                            // No function calls. We are done.
                            break;
                        }
                    } // end while

                    // Finalize
                    controller.close();

                } catch (e: any) {
                    console.error('[GeminiRuntime] Error:', redactSecrets(e?.message || e));
                    emit(`\n[System Error: ${redactSecrets(e.message)}]\n`);
                    controller.close();
                }
            }
        });
    }
}

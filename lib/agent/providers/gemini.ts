import { GoogleGenerativeAI, Part, Content } from '@google/generative-ai';
import { AgentProvider, AgentMessage, AgentConfig, ProviderResponse } from '../types';

export class GeminiProvider implements AgentProvider {
    private client: GoogleGenerativeAI;

    constructor(apiKey: string) {
        this.client = new GoogleGenerativeAI(apiKey);
    }

    async generate(messages: AgentMessage[], tools: any[], config: AgentConfig): Promise<ProviderResponse> {
        const model = this.client.getGenerativeModel({
            model: config.model,
            systemInstruction: config.systemPrompt
        });

        // 1. Convert Messages to Gemini Format
        const history = this.convertMessages(messages);

        let chatHistory: Content[] = [];
        let lastPart: string | Part[] = "Continue..."; // Fallback

        if (history.length > 0) {
            const lastMsg = history[history.length - 1];
            if (lastMsg.role === 'user') {
                chatHistory = history.slice(0, -1);
                lastPart = lastMsg.parts;
            } else {
                chatHistory = history;
            }
        }

        // 2. Configure Tools
        // Gemini expects tools in a specific format: { function_declarations: [...] }
        // Input `tools` are OpenAI format: { type: 'function', function: { name, description, parameters } }

        const geminiTools = tools.map((t: any) => {
            if (t.type === 'function' && t.function) {
                return t.function;
            }
            return t; // Already raw?
        });

        const toolConfig = geminiTools.length > 0 ? {
            tools: [{ functionDeclarations: geminiTools }]
        } : undefined;

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                temperature: config.temperature,
                topP: config.topP,
                maxOutputTokens: config.maxTokens,
            },
            ...toolConfig
        });

        // 3. Send Message with Retry Logic
        let response;
        let attempt = 0;
        const maxRetries = 3;

        while (attempt < maxRetries) {
            try {
                const result = await chat.sendMessage(lastPart);
                response = result.response;
                break; // Success
            } catch (e: any) {
                const isOverloaded = e.message?.includes('503') || e.message?.includes('Overloaded') || e.status === 503;

                if (isOverloaded && attempt < maxRetries - 1) {
                    attempt++;
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
                    console.warn(`[Gemini] Model overloaded (503). Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // If not 503 or max retries reached, throw
                throw e;
            }
        }

        if (!response) {
            throw new Error('Failed to get response from Gemini after retries');
        }

        // 4. Map Response
        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
            throw new Error('No candidates returned from Gemini');
        }

        const candidate = candidates[0];
        const content = candidate.content;
        const textPart = content.parts.find(p => p.text);
        const functionCalls = content.parts.filter(p => p.functionCall);

        const agentMessage: AgentMessage = {
            role: 'assistant',
            content: textPart?.text || undefined
        };

        if (functionCalls.length > 0) {
            agentMessage.toolCalls = functionCalls.map(fc => ({
                id: fc.functionCall!.name,
                name: fc.functionCall!.name,
                arguments: fc.functionCall!.args as Record<string, any>
            }));

            return {
                message: agentMessage,
                finishReason: 'tool_calls'
            };
        }

        return {
            message: agentMessage,
            finishReason: 'stop'
        };
    }

    private convertMessages(messages: AgentMessage[]): Content[] {
        return messages
            .filter(m => m.role !== 'system') // System prompt handled separately
            .map(m => {
                const parts: Part[] = [];

                if (m.content) {
                    parts.push({ text: m.content });
                }

                if (m.toolCalls) {
                    m.toolCalls.forEach(tc => {
                        parts.push({
                            functionCall: {
                                name: tc.name,
                                args: tc.arguments
                            }
                        });
                    });
                }

                if (m.toolResult) {
                    parts.push({
                        functionResponse: {
                            name: m.toolResult.toolCallId,
                            response: { output: m.toolResult.output }
                        }
                    });
                }

                return {
                    role: m.role === 'tool' ? 'function' : (m.role === 'assistant' ? 'model' : 'user'),
                    parts: parts
                };
            });
    }
}

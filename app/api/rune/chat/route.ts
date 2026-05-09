import { NextRequest, NextResponse } from 'next/server';
import { LLMConfig, Message } from '@/lib/types/agent';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logUsageEvent } from '@/lib/usage/log';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { MissingProviderKeyError, getUserProviderApiKey } from '@/lib/byok';
import { redactSecrets } from '@/lib/security/secrets-policy';

export async function POST(req: NextRequest) {
    const startTs = Date.now();
    let userId = 'anon';

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;

        const body = await req.json();
        const { messages, config = {} as LLMConfig } = body as { messages: Message[], config?: LLMConfig };

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { apiKey } = await getUserProviderApiKey({
            provider: 'google',
            providerKeyRef: config.providerKeyRef,
            userId: user.id,
        });

        const genAI = new GoogleGenerativeAI(apiKey);

        // Map model names if needed, or use directly
        const modelName = config.model || 'gemini-1.5-flash';

        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: config.temperature ?? 0.7,
                maxOutputTokens: config.maxTokens,
            }
        });

        // Convert messages to Gemini format
        // Gemini expects history + last message. history uses 'role': 'user' | 'model'
        // Last message is the prompt.
        // Simple conversion:
        const history = messages.slice(0, -1).map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const lastMessage = messages[messages.length - 1];
        const chat = model.startChat({
            history: history
        });

        const result = await chat.sendMessageStream(lastMessage.content);

        // Stream response
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let fullText = "";
                let finalUsage: any = null;

                try {
                    for await (const chunk of result.stream) {
                        const chunkText = chunk.text();
                        fullText += chunkText;
                        controller.enqueue(encoder.encode(chunkText));

                        // Capture usage if available in the last chunk
                        if (chunk.usageMetadata) {
                            finalUsage = chunk.usageMetadata;
                        }
                    }

                    // Log usage after stream completes
                    await logUsageEvent({
                        userId,
                        source: 'playground_chat',
                        model: modelName,
                        provider: 'google',
                        inputTokens: finalUsage?.promptTokenCount,
                        outputTokens: finalUsage?.candidatesTokenCount,
                        totalTokens: finalUsage?.totalTokenCount,
                        latencyMs: Date.now() - startTs,
                        status: 'success'
                    });

                } catch (err: any) {
                    console.error('Stream Error:', redactSecrets(err?.message || err));
                    controller.error(err);

                    // Log failure
                    await logUsageEvent({
                        userId,
                        source: 'playground_chat',
                        model: modelName,
                        provider: 'google',
                        status: 'error',
                        latencyMs: Date.now() - startTs,
                        errorCode: redactSecrets(err.message)
                    });
                } finally {
                    controller.close();
                }
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error: any) {
        if (error instanceof MissingProviderKeyError) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }
        console.error('Chat API Error:', redactSecrets(error?.message || error));

        // Log top-level failure
        await logUsageEvent({
            userId,
            source: 'playground_chat',
            model: 'unknown',
            provider: 'google',
            status: 'error',
            latencyMs: Date.now() - startTs,
            errorCode: redactSecrets(error.message)
        });

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

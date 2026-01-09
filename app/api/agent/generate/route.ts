import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

interface GenerateRequest {
    input: string;
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
        const { input, config } = body;

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

        // Build messages
        const messages = [];
        if (config.systemPrompt) {
            messages.push({ role: 'system', content: config.systemPrompt });
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

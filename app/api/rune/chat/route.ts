import { NextRequest, NextResponse } from 'next/server';
import { LLMConfig, Message } from '@/lib/types/agent';

// This would typically come from an environment variable
const SIMULATE_DELAY = true;

export async function POST(req: NextRequest) {
    try {
        const { messages, config } = await req.json() as { messages: Message[], config: LLMConfig };

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        // Create a ReadableStream
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                // Simulation: In a real app, you would call OpenAI here with stream: true
                // and forward the chunks.

                const prompt = messages[messages.length - 1].content;
                let responseText = "";

                if (config.model.includes('gpt')) {
                    responseText = `[${config.model}] Received: "${prompt}". \n\nThinking process...\n\nBased on your configuration (Temp: ${config.temperature}), here is a response.`;
                } else if (config.model.includes('claude')) {
                    responseText = `[${config.model}] Hello! I see you sent: "${prompt}". \n\nI am operating with a temperature of ${config.temperature}. How can I assist you further with your workflow?`;
                } else {
                    responseText = `[System] Echo: ${prompt}`;
                }

                // Simulate token streaming
                const tokens = responseText.split(/(?=[\s\S])/); // Split by char but keep delimiters if any

                for (const token of tokens) {
                    if (SIMULATE_DELAY) {
                        // Random delay between 10ms and 50ms to simulate network variance
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 40 + 10));
                    }
                    controller.enqueue(encoder.encode(token));
                }

                controller.close();
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });

    } catch (error) {
        console.error('Chat API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

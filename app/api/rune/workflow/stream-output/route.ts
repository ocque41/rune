
import { NextRequest, NextResponse } from 'next/server';
import { createStreamReadable } from '@/lib/workflow/runtime/streams';

export async function GET(req: NextRequest) {
    const runId = req.nextUrl.searchParams.get('runId');
    if (!runId) {
        return NextResponse.json({ error: 'Missing runId query parameter' }, { status: 400 });
    }

    const source = createStreamReadable(runId);
    if (!source) {
        return NextResponse.json({ error: 'Unable to create run stream' }, { status: 500 });
    }

    const encoder = new TextEncoder();
    const headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
    };

    const readableStream = new ReadableStream<Uint8Array>({
        async start(controller) {
            const reader = source.getReader();
            let buffer = '';
            const keepAliveInterval = setInterval(() => {
                controller.enqueue(encoder.encode(':\n\n'));
            }, 30000);

            const abortHandler = async () => {
                try {
                    await reader.cancel('client disconnected');
                } catch (error) {
                    console.warn('[workflow/stream-output] Failed to cancel reader on abort:', error);
                }
            };

            req.signal.addEventListener('abort', abortHandler);

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (!value) continue;

                    buffer += value;
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const payload = line.trim();
                        if (!payload) continue;
                        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
                    }
                }

                const finalPayload = buffer.trim();
                if (finalPayload) {
                    controller.enqueue(encoder.encode(`data: ${finalPayload}\n\n`));
                }
                controller.close();
            } catch (error) {
                console.error('[workflow/stream-output] Stream error:', error);
                controller.error(error);
            } finally {
                clearInterval(keepAliveInterval);
                req.signal.removeEventListener('abort', abortHandler);
                reader.releaseLock();
            }
        }
    });

    return new NextResponse(readableStream, { headers });
}


import { NextRequest, NextResponse } from 'next/server';
import { getWritable } from '@/lib/workflow-generator';

export async function GET(req: NextRequest) {
  // Set up headers for Server-Sent Events (SSE)
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };

  // Create a ReadableStream for SSE
  const readableStream = new ReadableStream({
    async start(controller) {
      const writable = getWritable();

      // Listen for data from the workflow generator's writable stream
      // and push it to the controller for the SSE stream
      writable.on('data', (chunk: Buffer) => {
        const message = chunk.toString();
        // SSE format: data: [JSON payload]\n\n
        controller.enqueue(`data: ${message}\n\n`);
      });

      // Handle stream end or error
      writable.on('end', () => {
        controller.close();
      });

      writable.on('error', (error: Error) => {
        console.error('Workflow stream error:', error);
        controller.error(error);
      });

      // Optionally, add a keep-alive mechanism to prevent timeouts
      const keepAliveInterval = setInterval(() => {
        controller.enqueue(':\n\n'); // SSE comment to keep connection alive
      }, 30000); // Send a heartbeat every 30 seconds

      // Clean up when the client disconnects
      req.signal.onabort = () => {
        clearInterval(keepAliveInterval);
        writable.destroy(); // Ensure the underlying writable is closed
        console.log('Client disconnected from workflow stream.');
      };
    },
  });

  return new NextResponse(readableStream, { headers });
}

// lib/workflow/runtime/streams.ts

// A map to store the WritableStream and ReadableStream pair for each runId
const runStreams = new Map<string, { writable: WritableStream<string>, readable: ReadableStream<string> }>();

/**
 * Returns a WritableStream for a given runId. If one doesn't exist, it creates a new pair
 * of Writable/Readable streams. This is used by the workflow runtime to push data.
 * @param runId The ID of the workflow run.
 * @returns A WritableStream<string> where the workflow can write its output.
 */
export function getStreamWritable(runId: string): WritableStream<string> {
    if (runStreams.has(runId)) {
        return runStreams.get(runId)!.writable;
    }

    let controller: ReadableStreamDefaultController<string>;
    const readable = new ReadableStream<string>({
        start(c) {
            controller = c;
        },
        cancel() {
            // Stream cancelled by consumer (e.g., client disconnected from SSE)
            console.log(`[StreamManager] ReadableStream cancelled for runId: ${runId}`);
            runStreams.delete(runId); // Clean up both streams when readable is cancelled
        }
    });

    const writable = new WritableStream<string>({
        write(chunk, writeController) {
            if (controller && !controller.desiredSize && controller.desiredSize !== 0) {
                 // Check if the stream is closed or errored
                 // In a real scenario, handle backpressure more robustly
                 console.warn(`[StreamManager] WritableStream for runId ${runId} is writing to a potentially closed or backpressured ReadableStream.`);
            }
            controller.enqueue(chunk);
        },
        close() {
            if (controller) {
                controller.close();
            }
            console.log(`[StreamManager] WritableStream closed for runId: ${runId}`);
            runStreams.delete(runId);
        },
        abort(reason) {
            if (controller) {
                controller.error(reason);
            }
            console.error(`[StreamManager] WritableStream aborted for runId: ${runId}`, reason);
            runStreams.delete(runId);
        }
    });

    runStreams.set(runId, { writable, readable });
    return writable;
}

/**
 * Returns the ReadableStream for a given runId. If a stream pair doesn't exist, it creates one.
 * This is used by the API route to read data to be sent to the client (e.g., via SSE).
 * @param runId The ID of the workflow run.
 * @returns A ReadableStream<string> corresponding to the runId, or undefined if an error occurs.
 */
export function createStreamReadable(runId: string): ReadableStream<string> | undefined {
    // Calling getStreamWritable will ensure the stream pair is created if it doesn't exist
    // and return the writable, but we need the readable.
    // So, we'll ensure creation if it doesn't exist and then return the readable.
    if (!runStreams.has(runId)) {
        // Force creation of the stream pair if only readable is requested first
        getStreamWritable(runId); 
    }
    return runStreams.get(runId)?.readable;
}

// lib/agent/runtimes/gemini.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { findTool } from '../../agent-tools'; // Assuming an agent-tools utility

const MAX_TOOL_CALL_ROUNDS = 5; // Limit to prevent infinite tool call loops

class GeminiAgentRuntime {
  private history: any[];
  private thought_signatures: string[];
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string, modelName: string = 'gemini-pro') { // Default to gemini-pro for now
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
    this.history = [];
    this.thought_signatures = [];
  }

  async run(messages: any[], tools: any[], config: any): Promise<ReadableStream> {
    this.history = messages; // Initialize history with provided messages
    let toolCallRound = 0;
    let finalResponseSent = false;

    // Use a TransformStream to allow injecting tool responses back into the stream
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const processTurn = async () => {
      if (finalResponseSent) return;

      if (toolCallRound > MAX_TOOL_CALL_ROUNDS) {
        writer.write(JSON.stringify({ type: 'error', value: 'Max tool call rounds exceeded.' }));
        writer.close();
        return;
      }

      try {
        const result = await this.model.generateContent({
          contents: this.history,
          tools: tools,
          safetySettings: config.safetySettings,
          generationConfig: config.generationConfig,
        });

        const stream = result.response; // Assuming result.response is the stream
        let toolCalls: any[] = [];
        let modelText = '';
        let currentThoughtSignature = ''; // Placeholder for thought signature

        for await (const chunk of stream) {
          const chunkData = chunk.candidates[0].content;
          
          if (chunkData.parts) {
            for (const part of chunkData.parts) {
              if (part.text) {
                modelText += part.text;
                writer.write(JSON.stringify({ type: 'text', value: part.text }));
              }
              if (part.functionCall) {
                toolCalls.push(part.functionCall);
                writer.write(JSON.stringify({ type: 'tool_code', value: part.functionCall })); // Stream tool call as code
                // Assuming thoughtSignature might be associated with a functionCall
                // This is a placeholder, actual implementation might vary based on Gemini 3 API
                if (part.functionCall.thoughtSignature) {
                  currentThoughtSignature = part.functionCall.thoughtSignature;
                  this.thought_signatures.push(currentThoughtSignature);
                }
              }
            }
          }
        }

        this.history.push({ role: 'model', parts: [{ text: modelText }] }); // Add model's text response to history

        if (toolCalls.length > 0) {
          // Execute tools and append responses to history
          const toolResponses = await Promise.all(toolCalls.map(async (call: any) => {
            const tool = findTool(call.name); // Assuming findTool can locate the tool handler
            if (!tool) {
              return {
                functionResponse: {
                  name: call.name,
                  response: { error: `Tool ${call.name} not found` },
                },
              };
            }
            // Execute the tool
            const toolOutput = await tool.handler(call.args); // Assuming tool.handler executes with args

            // Attach thoughtSignature from current turn to tool response
            return {
              functionResponse: {
                name: call.name,
                response: toolOutput,
                thoughtSignature: currentThoughtSignature, // Attach the captured thought signature
              },
            };
          }));

          toolResponses.forEach(response => {
            this.history.push({ role: 'function', parts: [response] }); // Add tool response to history
            writer.write(JSON.stringify({ type: 'tool_response', value: response })); // Stream tool response
          });

          toolCallRound++;
          await processTurn(); // Continue the turn for potential follow-up tool calls or final response
        } else {
          // No tool calls, this is a final text response
          finalResponseSent = true;
          writer.close();
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown runtime error';
        writer.write(JSON.stringify({ type: 'error', value: message }));
        writer.close();
      }
    };

    // Start the process
    processTurn();

    return readable;
  }

  // executeStep is now integrated into the run method's processTurn for recursion
}

export { GeminiAgentRuntime };

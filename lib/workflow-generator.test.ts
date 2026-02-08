// lib/workflow-generator.test.ts
import { describe, test, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { emitNodeOutput, emitNodeStatus } from './workflow-generator';
import { getStreamWritable } from '@/lib/workflow/runtime/streams';

// Mock the getStreamWritable function
vi.mock('@/lib/workflow/runtime/streams', () => ({
  getStreamWritable: vi.fn(),
}));

describe('emitNodeOutput', () => {
  let consoleSpy: any;

  beforeEach(() => {
    // Clear mock calls before each test
    (getStreamWritable as Mock).mockClear();
    // Spy on console.log to prevent test output pollution and verify fallback behavior
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleSpy.mockRestore(); // Restore console.log after each test
  });

  test('should write to the stream when writable is available', async () => {
    const mockWriter = {
      write: vi.fn(),
      releaseLock: vi.fn(),
    };
    const mockWritable = {
      getWriter: vi.fn(() => mockWriter),
    };
    (getStreamWritable as Mock).mockReturnValue(mockWritable);

    const nodeId = 'node-1';
    const output = { data: 'test data' };
    const runId = 'run-abc';
    const stepType = 'step';

    await emitNodeOutput(nodeId, output, runId, stepType);

    expect(getStreamWritable).toHaveBeenCalledWith(runId);
    expect(mockWritable.getWriter).toHaveBeenCalledTimes(1);
    expect(mockWriter.write).toHaveBeenCalledTimes(1);

    const writtenString = mockWriter.write.mock.calls[0][0];

    // Parse the written JSON and check its structure
    const parsedOutput = JSON.parse(writtenString);
    expect(parsedOutput.type).toBe('nodeOutput');
    expect(parsedOutput.nodeId).toBe(nodeId);
    expect(parsedOutput.stepType).toBe(stepType);
    expect(parsedOutput.output).toEqual(output);
    expect(parsedOutput.runId).toBe(runId);
    expect(parsedOutput).toHaveProperty('timestamp');
    expect(typeof parsedOutput.timestamp).toBe('number');

    expect(mockWriter.releaseLock).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled(); // Should not log to console when stream is available
  });

  test('should log to console when no writable stream is available', async () => {
    (getStreamWritable as Mock).mockReturnValue(undefined);

    const nodeId = 'node-2';
    const output = { message: 'no stream available' };
    const runId = 'run-def';
    const stepType = 'testStep';

    await emitNodeOutput(nodeId, output, runId, stepType);

    expect(getStreamWritable).toHaveBeenCalledWith(runId);
    expect(consoleSpy).toHaveBeenCalledWith(`[Node Output Debug - ${stepType}:${nodeId}]`, output);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  test('should handle output containing special characters safely', async () => {
    const mockWriter = {
      write: vi.fn(),
      releaseLock: vi.fn(),
    };
    const mockWritable = {
      getWriter: vi.fn(() => mockWriter),
    };
    (getStreamWritable as Mock).mockReturnValue(mockWritable);

    const nodeId = 'node-3';
    const output = { text: 'Some "special" characters: \n, \t, <>&' };
    const runId = 'run-ghi';
    const stepType = 'complex';

    await emitNodeOutput(nodeId, output, runId, stepType);

    const writtenString = mockWriter.write.mock.calls[0][0];
    const parsedOutput = JSON.parse(writtenString);

    expect(parsedOutput.output).toEqual(output); // Should be correctly serialized JSON
  });
});

describe('emitNodeStatus', () => {
  let consoleSpy: any;

  beforeEach(() => {
    (getStreamWritable as Mock).mockClear();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('should write node status to the stream when writable is available', async () => {
    const mockWriter = {
      write: vi.fn(),
      releaseLock: vi.fn(),
    };
    const mockWritable = {
      getWriter: vi.fn(() => mockWriter),
    };
    (getStreamWritable as Mock).mockReturnValue(mockWritable);

    const nodeId = 'node-status-1';
    const status = 'running';
    const runId = 'run-status-abc';
    const stepType = 'statusStep';
    const message = 'Node is running';

    await emitNodeStatus(nodeId, status, runId, stepType, message);

    expect(getStreamWritable).toHaveBeenCalledWith(runId);
    expect(mockWritable.getWriter).toHaveBeenCalledTimes(1);
    expect(mockWriter.write).toHaveBeenCalledTimes(1);

    const writtenString = mockWriter.write.mock.calls[0][0];

    const parsedStatus = JSON.parse(writtenString);
    expect(parsedStatus.type).toBe('nodeStatus');
    expect(parsedStatus.nodeId).toBe(nodeId);
    expect(parsedStatus.stepType).toBe(stepType);
    expect(parsedStatus.status).toBe(status);
    expect(parsedStatus.runId).toBe(runId);
    expect(parsedStatus.message).toBe(message);
    expect(parsedStatus).toHaveProperty('timestamp');
    expect(typeof parsedStatus.timestamp).toBe('number');

    expect(mockWriter.releaseLock).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  test('should log node status to console when no writable stream is available', async () => {
    (getStreamWritable as Mock).mockReturnValue(undefined);

    const nodeId = 'node-status-2';
    const status = 'failed';
    const runId = 'run-status-def';
    const stepType = 'errorStep';
    const message = 'Node failed unexpectedly';

    await emitNodeStatus(nodeId, status, runId, stepType, message);

    expect(getStreamWritable).toHaveBeenCalledWith(runId);
    expect(consoleSpy).toHaveBeenCalledWith(`[Node Status Debug - ${stepType}:${nodeId}] Status: ${status}`, message);
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  test('should use default message when no message is provided', async () => {
    const mockWriter = {
      write: vi.fn(),
      releaseLock: vi.fn(),
    };
    const mockWritable = {
      getWriter: vi.fn(() => mockWriter),
    };
    (getStreamWritable as Mock).mockReturnValue(mockWritable);

    const nodeId = 'node-status-3';
    const status = 'completed';
    const runId = 'run-status-ghi';
    const stepType = 'completedStep';

    await emitNodeStatus(nodeId, status, runId, stepType);

    const writtenString = mockWriter.write.mock.calls[0][0];
    const parsedStatus = JSON.parse(writtenString);

    expect(parsedStatus.message).toBe(`Node ${nodeId} status: ${status}`);
  });
});

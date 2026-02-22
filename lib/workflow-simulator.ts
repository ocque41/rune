import { Edge, Node } from '@xyflow/react';
import { getNodeKindDisplayName, resolveNodeKind } from './workflow/node-catalog';

export type SimulationLogEntry =
  | {
    type: 'info' | 'error' | 'success' | 'warning';
    stepId: string;
    stepLabel: string;
    message: string;
    timestamp: number;
    data?: any;
  }
  | {
    type: 'nodeOutput';
    nodeId: string;
    output: any;
    runId: string;
    timestamp: number;
  }
  | {
    type: 'nodeStatus';
    nodeId: string;
    status: string;
    message?: string;
    timestamp: number;
  };

export type SimulationResult = {
  success: boolean;
  logs: SimulationLogEntry[];
  outputs: Record<string, any>;
};

export type ValidationIssue = {
  nodeId: string;
  severity: 'error' | 'warning';
  message: string;
};

function getNodeLabel(node: Node): string {
  const label = (node.data as any)?.label;
  if (typeof label === 'string' && label.trim().length > 0) {
    return label;
  }

  return getNodeKindDisplayName(resolveNodeKind(node as any));
}

/**
 * Validate the workflow configuration before running
 */
export function validateWorkflowConfig(nodes: Node[], edges: Edge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1. Check for isolated nodes (except Start)
  nodes.forEach(node => {
    const nodeKind = resolveNodeKind(node as any);
    if (nodeKind === 'startWorkflow') return;

    const hasIncoming = edges.some(e => e.target === node.id);
    if (!hasIncoming) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        message: `Node "${getNodeLabel(node)}" is disconnected (no incoming edges).`
      });
    }
  });

  // 2. config checks
  nodes.forEach(node => {
    const data = node.data as any;
    const nodeKind = resolveNodeKind(node as any);

    if (nodeKind === 'httpRequest') {
      if (!data.httpRequest?.url) {
        issues.push({ nodeId: node.id, severity: 'error', message: 'HTTP Request missing URL.' });
      }
    }
    if (nodeKind === 'sendEmail') {
      if (!data.emailConfig?.recipient) {
        issues.push({ nodeId: node.id, severity: 'error', message: 'Send Email missing recipient.' });
      }
    }
    if (nodeKind === 'databaseQuery') {
      if (!data.dbConfig?.connectionString && data.dbConfig?.dbType !== 'generic') {
        issues.push({ nodeId: node.id, severity: 'warning', message: 'Database Query missing connection string.' });
      }
    }
    if (nodeKind === 'slackMessage') {
      if (!data.slackConfig?.webhookUrl) {
        issues.push({ nodeId: node.id, severity: 'error', message: 'Slack Message missing Webhook URL.' });
      }
    }
  });

  return issues;
}

/**
 * Client-side workflow simulator
 * Interprets the graph and executes steps with mocks
 */
export async function simulateWorkflow(
  nodes: Node[],
  edges: Edge[],
  initialInput: any = {}
): Promise<SimulationResult> {
  const logs: SimulationLogEntry[] = [];
  const outputs: Record<string, any> = {};
  let success = true;

  function addLog(stepId: string, label: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info', data?: any) {
    logs.push({
      stepId,
      stepLabel: label,
      message,
      timestamp: Date.now(),
      type,
      data
    });
  }

  addLog('system', 'System', 'Starting simulation...', 'info', initialInput);

  // Find Start Node (or fallback trigger if missing)
  const startNode = nodes.find(n => resolveNodeKind(n as any) === 'startWorkflow')
    ?? nodes.find((n) => {
      const kind = resolveNodeKind(n as any);
      return kind === 'webhook' || kind === 'schedule';
    });

  if (!startNode) {
    addLog('system', 'System', 'No "Start Workflow" node found (or other trigger node).', 'error');
    return { success: false, logs, outputs };
  }

  const queue: { nodeId: string; input: any }[] = [{ nodeId: startNode.id, input: initialInput }];
  const executionCounts: Record<string, number> = {}; // For loop safety

  while (queue.length > 0) {
    const { nodeId, input } = queue.shift()!;

    // Loop safety check (max 5 executions per node per simulation to prevent infinite loops)
    executionCounts[nodeId] = (executionCounts[nodeId] || 0) + 1;
    if (executionCounts[nodeId] > 5) {
      addLog(nodeId, 'System', `Infinite loop prevented. Node skipped.`, 'warning');
      continue;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;
    const data = node.data as any;
    const nodeKind = resolveNodeKind(node as any);
    const label = getNodeLabel(node);

    addLog(nodeId, label, `Executing ${label}`, 'info', { input });

    let result: any = { status: 'success' };
    let nextNodes: { nodeId: string; input: any }[] = [];

    try {
      // --- Step Execution Logic ---
      if (nodeKind === 'httpRequest') {
        result = {
          status: 200,
          data: { simulated: true, message: 'Mock HTTP Response', url: data.httpRequest?.url }
        };
        addLog(nodeId, label, `Mock HTTP ${data.httpRequest?.method} to ${data.httpRequest?.url}`, 'success', result);
      }
      else if (nodeKind === 'sendEmail') {
        result = { status: 'sent', recipient: data.emailConfig?.recipient };
        addLog(nodeId, label, `Mock Email sent to ${data.emailConfig?.recipient}`, 'success', result);
      }
      else if (nodeKind === 'databaseQuery') {
        result = { status: 'success', rows: [{ id: 1, mock: true }], rowCount: 1 };
        addLog(nodeId, label, `Mock DB Query (${data.dbConfig?.dbType}) executed`, 'success', result);
      }
      else if (nodeKind === 'runScript') {
        // Safe(ish) eval provided it's user's own code. 
        // We use new Function()
        const code = data.scriptConfig?.code || '';
        try {
          const fn = new Function('params', code);
          const scriptResult = fn({ ...input, previous: outputs }); // Provide context
          result = { status: 'success', result: scriptResult };
          addLog(nodeId, label, `Script executed successfully`, 'success', { result: scriptResult });
        } catch (e: any) {
          throw new Error(`Script error: ${e.message}`);
        }
      }
      else if (nodeKind === 'transform') {
        const expr = data.transformConfig?.expression || 'return params;';
        try {
          const fn = new Function('params', expr);
          const transformResult = fn(input);
          result = { status: 'success', result: transformResult };
          addLog(nodeId, label, `Transformation applied`, 'success', { result: transformResult });
        } catch (e: any) {
          throw new Error(`Transform error: ${e.message}`);
        }
      }
      else if (nodeKind === 'ifElse' || node.type === 'if') {
        // Condition logic
        const condition = data.condition || 'true';
        let conditionResult = false;
        try {
          const fn = new Function('params', `return ${condition};`);
          conditionResult = !!fn(input);
          addLog(nodeId, label, `Condition evaluated to ${conditionResult}`, 'info');
        } catch (e: any) {
          throw new Error(`Condition error: ${e.message}`);
        }

        // Route based on result
        const handleId = conditionResult ? 'true' : 'false';
        const edge = edges.find(e => e.source === nodeId && e.sourceHandle === handleId);
        if (edge) {
          nextNodes.push({ nodeId: edge.target, input }); // Pass input through
        } else {
          addLog(nodeId, label, `No edge connected to ${conditionResult} branch`, 'warning');
        }
        result = { condition: conditionResult };
      }
      else if (nodeKind === 'loop' || node.type === 'loop') {
        // Simulation: We only run the body ONCE or handle items
        // For now, let's treat it as a pass-through that triggers the body once
        addLog(nodeId, label, 'Simulating loop (1 iteration)', 'info');

        const bodyEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'body');
        if (bodyEdge) {
          nextNodes.push({ nodeId: bodyEdge.target, input: { ...input, item: { mockItem: true } } });
        }

        // Also prepare Done path (triggers after body completes? In BFS it's tricky. 
        // We'll queue Done path to run *after* body if we were accurate, but doing both for coverage is okay or just Done)
        // Let's just create a mock "loop end" behavior.
        const doneEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'done');
        if (doneEdge) {
          // In simulation we probably want to see the Done path too
          // Using a slight delay or just queueing it?
          // Let's queue it.
          nextNodes.push({ nodeId: doneEdge.target, input });
        }
        result = { simulatedLoop: true };
      }
      else if (nodeKind === 'ai' || node.type === 'ai') {
        result = { status: 'success', content: 'Mock AI Content', model: data.aiConfig?.model };
        addLog(nodeId, label, `Mock AI generated content`, 'success', result);
      }
      else if (nodeKind === 'waitForEvent') {
        result = { status: 'received', event: data.waitConfig?.event, data: { simulated: true } };
        addLog(nodeId, label, `Simulated event reception: ${data.waitConfig?.event}`, 'success', result);
      }
      else if (nodeKind === 'approval') {
        result = { status: 'approved', approver: data.approvalConfig?.approverEmail };
        addLog(nodeId, label, `Simulated approval from ${data.approvalConfig?.approverEmail}`, 'success', result);
      }
      else if (nodeKind === 'stream') {
        result = { status: 'streamed', message: data.streamConfig?.message };
        addLog(nodeId, label, `Streamed: ${data.streamConfig?.message}`, 'success', result);
      }
      else if (nodeKind === 'slackMessage') {
        result = { status: 'sent', channel: data.slackConfig?.channel };
        addLog(nodeId, label, `Simulated Slack message sent`, 'success', result);
      }
      else if (nodeKind === 'sleep') {
        const duration = data.sleepConfig?.duration || '100ms';
        const ms = parseInt(duration) || 100;
        await new Promise(r => setTimeout(r, Math.min(ms, 100))); // Cap at 100ms for simulation
        result = { status: 'completed', duration };
        addLog(nodeId, label, `Sleep completed (${duration})`, 'success', result);
      }
      // ... default behavior for others
      else if (nodeKind !== 'startWorkflow') {
        // Generic step fallback
        addLog(nodeId, label, `Executed generic step`, 'success');
      }

      // Save output
      outputs[nodeId] = result;

      // --- Traversal Logic (Standard single output) ---
      const hasCustomTraversal = nodeKind === 'ifElse'
        || nodeKind === 'loop'
        || node.type === 'if'
        || node.type === 'loop';

      if (!hasCustomTraversal) {
        // Find all outgoing edges
        const outgoing = edges.filter(e => e.source === nodeId);
        outgoing.forEach(e => {
          nextNodes.push({ nodeId: e.target, input: result }); // Pass result as input
        });
      }

      // Add next nodes to queue
      nextNodes.forEach(n => queue.push(n));

    } catch (error: any) {
      addLog(nodeId, label, `Error: ${error.message}`, 'error');
      success = false;
    }

    // Artificial delay for visualization
    await new Promise(r => setTimeout(r, 100));
  }

  addLog('system', 'System', 'Simulation complete.', success ? 'success' : 'error');
  return { success, logs, outputs };
}

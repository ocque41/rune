import { Node, Edge } from '@xyflow/react';

export function generateWorkflowCode(nodes: Node[], edges: Edge[]): string {
  const imports = `import { sleep, getWritable, resumeHook, createHook, getSecret } from "workflow";`;

  // Collect unique Sub-Workflow IDs
  const subWorkflowIds = Array.from(new Set(
    nodes
      .filter(n => n.data.label === 'Sub-Workflow' || (n.type === 'subWorkflow')) // Handle both label and type check to be safe
      .map(n => (n.data as any).workflowId)
      .filter(Boolean)
  ));

  const subWorkflowImports = subWorkflowIds
    .map(id => `import { ${id} } from "./workflows/${id}";`)
    .join('\n');

  // 1. Identify Steps and Configuration
  const stepDefinitions = nodes
    .filter((n) => n.type === 'step' && n.data.label !== 'Start Workflow' && n.data.label !== 'HTTP Request' && n.data.label !== 'Send Email' && n.data.label !== 'Database Query' && n.data.label !== 'Run Script' && n.data.label !== 'Slack Message' && n.data.label !== 'Stream' && n.data.label !== 'Wait for Event' && n.data.label !== 'Approval' && n.data.label !== 'AI' && n.data.label !== 'Transform')
    .map((node) => {
      const functionName = toCamelCase(node.data.label as string);
      // In a real app, we'd generate specific code based on the step type (e.g., email, db)
      // For now, we generate a generic placeholder
      return `
export const ${functionName} = async (params: any) => {
  "use step";
  console.log("Running step: ${node.data.label}", params);
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { status: "success", step: "${node.data.label}" };
};`;
    })
    .join('\n');

  // Add reusable HTTP Request step
  const httpStepDefinition = `
export const makeHttpRequest = async (params: { method: string; url: string; headers: any; body: any; idempotencyKey?: string }) => {
  "use step";
  console.log("Making HTTP Request:", params.method, params.url);
  console.log("Idempotency Key:", params.idempotencyKey);
  const response = await fetch(params.url, {
    method: params.method,
    headers: params.headers,
    body: params.method !== 'GET' && params.method !== 'HEAD' ? JSON.stringify(params.body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
};`;

  // Add reusable Send Email step
  const emailStepDefinition = `
export const sendEmail = async (params: { recipient: string; subject: string; body: string; idempotencyKey?: string }) => {
  "use step";
  console.log("Sending email to:", params.recipient);
  console.log("Idempotency Key:", params.idempotencyKey);
  console.log("Subject:", params.subject);
  console.log("Body:", params.body);
  // Simulate sending
  await new Promise(resolve => setTimeout(resolve, 500));
  return { status: "sent", recipient: params.recipient };
};`;

  // Add reusable Database Query step
  const dbStepDefinition = `
export const queryDatabase = async (params: { connectionString: string; query: string; idempotencyKey?: string }) => {
  "use step";
  console.log("Executing Database Query");
  console.log("Idempotency Key:", params.idempotencyKey);
  console.log("Connection:", params.connectionString ? "Provided" : "Missing");
  console.log("Query:", params.query);
  
  // Simulate database connection and query
  if (!params.connectionString) {
    throw new Error("Connection string is required");
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  return { status: "success", rows: [], rowCount: 0 };
};`;

  // Add reusable Run Script step
  const scriptStepDefinition = `
export const runScript = async (params: { code: string; context: any }) => {
  "use step";
  console.log("Running custom script");
  
  try {
    // Create a function from the user code
    // We pass 'params' as an argument to the function
    const userFunction = new Function('params', params.code);
    const result = userFunction(params.context);
    return { status: "success", result };
  } catch (error: any) {
    console.error("Script execution failed:", error);
    throw new Error("Script execution failed: " + error.message);
  }
};`;

  // Add reusable Slack Message step
  const slackStepDefinition = `
export const sendSlackMessage = async (params: { webhookUrl: string; channel?: string; message: string; idempotencyKey?: string }) => {
  "use step";
  console.log("Sending Slack message");
  console.log("Idempotency Key:", params.idempotencyKey);
  
  if (!params.webhookUrl) {
    throw new Error("Webhook URL is required");
  }

  // In a real app, we would POST to the webhook
  // await fetch(params.webhookUrl, { method: 'POST', body: JSON.stringify({ text: params.message, channel: params.channel }) });
  
  console.log("Webhook:", params.webhookUrl);
  console.log("Channel:", params.channel);
  console.log("Message:", params.message);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  return { status: "sent" };
};`;

  // Add reusable Stream step
  const streamStepDefinition = `
export const streamUpdate = async (params: { message: string }) => {
  "use step";
  console.log("Streaming update:", params.message);
  const writable = getWritable();
  if (writable) {
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(params.message + "\\n"));
    writer.releaseLock();
  }
  return { status: "streamed", message: params.message };
};`;

  // Add reusable Wait for Event step
  const waitStepDefinition = `
export const waitForEvent = async (params: { event: string; timeout?: string }) => {
  "use step";
  console.log("Waiting for event:", params.event);
  // This will pause execution until the event is received via resumeHook
  // The timeout is handled by the workflow engine if supported, or we can implement a race
  const result = await resumeHook(params.event);
  return { status: "received", event: params.event, data: result };
};`;

  // Add reusable Approval step
  const approvalStepDefinition = `
export const waitForApproval = async (params: { approverEmail: string; timeout?: string }) => {
  "use step";
  console.log("Requesting approval from:", params.approverEmail);
  // In a real app, this would send an email and wait for a click
  // We simulate waiting for an event named 'approval-{approverEmail}'
  const eventName = \`approval-\${params.approverEmail}\`;
  const result = await resumeHook(eventName);
  return { status: result.approved ? "approved" : "rejected", approver: params.approverEmail };
};`;

  // Add reusable AI step
  const aiStepDefinition = `
export const generateContent = async (params: { prompt: string; model?: string }) => {
  "use step";
  console.log("Generating AI content with model:", params.model);
  console.log("Prompt:", params.prompt);
  // Mock AI response
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { 
    status: "success", 
    content: \`Generated content for: \${params.prompt}\`,
    model: params.model 
  };
};`;

  // Add reusable Transform step
  const transformStepDefinition = `
export const transformData = async (params: { mapping: string; data: any }) => {
  "use step";
  console.log("Transforming data");
  try {
    const transformFn = new Function('params', params.mapping);
    const result = transformFn(params.data);
    return { status: "success", result };
  } catch (error: any) {
    throw new Error("Transformation failed: " + error.message);
  }
};`;

  // 2. Build Workflow Logic
  const startNode = nodes.find((n) => n.data.label === 'Start Workflow');
  let workflowBody = '';

  if (startNode) {
    workflowBody = traverseGraph(startNode.id, nodes, edges, new Set());
  }

  const workflowDefinition = `
export async function workflow(params: any) {
  "use workflow";
  ${workflowBody}
  return { result: "Workflow completed" };
}`;

  // Helper functions for error handling and retry logic
  const helperFunctions = `
// Helper function to parse duration strings (e.g., "1s", "500ms", "2m") into milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\\d+)(ms|s|m|h)$/);
  if (!match) return 1000; // Default to 1 second
  const [, num, unit] = match;
  const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000 };
  return parseInt(num) * (multipliers[unit] || 1000);
}

// Helper function to calculate backoff delay based on policy
function calculateBackoff(attempt: number, policy: string, baseDelay: string): number {
  const baseMs = parseDuration(baseDelay);
  switch(policy) {
    case 'exponential':
      return Math.pow(2, attempt - 1) * baseMs;
    case 'linear':
      return attempt * baseMs;
    case 'constant':
      return baseMs;
    default:
      return baseMs;
  }
}

// Helper function to wrap a promise with a timeout
async function withTimeout<T>(promise: Promise<T>, timeout: string): Promise<T> {
  const timeoutMs = parseDuration(timeout);
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(\`Timeout after \${timeout}\`)), timeoutMs)
    )
  ]);
}

// Custom Error classes for workflow control
export class FatalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FatalError";
  }
}

export class RetryableError extends Error {
  retryAfterMs?: number;
  
  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "RetryableError";
    this.retryAfterMs = retryAfterMs;
  }
}`;

  return `${imports}\n${subWorkflowImports}\n${helperFunctions}\n${stepDefinitions}\n${httpStepDefinition}\n${emailStepDefinition}\n${dbStepDefinition}\n${scriptStepDefinition}\n${slackStepDefinition}\n${streamStepDefinition}\n${waitStepDefinition}\n${approvalStepDefinition}\n${aiStepDefinition}\n${transformStepDefinition}\n${workflowDefinition}`;
}

function traverseGraph(
  currentId: string,
  nodes: Node[],
  edges: Edge[],
  visited: Set<string>
): string {
  if (visited.has(currentId)) return ''; // Prevent cycles for MVP
  visited.add(currentId);

  const currentNode = nodes.find((n) => n.id === currentId);
  if (!currentNode) return '';

  // Handle If Node
  if (currentNode.type === 'if') {
    const condition = (currentNode.data as any).condition || 'true';

    // Find True branch
    const trueEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'true');
    const trueCode = trueEdge ? generateNodeCall(nodes.find(n => n.id === trueEdge.target)!) + traverseGraph(trueEdge.target, nodes, edges, new Set(visited)) : '';

    // Find False branch
    const falseEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'false');
    const falseCode = falseEdge ? generateNodeCall(nodes.find(n => n.id === falseEdge.target)!) + traverseGraph(falseEdge.target, nodes, edges, new Set(visited)) : '';

    return `\n    if (${condition}) {\n      ${trueCode}\n    } else {\n      ${falseCode}\n    }`;
  }

  // Handle Loop Node
  if (currentNode.type === 'loop') {
    const items = (currentNode.data as any).items || '[]';

    // Find Body branch
    const bodyEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'body');
    const bodyCode = bodyEdge ? generateNodeCall(nodes.find(n => n.id === bodyEdge.target)!) + traverseGraph(bodyEdge.target, nodes, edges, new Set(visited)) : '';

    // Find Done branch
    const doneEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'done');
    const doneCode = doneEdge ? generateNodeCall(nodes.find(n => n.id === doneEdge.target)!) + traverseGraph(doneEdge.target, nodes, edges, visited) : '';

    return `\n    for (const item of ${items}) {\n      ${bodyCode}\n    }\n    ${doneCode}`;
  }

  // Handle Parallel Node
  if (currentNode.type === 'parallel') {
    const branches = (currentNode.data as any).branches || 2;
    const branchPromises = [];

    // Generate code for each branch
    for (let i = 0; i < branches; i++) {
      const branchEdge = edges.find(e => e.source === currentId && e.sourceHandle === `branch-${i}`);
      const branchCode = branchEdge
        ? generateNodeCall(nodes.find(n => n.id === branchEdge.target)!) + traverseGraph(branchEdge.target, nodes, edges, new Set(visited))
        : '';

      branchPromises.push(`(async () => {\n      ${branchCode}\n    })()`);
    }

    // Find Merge/Continue branch
    const mergeEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'merge');
    const mergeCode = mergeEdge
      ? generateNodeCall(nodes.find(n => n.id === mergeEdge.target)!) + traverseGraph(mergeEdge.target, nodes, edges, visited)
      : '';

    return `\n    await Promise.all([\n      ${branchPromises.join(',\n      ')}\n    ]);\n    ${mergeCode}`;
  }

  // Handle Approval Node
  if (currentNode.type === 'approval') {
    const approverEmail = (currentNode.data as any).approverEmail || 'manager@example.com';
    const timeout = (currentNode.data as any).timeout || '24h';

    // Find Next node
    const nextEdge = edges.find(e => e.source === currentId);
    const nextCode = nextEdge ? generateNodeCall(nodes.find(n => n.id === nextEdge.target)!) + traverseGraph(nextEdge.target, nodes, edges, visited) : '';

    return `\n    const approvalResult = await waitForApproval({ approverEmail: "${approverEmail}", timeout: "${timeout}" });\n    ${nextCode}`;
  }

  // Handle AI Node
  if (currentNode.type === 'ai') {
    const prompt = (currentNode.data as any).prompt || '';
    const model = (currentNode.data as any).model || 'gemini-pro';

    const nextEdge = edges.find(e => e.source === currentId);
    const nextCode = nextEdge ? generateNodeCall(nodes.find(n => n.id === nextEdge.target)!) + traverseGraph(nextEdge.target, nodes, edges, visited) : '';

    return `\n    const aiResult = await generateContent({ prompt: \`${prompt}\`, model: "${model}" });\n    ${nextCode}`;
  }

  // Handle Transform Node
  if (currentNode.type === 'transform') {
    const mapping = (currentNode.data as any).mapping || 'return params;';

    const nextEdge = edges.find(e => e.source === currentId);
    const nextCode = nextEdge ? generateNodeCall(nodes.find(n => n.id === nextEdge.target)!) + traverseGraph(nextEdge.target, nodes, edges, visited) : '';

    return `\n    const transformResult = await transformData({ mapping: \`${mapping}\`, data: params });\n    ${nextCode}`;
  }

  const outgoingEdges = edges.filter((e) => e.source === currentId);
  if (outgoingEdges.length === 0) return '';

  let code = '';

  // Sort edges to ensure deterministic order if needed (e.g., by Y position)
  // For now, we just take them as they are.

  if (outgoingEdges.length === 1) {
    // Sequential
    const targetId = outgoingEdges[0].target;
    const targetNode = nodes.find((n) => n.id === targetId);

    if (targetNode) {
      code += generateNodeCall(targetNode);
      code += traverseGraph(targetId, nodes, edges, visited);
    }
  } else {
    // Parallel (Promise.all)
    const branches = outgoingEdges.map((edge) => {
      const targetId = edge.target;
      const targetNode = nodes.find((n) => n.id === targetId);
      if (!targetNode) return '';

      // For parallel, we need to traverse down each branch
      // This is a simplification; complex graphs need a better traversal (DAG)
      const branchCode = generateNodeCall(targetNode) + traverseGraph(targetId, nodes, edges, new Set(visited));
      return `(async () => { ${branchCode} })()`;
    });

    code += `\n    await Promise.all([\n      ${branches.join(',\n      ')}\n    ]);`;
  }

  return code;
}

function generateNodeCall(node: Node): string {
  // Handle Sleep nodes specifically
  if (node.data.label === 'Sleep') {
    const duration = (node.data as any).config?.timeout || (node.data as any).duration || '5s';
    return `\n    await sleep("${duration}");`;
  }

  // Handle HTTP Request nodes
  if (node.data.label === 'HTTP Request') {
    const config = (node.data as any).httpRequest || {};
    const method = config.method || 'GET';
    const url = config.url || 'https://api.example.com';
    const headers = config.headers || '{}';
    const body = config.body || '{}';
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await makeHttpRequest({ 
        method: "${method}", 
        url: ${processString(url)}, 
        headers: JSON.parse(${processString(headers)}), 
        body: JSON.parse(${processString(body)}),
        idempotencyKey: "${(node.data as any).idempotencyKey || node.id}"
    })`;

    return wrapWithRetry(stepCode, 'HTTP Request', errorConfig);
  }

  // Handle Send Email nodes
  if (node.data.label === 'Send Email') {
    const config = (node.data as any).emailConfig || {};
    const recipient = config.recipient || 'user@example.com';
    const subject = config.subject || 'Subject';
    const body = config.body || 'Body content';
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await sendEmail({ 
        recipient: ${processString(recipient)}, 
        subject: ${processString(subject)}, 
        body: ${processString(body)},
        idempotencyKey: "${(node.data as any).idempotencyKey || node.id}"
    })`;

    return wrapWithRetry(stepCode, 'Send Email', errorConfig);
  }

  // Handle Database Query nodes
  if (node.data.label === 'Database Query') {
    const config = (node.data as any).dbConfig || {};
    const connectionString = config.connectionString || '';
    const query = config.query || 'SELECT 1';
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await queryDatabase({ 
        connectionString: ${processString(connectionString)}, 
        query: ${processString(query)},
        idempotencyKey: "${(node.data as any).idempotencyKey || node.id}"
    })`;

    return wrapWithRetry(stepCode, 'Database Query', errorConfig);
  }

  // Handle Run Script nodes
  if (node.data.label === 'Run Script') {
    const config = (node.data as any).scriptConfig || {};
    // Escape backticks in user code to prevent template literal breakage
    const code = (config.code || 'return "Hello World";').replace(/`/g, '\\`');
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await runScript({ 
        code: \`${code}\`,
        context: {} 
    })`;

    return wrapWithRetry(stepCode, 'Run Script', errorConfig);
  }

  // Handle Slack Message nodes
  if (node.data.label === 'Slack Message') {
    const config = (node.data as any).slackConfig || {};
    const webhookUrl = config.webhookUrl || '';
    const channel = config.channel || '';
    const message = config.message || 'Hello';
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await sendSlackMessage({ 
        webhookUrl: ${processString(webhookUrl)}, 
        channel: ${processString(channel)},
        message: ${processString(message)},
        idempotencyKey: "${(node.data as any).idempotencyKey || node.id}"
    })`;

    return wrapWithRetry(stepCode, 'Slack Message', errorConfig);
  }

  // Handle Stream nodes
  if (node.data.label === 'Stream') {
    const config = (node.data as any).streamConfig || {};
    const message = config.message || 'Update';
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await streamUpdate({ 
        message: ${processString(message)} 
    })`;

    return wrapWithRetry(stepCode, 'Stream', errorConfig);
  }

  // Handle Wait for Event nodes
  if (node.data.label === 'Wait for Event') {
    const config = (node.data as any).waitConfig || {};
    const event = config.event || 'my-event';
    const timeout = config.timeout;
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await waitForEvent({ 
        event: "${event}",
        timeout: "${timeout || ''}"
    })`;

    return wrapWithRetry(stepCode, 'Wait for Event', errorConfig);
  }

  // Handle Sub-Workflow nodes
  if (node.data.label === 'Sub-Workflow') {
    const workflowId = (node.data as any).workflowId || 'leadQualification';
    const params = (node.data as any).params || '{}';
    const errorConfig = (node.data as any).errorConfig;

    // Call the imported workflow function
    const stepCode = `
    await ${workflowId}(JSON.parse(${processString(params)}))`;

    return wrapWithRetry(stepCode, 'Sub-Workflow', errorConfig);
  }

  // Handle regular step nodes
  if (node.type === 'step') {
    const functionName = toCamelCase(node.data.label as string);
    return `\n    await ${functionName}({});`;
  }

  return '';
}

function toCamelCase(str: string): string {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
      index === 0 ? word.toLowerCase() : word.toUpperCase()
    )
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
}

function wrapWithRetry(stepCode: string, stepName: string, errorConfig: any): string {
  // If no error config or using defaults, just return the step code
  if (!errorConfig || Object.keys(errorConfig).length === 0) {
    return stepCode;
  }

  const maxRetries = errorConfig.maxRetries ?? 3;
  const backoffPolicy = errorConfig.backoffPolicy || 'exponential';
  const baseDelay = errorConfig.baseDelay || '1s';
  const failureAction = errorConfig.failureAction || 'retry';
  const timeout = errorConfig.timeout || '';

  // For "ignore" action with no retries, we just wrap in try-catch
  if (failureAction === 'ignore' && maxRetries === 0) {
    return `
    try {
      ${stepCode}
    } catch (error: any) {
      console.warn("Ignoring error in ${stepName}:", error.message);
    }`;
  }

  // Build the step execution line (with or without timeout)
  const stepExecution = timeout
    ? `await withTimeout(${stepCode.trim().replace('await ', '')}, "${timeout}")`
    : stepCode.trim();

  // Generate retry wrapper
  return `
    {
      let lastError: any = null;
      let success = false;
      const fatalPatterns = ${JSON.stringify(errorConfig.fatalErrorPatterns || [])};
      
      for (let attempt = 1; attempt <= ${maxRetries}; attempt++) {
        try {
          console.log(\`[${stepName}] Attempt \${attempt}/${maxRetries}\`);
          ${stepExecution};
          console.log(\`[${stepName}] Succeeded on attempt \${attempt}\`);
          success = true;
          break;
        } catch (error: any) {
          lastError = error;
          console.error(\`[${stepName}] Failed on attempt \${attempt}:\`, error.message);
          
          // Check for FatalError
          if (error.name === 'FatalError') {
             console.error(\`[${stepName}] Fatal error encountered, stopping retries.\`);
             throw error;
          }

          // Check for fatal patterns
          if (fatalPatterns.some((p: string) => error.message.includes(p))) {
             console.error(\`[${stepName}] Error matches fatal pattern, stopping retries.\`);
             throw new FatalError(error.message);
          }
          
          ${failureAction === 'fail-workflow'
      ? `throw new Error(\`Fatal error in ${stepName}: \${error.message}\`);`
      : ''}
          
          if (attempt < ${maxRetries}) {
            // Check for RetryableError with custom delay
            let delay = calculateBackoff(attempt, "${backoffPolicy}", "${baseDelay}");
            
            if (error.name === 'RetryableError' && error.retryAfterMs) {
                delay = error.retryAfterMs;
                console.log(\`[${stepName}] RetryableError requested custom delay: \${delay}ms\`);
            } else {
                console.log(\`[${stepName}] Retrying after \${delay}ms...\`);
            }
            
            await sleep(delay + "ms");
          }
        }
      }
      
      ${failureAction === 'retry'
      ? `if (!success) {
        throw new Error(\`Max retries (${maxRetries}) exceeded for ${stepName}: \${lastError?.message}\`);
      }`
      : ''}
      
      ${failureAction === 'ignore'
      ? `if (!success) {
        console.warn(\`[${stepName}] All retries failed, ignoring error:\`, lastError?.message);
      }`
      : ''}
    }`;
}

function processString(str: string): string {
  // Replace {{SECRET_NAME}} with ${getSecret("SECRET_NAME")}
  // And wrap in backticks
  const processed = str.replace(/\{\{([^}]+)\}\}/g, (_, secretName) => {
    return `\${getSecret("${secretName.trim()}")}`;
  });
  return `\`${processed}\``;
}

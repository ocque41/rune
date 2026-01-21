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
export const makeHttpRequest = async (params: { method: string; url: string; headers: any; body: any; idempotencyKey?: string; mockResponse?: any }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  
  console.log("[HTTP Request] Method:", params.method, "URL:", params.url);
  console.log("[HTTP Request] Idempotency Key:", params.idempotencyKey);
  console.log("[HTTP Request] Mode:", isSandbox ? 'sandbox' : 'live');
  
  // In sandbox mode, return mock response without making real request
  if (isSandbox && !process.env.RUNE_ALLOW_REAL_HTTP) {
    console.log("[HTTP Request] Returning mock response (sandbox mode)");
    return {
      ok: true,
      status: 200,
      statusText: 'OK (Mocked)',
      data: params.mockResponse || { simulated: true, message: 'Mock response from sandbox mode', url: params.url },
      timing: { durationMs: 0 },
      mocked: true
    };
  }
  
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const response = await fetch(params.url, {
      method: params.method,
      headers: params.headers,
      body: params.method !== 'GET' && params.method !== 'HEAD' ? JSON.stringify(params.body) : undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json().catch(() => ({}));
    } else {
      data = await response.text().catch(() => '');
    }
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
      timing: { durationMs },
      mocked: false
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error("[HTTP Request] Error:", error.message);
    
    // Determine if error is retryable
    const isRetryable = error.name === 'AbortError' || 
                        error.code === 'ECONNRESET' || 
                        error.code === 'ETIMEDOUT' ||
                        error.code === 'ENOTFOUND';
    
    if (isRetryable) {
      throw new RetryableError(error.message);
    }
    throw error;
  }
};`;

  // Add reusable Send Email step
  const emailStepDefinition = `
export const sendEmail = async (params: { recipient: string; subject: string; body: string; from?: string; idempotencyKey?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  const hasEmailConfig = !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.SENDGRID_API_KEY);
  
  console.log("[Send Email] To:", params.recipient);
  console.log("[Send Email] Subject:", params.subject);
  console.log("[Send Email] Idempotency Key:", params.idempotencyKey);
  console.log("[Send Email] Mode:", isSandbox ? 'sandbox' : 'live');
  console.log("[Send Email] Email Provider Configured:", hasEmailConfig);
  
  // In sandbox mode or without email config, log and return mock
  if (isSandbox || !hasEmailConfig) {
    console.log("[Send Email] Body:", params.body);
    console.log("[Send Email] Email logged (not sent - " + (isSandbox ? 'sandbox mode' : 'no provider configured') + ")");
    return {
      ok: true,
      status: 'mocked',
      messageId: \`mock-\${Date.now()}\`,
      recipient: params.recipient,
      note: isSandbox ? 'Sandbox mode - email logged only' : 'No email provider configured'
    };
  }
  
  // Real email sending would go here
  // For now, we use Resend if available
  try {
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${process.env.RESEND_API_KEY}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: params.from || 'onboarding@resend.dev',
          to: params.recipient,
          subject: params.subject,
          html: params.body,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(\`Resend API error: \${error}\`);
      }
      
      const result = await response.json();
      return {
        ok: true,
        status: 'sent',
        messageId: result.id,
        recipient: params.recipient
      };
    }
    
    // Fallback to logging
    console.log("[Send Email] No supported provider, email logged only");
    return {
      ok: true,
      status: 'mocked',
      messageId: \`mock-\${Date.now()}\`,
      recipient: params.recipient,
      note: 'Email provider not implemented'
    };
  } catch (error: any) {
    console.error("[Send Email] Error:", error.message);
    throw error;
  }
};`;

  // Add reusable Database Query steps - one for each database type
  // NOTE: Users must install the appropriate database client library:
  // - PostgreSQL: npm install pg @types/pg
  // - MySQL: npm install mysql2
  // - MongoDB: npm install mongodb

  const postgresStepDefinition = `
export const queryPostgres = async (params: { connectionString: string; query: string; idempotencyKey?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  
  console.log("[PostgreSQL] Executing Query");
  console.log("[PostgreSQL] Idempotency Key:", params.idempotencyKey);
  console.log("[PostgreSQL] Mode:", isSandbox ? 'sandbox' : 'live');
  
  // Validate configuration
  if (!params.connectionString) {
    console.warn("[PostgreSQL] No connection string provided");
    return {
      ok: false,
      status: 'not_configured',
      error: 'Database connection string not provided',
      query: params.query
    };
  }
  
  // In sandbox mode, return mock data
  if (isSandbox) {
    console.log("[PostgreSQL] Returning mock data (sandbox mode)");
    console.log("[PostgreSQL] Query:", params.query);
    return {
      ok: true,
      status: 'success',
      rows: [{ id: 1, mock: true, message: 'Sandbox mock data' }],
      rowCount: 1,
      mocked: true
    };
  }
  
  // NOTE: Requires 'pg' package - install with: npm install pg @types/pg
  try {
    const { Client } = await import('pg');
    const client = new Client({ connectionString: params.connectionString });
    
    await client.connect();
    try {
      const result = await client.query(params.query);
      return { ok: true, status: 'success', rows: result.rows, rowCount: result.rowCount };
    } finally {
      await client.end();
    }
  } catch (error: any) {
    console.error("[PostgreSQL] Error:", error.message);
    return {
      ok: false,
      status: 'error',
      error: error.message,
      query: params.query
    };
  }
};`;

  const mysqlStepDefinition = `
export const queryMysql = async (params: { connectionString: string; query: string; idempotencyKey?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  
  console.log("[MySQL] Executing Query");
  console.log("[MySQL] Idempotency Key:", params.idempotencyKey);
  console.log("[MySQL] Mode:", isSandbox ? 'sandbox' : 'live');
  
  if (!params.connectionString) {
    console.warn("[MySQL] No connection string provided");
    return {
      ok: false,
      status: 'not_configured',
      error: 'Database connection string not provided',
      query: params.query
    };
  }
  
  if (isSandbox) {
    console.log("[MySQL] Returning mock data (sandbox mode)");
    console.log("[MySQL] Query:", params.query);
    return {
      ok: true,
      status: 'success',
      rows: [{ id: 1, mock: true, message: 'Sandbox mock data' }],
      rowCount: 1,
      mocked: true
    };
  }
  
  try {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection(params.connectionString);
    
    try {
      const [rows] = await connection.execute(params.query);
      return { ok: true, status: 'success', rows, rowCount: Array.isArray(rows) ? rows.length : 0 };
    } finally {
      await connection.end();
    }
  } catch (error: any) {
    console.error("[MySQL] Error:", error.message);
    return {
      ok: false,
      status: 'error',
      error: error.message,
      query: params.query
    };
  }
};`;

  const mongodbStepDefinition = `
export const queryMongodb = async (params: { connectionString: string; operation: string; idempotencyKey?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  
  console.log("[MongoDB] Executing Operation");
  console.log("[MongoDB] Idempotency Key:", params.idempotencyKey);
  console.log("[MongoDB] Mode:", isSandbox ? 'sandbox' : 'live');
  
  if (!params.connectionString) {
    console.warn("[MongoDB] No connection string provided");
    return {
      ok: false,
      status: 'not_configured',
      error: 'Database connection string not provided',
      operation: params.operation
    };
  }
  
  let opConfig;
  try {
    opConfig = JSON.parse(params.operation);
  } catch (e) {
    return {
      ok: false,
      status: 'error',
      error: 'Invalid operation JSON',
      operation: params.operation
    };
  }
  
  if (isSandbox) {
    console.log("[MongoDB] Returning mock data (sandbox mode)");
    console.log("[MongoDB] Operation:", opConfig);
    return {
      ok: true,
      status: 'success',
      result: opConfig.operation === 'find' ? [{ _id: '1', mock: true }] : { acknowledged: true },
      mocked: true
    };
  }
  
  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(params.connectionString);
    
    await client.connect();
    try {
      const db = client.db();
      const collection = db.collection(opConfig.collection || 'default');
      
      let result;
      switch (opConfig.operation) {
        case 'find':
          result = await collection.find(opConfig.query || {}, opConfig.options || {}).toArray();
          break;
        case 'findOne':
          result = await collection.findOne(opConfig.query || {}, opConfig.options || {});
          break;
        case 'insertOne':
          result = await collection.insertOne(opConfig.document);
          break;
        case 'insertMany':
          result = await collection.insertMany(opConfig.documents);
          break;
        case 'updateOne':
          result = await collection.updateOne(opConfig.filter, opConfig.update, opConfig.options);
          break;
        case 'updateMany':
          result = await collection.updateMany(opConfig.filter, opConfig.update, opConfig.options);
          break;
        case 'deleteOne':
          result = await collection.deleteOne(opConfig.filter);
          break;
        case 'deleteMany':
          result = await collection.deleteMany(opConfig.filter);
          break;
        default:
          throw new Error(\`Unsupported MongoDB operation: \${opConfig.operation}\`);
      }
      
      return { ok: true, status: 'success', result };
    } finally {
      await client.close();
    }
  } catch (error: any) {
    console.error("[MongoDB] Error:", error.message);
    return {
      ok: false,
      status: 'error',
      error: error.message,
      operation: params.operation
    };
  }
};`;

  const genericDbStepDefinition = `
export const queryGeneric = async (params: { connectionString: string; query: string; idempotencyKey?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  
  console.log("[Generic DB] Executing Query");
  console.log("[Generic DB] Idempotency Key:", params.idempotencyKey);
  console.log("[Generic DB] Mode:", isSandbox ? 'sandbox' : 'live');
  console.log("[Generic DB] Query:", params.query);
  
  // Generic DB always returns mock data or not_configured
  // Users should replace this with their specific database client code
  if (!params.connectionString) {
    return {
      ok: false,
      status: 'not_configured',
      error: 'Database connection string not provided',
      query: params.query,
      note: 'Generic database type - implement your own database logic'
    };
  }
  
  console.warn("[Generic DB] No implementation - returning mock data");
  return {
    ok: true,
    status: 'success',
    rows: [{ id: 1, mock: true, message: 'Generic DB placeholder' }],
    rowCount: 1,
    mocked: true,
    note: 'Generic database type - implement your own database logic'
  };
};`;

  // Add reusable Run Script step
  const scriptStepDefinition = `
export const runScript = async (params: { code: string; context: any; timeoutMs?: number }) => {
  "use step";
  const MAX_EXECUTION_TIME = params.timeoutMs || 10000; // 10 second default
  
  console.log("[Script] Running custom script");
  console.log("[Script] Timeout:", MAX_EXECUTION_TIME + "ms");
  
  const startTime = Date.now();
  
  try {
    // Create a function from the user code
    // We pass 'params' as an argument to the function
    const userFunction = new Function('params', params.code);
    
    // Execute with a simple timeout check (note: this doesn't truly limit execution time
    // for synchronous code, but provides a baseline)
    const result = userFunction(params.context);
    
    const durationMs = Date.now() - startTime;
    console.log("[Script] Completed in", durationMs + "ms");
    
    return {
      ok: true,
      status: 'success',
      result,
      timing: { durationMs }
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error("[Script] Execution failed:", error.message);
    
    return {
      ok: false,
      status: 'error',
      error: error.message,
      timing: { durationMs }
    };
  }
};`;

  // Add reusable Slack Message step
  const slackStepDefinition = `
export const sendSlackMessage = async (params: { webhookUrl: string; channel?: string; message: string; idempotencyKey?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  const envWebhook = process.env.SLACK_WEBHOOK_URL;
  const webhookUrl = params.webhookUrl || envWebhook;
  
  console.log("[Slack] Sending message");
  console.log("[Slack] Idempotency Key:", params.idempotencyKey);
  console.log("[Slack] Mode:", isSandbox ? 'sandbox' : 'live');
  console.log("[Slack] Channel:", params.channel || '(default)');
  console.log("[Slack] Message:", params.message);
  
  if (!webhookUrl) {
    console.warn("[Slack] No webhook URL configured");
    return {
      ok: false,
      status: 'not_configured',
      error: 'Slack webhook URL not provided. Set SLACK_WEBHOOK_URL env var or configure in node.',
      channel: params.channel
    };
  }
  
  if (isSandbox) {
    console.log("[Slack] Message logged (sandbox mode - not sent)");
    return {
      ok: true,
      status: 'mocked',
      channel: params.channel,
      message: params.message,
      note: 'Sandbox mode - message logged only'
    };
  }
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.message,
        channel: params.channel
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(\`Slack API error: \${error}\`);
    }
    
    return {
      ok: true,
      status: 'sent',
      channel: params.channel
    };
  } catch (error: any) {
    console.error("[Slack] Error:", error.message);
    return {
      ok: false,
      status: 'error',
      error: error.message,
      channel: params.channel
    };
  }
};`;

  // Add reusable Stream step
  const streamStepDefinition = `
export const streamUpdate = async (params: { message: string; runId?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  
  console.log("[Stream] Sending update:", params.message);
  console.log("[Stream] Mode:", isSandbox ? 'sandbox' : 'live');
  
  try {
    const writable = getWritable();
    if (writable) {
      const writer = writable.getWriter();
      await writer.write(new TextEncoder().encode(JSON.stringify({
        type: 'stream',
        message: params.message,
        timestamp: Date.now(),
        runId: params.runId
      }) + "\\n"));
      writer.releaseLock();
      return { 
        ok: true, 
        status: 'streamed', 
        message: params.message,
        timestamp: Date.now()
      };
    } else {
      console.log("[Stream] No writable stream available, logging only");
      return {
        ok: true,
        status: 'logged',
        message: params.message,
        note: 'No writable stream - message logged to console only'
      };
    }
  } catch (error: any) {
    console.error("[Stream] Error:", error.message);
    return {
      ok: false,
      status: 'error',
      error: error.message,
      message: params.message
    };
  }
};`;

  // Add reusable Wait for Event step
  const waitStepDefinition = `
export const waitForEvent = async (params: { event: string; timeout?: string; runId?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  
  console.log("[Wait for Event] Event:", params.event);
  console.log("[Wait for Event] Timeout:", params.timeout || 'none');
  console.log("[Wait for Event] Mode:", isSandbox ? 'sandbox' : 'live');
  
  // In sandbox mode, return immediately with simulated event data
  if (isSandbox) {
    console.log("[Wait for Event] Returning simulated event (sandbox mode)");
    return {
      ok: true,
      status: 'received',
      event: params.event,
      data: { simulated: true, timestamp: Date.now() },
      mocked: true
    };
  }
  
  // Real execution uses resumeHook from workflow library
  try {
    const result = await resumeHook(params.event);
    return {
      ok: true,
      status: 'received',
      event: params.event,
      data: result,
      receivedAt: new Date().toISOString()
    };
  } catch (error: any) {
    console.error("[Wait for Event] Error:", error.message);
    return {
      ok: false,
      status: error.message.includes('timeout') ? 'timeout' : 'error',
      event: params.event,
      error: error.message
    };
  }
};`;

  // Add reusable Approval step
  const approvalStepDefinition = `
export const waitForApproval = async (params: { approverEmail: string; timeout?: string; message?: string; runId?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  const eventName = \`approval-\${params.approverEmail}\`;
  
  console.log("[Approval] Requesting approval from:", params.approverEmail);
  console.log("[Approval] Timeout:", params.timeout || '24h default');
  console.log("[Approval] Mode:", isSandbox ? 'sandbox' : 'live');
  
  // In sandbox mode, auto-approve immediately
  if (isSandbox) {
    console.log("[Approval] Auto-approved (sandbox mode)");
    return {
      ok: true,
      status: 'approved',
      approver: params.approverEmail,
      respondedAt: new Date().toISOString(),
      mocked: true,
      note: 'Auto-approved in sandbox mode'
    };
  }
  
  // Real execution: wait for external approval callback via resume API
  try {
    const result = await resumeHook(eventName);
    return {
      ok: true,
      status: result.approved ? 'approved' : 'rejected',
      approver: params.approverEmail,
      respondedAt: new Date().toISOString(),
      reason: result.reason
    };
  } catch (error: any) {
    console.error("[Approval] Error:", error.message);
    return {
      ok: false,
      status: error.message.includes('timeout') ? 'timeout' : 'error',
      approver: params.approverEmail,
      error: error.message
    };
  }
};`;

  // Add reusable AI step
  const aiStepDefinition = `
export const generateContent = async (params: { prompt: string; model?: string; provider?: string; maxTokens?: number }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  const provider = params.provider || 'openai';
  const model = params.model || (provider === 'openai' ? 'gpt-4o' : provider === 'gemini' ? 'gemini-2.0-flash' : 'default');
  
  console.log("[AI] Generating content");
  console.log("[AI] Provider:", provider);
  console.log("[AI] Model:", model);
  console.log("[AI] Prompt length:", params.prompt?.length || 0, "chars");
  console.log("[AI] Mode:", isSandbox ? 'sandbox' : 'live');
  
  // Check for API keys
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  
  // In sandbox mode or without API keys, return mock
  if (isSandbox || (provider === 'openai' && !openaiKey) || (provider === 'gemini' && !geminiKey)) {
    console.log("[AI] Returning mock response", isSandbox ? '(sandbox mode)' : '(no API key)');
    return {
      ok: true,
      status: 'mocked',
      content: \`[Mock AI Response] This is a simulated response for prompt: "\${params.prompt?.substring(0, 50)}..."\`,
      model,
      provider,
      mocked: true,
      note: isSandbox ? 'Sandbox mode' : 'API key not configured'
    };
  }
  
  try {
    if (provider === 'openai' && openaiKey) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': \`Bearer \${openaiKey}\`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: params.prompt }],
          max_tokens: params.maxTokens || 1000,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(\`OpenAI API error: \${error}\`);
      }
      
      const data = await response.json();
      return {
        ok: true,
        status: 'success',
        content: data.choices?.[0]?.message?.content || '',
        model,
        provider,
        usage: data.usage
      };
    }
    
    if (provider === 'gemini' && geminiKey) {
      // Use v1beta for new models like gemini-2.0-flash
      const modelName = model;
      const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/\${modelName}:generateContent?key=\${geminiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: params.prompt }] }],
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(\`Gemini API error: \${error}\`);
      }
      
      const data = await response.json();
      return {
        ok: true,
        status: 'success',
        content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        model: modelName,
        provider
      };
    }
    
    // Fallback mock for unknown providers
    return {
      ok: true,
      status: 'mocked',
      content: \`[Mock] Provider \${provider} not implemented\`,
      model,
      provider,
      mocked: true
    };
  } catch (error: any) {
    console.error("[AI] Error:", error.message);
    return {
      ok: false,
      status: 'error',
      error: error.message,
      model,
      provider
    };
  }
};`;

  // Add reusable Transform step
  const transformStepDefinition = `
export const transformData = async (params: { mapping: string; data: any }) => {
  "use step";
  const startTime = Date.now();
  
  console.log("[Transform] Executing transformation");
  console.log("[Transform] Input data type:", typeof params.data);
  
  try {
    const transformFn = new Function('params', params.mapping);
    const result = transformFn(params.data);
    const durationMs = Date.now() - startTime;
    
    console.log("[Transform] Completed in", durationMs + "ms");
    
    return {
      ok: true,
      status: 'success',
      result,
      timing: { durationMs }
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    console.error("[Transform] Error:", error.message);
    
    return {
      ok: false,
      status: 'error',
      error: error.message,
      timing: { durationMs }
    };
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
}

${generateScheduleConfig(nodes)}`;

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

  return `${imports}\n${subWorkflowImports}\n${helperFunctions}\n${stepDefinitions}\n${httpStepDefinition}\n${emailStepDefinition}\n${postgresStepDefinition}\n${mysqlStepDefinition}\n${mongodbStepDefinition}\n${genericDbStepDefinition}\n${scriptStepDefinition}\n${slackStepDefinition}\n${streamStepDefinition}\n${waitStepDefinition}\n${approvalStepDefinition}\n${aiStepDefinition}\n${transformStepDefinition}\n${workflowDefinition}`;
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

    // Handle AI Node
    if (currentNode.type === 'ai') {
      const config = (currentNode.data as any).aiConfig || {};
      const prompt = config.promptTemplate || (currentNode.data as any).prompt || '';
      const model = config.model || (currentNode.data as any).model || 'gpt-4o';
      const provider = config.provider || 'generic';

      const nextEdge = edges.find(e => e.source === currentId);
      const nextCode = nextEdge ? generateNodeCall(nodes.find(n => n.id === nextEdge.target)!) + traverseGraph(nextEdge.target, nodes, edges, visited) : '';

      return `\n    const aiResult = await generateContent({ 
        prompt: \`${prompt.replace(/`/g, '\\`')}\`, 
        model: "${model}",
        provider: "${provider}"
    });\n    ${nextCode}`;
    }
  }

  // Handle Transform Node
  if (currentNode.type === 'transform') {
    const mapping = (currentNode.data as any).mapping || 'return params;';

    const nextEdge = edges.find(e => e.source === currentId);
    const nextCode = nextEdge ? generateNodeCall(nodes.find(n => n.id === nextEdge.target)!) + traverseGraph(nextEdge.target, nodes, edges, visited) : '';

    // Handle Transform Node
    if (currentNode.type === 'transform') {
      const config = (currentNode.data as any).transformConfig || {};
      const mapping = config.expression || (currentNode.data as any).mapping || 'return params;';

      const nextEdge = edges.find(e => e.source === currentId);
      const nextCode = nextEdge ? generateNodeCall(nodes.find(n => n.id === nextEdge.target)!) + traverseGraph(nextEdge.target, nodes, edges, visited) : '';

      return `\n    const transformResult = await transformData({ mapping: \`${mapping.replace(/`/g, '\\`')}\`, data: params });\n    ${nextCode}`;
    }
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
    const dbType = config.dbType || 'postgres'; // Default to postgres for backward compatibility
    const connectionString = config.connectionString || '';
    const query = config.query || 'SELECT 1';
    const errorConfig = (node.data as any).errorConfig;

    // Select the appropriate database function based on type
    let functionName = 'queryPostgres';
    let paramName = 'query';

    if (dbType === 'mysql') {
      functionName = 'queryMysql';
    } else if (dbType === 'mongodb') {
      functionName = 'queryMongodb';
      paramName = 'operation'; // MongoDB uses 'operation' instead of 'query'
    } else if (dbType === 'generic') {
      functionName = 'queryGeneric';
    }

    const stepCode = `await ${functionName}({ 
        connectionString: ${processString(connectionString)}, 
        ${paramName}: ${processString(query)},
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

function generateScheduleConfig(nodes: Node[]): string {
  const scheduleNode = nodes.find(n => n.type === 'schedule' || n.data.label === 'Schedule');
  if (scheduleNode) {
    const config = (scheduleNode.data as any).scheduleConfig || {};
    const cron = config.cronExpression || '*/5 * * * *';
    return `
export const config = {
  schedule: "${cron}"
};`;
  }
  return '';
}

export function generateWebhookHandler(endpointSlug: string, workflowId: string): string {
  return `
import { serve } from "workflow/next";
import { ${workflowId} } from "@/workflows/${workflowId}";

export const { POST } = serve({
  workflow: ${workflowId},
  trigger: "webhook",
  config: {
    slug: "${endpointSlug}"
  }
});`;
}

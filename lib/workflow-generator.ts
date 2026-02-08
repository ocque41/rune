import { Node, Edge } from '@xyflow/react';
import fs from 'fs/promises';
import path from 'path';
// Import versioning utilities
import { generateVersionId, saveWorkflowVersion, updateWorkflowMetadata } from './workflow-versioning';

export function generateWorkflowCode(workflowId: string, nodes: Node[], edges: Edge[]): string {
  const usedStepFunctions = new Set<string>();
  const usedImports = new Set<string>();
  const usedHelperFunctions = new Set<string>();

  usedImports.add(`import { sleep, resumeHook, createHook, getSecret } from "workflow";`);
  usedImports.add(`import { getStreamWritable } from '@/lib/workflow/runtime/streams';`);

  // Collect unique Sub-Workflow IDs
  const subWorkflowIds = Array.from(new Set(
    nodes
      .filter(n => n.data.label === 'Sub-Workflow' || n.type === 'subWorkflow' || n.type === 'batchProcess') // Added n.type === 'batchProcess'
      .map(n => (n.data as any).workflowId)
      .filter(Boolean)
  ));

  const subWorkflowImports = subWorkflowIds
    .map(id => `import { ${id} } from "./workflows/${id}";`)
    .join('\n');

  // 1. Identify Steps and Configuration (declarations will be gathered dynamically)
  const usedGenericStepFunctions = new Set<string>();

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
export const generateContent = async (params: { prompt: string; model?: string; provider?: string; maxTokens?: number; thinkingLevel?: string }) => {
  "use step";
  const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
  const provider = params.provider || 'openai';
  const model = params.model || (provider === 'gemini' ? 'gemini-3-flash-preview' : 'default');
  
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
    if (provider === 'gemini' && geminiKey) {
      // Use v1beta for new models like gemini-2.0-flash and gemini-3
      const modelName = model;
      
      // Construct request body
      const requestBody: any = {
        contents: [{ parts: [{ text: params.prompt }] }],
      };

      // Add thinking config for Gemini 3 models
      if (modelName.includes('gemini-3') && params.thinkingLevel) {
          requestBody.generationConfig = {
              thinkingConfig: {
                  thinkingLevel: params.thinkingLevel
              }
          };
      }

      const response = await fetch(\`https://generativelanguage.googleapis.com/v1beta/models/\${modelName}:generateContent?key=\${geminiKey}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
export const transformData = async (params: { mapping: string; transformType: 'javascript' | 'jsonata'; data: any }) => {
  "use step";
  const startTime = Date.now();
  
  console.log("[Transform] Executing transformation (" + params.transformType + ")");
  console.log("[Transform] Input data type:", typeof params.data);
  
  try {
    let result;
    if (params.transformType === 'jsonata') {
        const expression = jsonata(params.mapping);
        result = await expression.evaluate(params.data);
    } else { // 'javascript'
        const transformFn = new Function('params', params.mapping);
        result = transformFn(params.data);
    }
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

  // Add reusable Custom Code step
  const customCodeStepDefinition = `
export const executeCustomCode = async (params: { 
    language: string; 
    code: string; 
    entrypoint: string; 
    input: any; 
    timeoutMs: number; 
    dependencies: string; 
    envVars: string; 
}, runId: string, nodeId: string, outputMapping: string) => {
    "use step";
    const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
    const executionServiceUrl = process.env.CUSTOM_CODE_EXEC_SERVICE_URL || '/api/rune/execute-custom-code';

    console.log("[Custom Code] Executing with language:", params.language);
    console.log("[Custom Code] Entrypoint:", params.entrypoint);
    console.log("[Custom Code] Input type:", typeof params.input);
    console.log("[Custom Code] Timeout:", params.timeoutMs + "ms");
    console.log("[Custom Code] Mode:", isSandbox ? 'sandbox' : 'live');

    if (isSandbox) {
        console.log("[Custom Code] Returning mock response in sandbox mode.");
        return {
            ok: true,
            status: 'mocked',
            result: \`Mock result for \${params.language} code\`,
            logs: ["Simulated execution in sandbox"],
            mocked: true
        };
    }

    try {
        const response = await fetch(executionServiceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Rune-Run-Id': runId,
                'X-Rune-Node-Id': nodeId,
            },
            body: JSON.stringify({
                language: params.language,
                code: params.code,
                entrypoint: params.entrypoint,
                input: params.input,
                timeoutMs: params.timeoutMs,
                dependencies: JSON.parse(params.dependencies),
                envVars: JSON.parse(params.envVars),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error from execution service' }));
            throw new Error(\`Custom Code execution failed: \${errorData.error || errorData.message}\`);
        }

        const result = await response.json();

        let finalResult = result.result;
        // Apply output mapping if provided
        if (outputMapping) {
            try {
                // The output mapping function receives 'scriptResult' (from the external service)
                // and 'workflowParams' (the original params passed to this step function).
                // It should return the value to be used as the node's output.
                const mapFn = new Function('scriptResult', 'workflowParams', \`return (\${outputMapping})\`);
                finalResult = mapFn(result.result, params.input); 
            } catch (mapError: any) {
                console.warn("[Custom Code Node] Failed to apply output mapping:", mapError.message);
                // Fallback to raw result if mapping fails
            }
        }
        return finalResult;

    } catch (error: any) {
        console.error("[Custom Code Node] Execution Service Error:", error.message);
        throw error;
    }
};`;

  // Add reusable Data Validation step
  const dataValidationStepDefinition = `
export const validateData = async (params: { schema: string; dataPath: string; onFailure: 'failWorkflow' | 'passThrough' | 'routeToError'; workflowParams: any }) => {
    "use step";
    const startTime = Date.now();
    
    console.log("[Data Validation] Executing validation for dataPath:", params.dataPath);
    
    try {
        const ajv = new Ajv();
        // Add a resolver to handle dynamic schema references if needed.
        // For simplicity, assuming a self-contained schema for now.
        const validate = ajv.compile(JSON.parse(params.schema));
        
        let dataToValidate = params.workflowParams; // Start with full params
        // Traverse dataPath to get the target data
        try {
            const dataPathSegments = params.dataPath.split('.');
            // Remove 'params' from segments if it's the first one
            if (dataPathSegments[0] === 'params') {
                dataPathSegments.shift();
            }
            for (const segment of dataPathSegments) {
                if (dataToValidate && typeof dataToValidate === 'object' && segment in dataToValidate) {
                    dataToValidate = dataToValidate[segment];
                } else {
                    dataToValidate = undefined; // Path not found
                    break;
                }
            }
        } catch (e) {
            console.warn("[Data Validation] Error traversing dataPath:", e);
            dataToValidate = undefined; // Treat as not found
        }
        
        const isValid = validate(dataToValidate);
        
        const durationMs = Date.now() - startTime;
        console.log("[Data Validation] Completed in", durationMs + "ms. Is Valid:", isValid);
        
        return {
            ok: isValid,
            status: isValid ? 'success' : 'failed',
            isValid: isValid,
            errors: validate.errors || [],
            validatedData: dataToValidate,
            onFailureStrategy: params.onFailure,
            timing: { durationMs }
        };
    } catch (error: any) {
        const durationMs = Date.now() - startTime;
        console.error("[Data Validation] Error during validation setup:", error.message);
        return {
            ok: false,
            status: 'error',
            isValid: false,
            errors: [{ message: \`Validation setup error: \${error.message}\` }],
            onFailureStrategy: params.onFailure,
            timing: { durationMs }
        };
    }
};`;

  // Add reusable Twilio Message step
  const twilioMessageStepDefinition = `
export const sendTwilioMessage = async (params: { 
    fromPhoneNumber: string; 
    toPhoneNumber: string; 
    messageBody: string; 
    accountSidSecretName: string; 
    authTokenSecretName: string; 
}) => {
    "use step";
    const isSandbox = process.env.RUNE_WORKFLOW_MODE === 'sandbox' || (process.env.NODE_ENV !== 'production' && !process.env.RUNE_WORKFLOW_MODE);
    
    console.log("[Twilio] Sending message from:", params.fromPhoneNumber, "to:", params.toPhoneNumber);
    console.log("[Twilio] Message body length:", params.messageBody.length);
    console.log("[Twilio] Mode:", isSandbox ? 'sandbox' : 'live');

    const accountSid = await getSecret(params.accountSidSecretName);
    const authToken = await getSecret(params.authTokenSecretName);

    if (!accountSid || !authToken) {
        throw new Error("Twilio Account SID or Auth Token secret not found.");
    }

    if (isSandbox) {
        console.log("[Twilio] Simulating SMS send in sandbox mode.");
        return { 
            ok: true, 
            status: 'mocked', 
            message: 'Simulated Twilio SMS sent.',
            from: params.fromPhoneNumber,
            to: params.toPhoneNumber,
            body: params.messageBody,
            mocked: true
        };
    }

    try {
        const client = twilio(accountSid, authToken);
        const message = await client.messages.create({
            to: params.toPhoneNumber,
            from: params.fromPhoneNumber,
            body: params.messageBody,
        });
        console.log("[Twilio] SMS sent successfully:", message.sid);
        return { 
            ok: true, 
            status: 'sent', 
            messageSid: message.sid,
            from: params.fromPhoneNumber,
            to: params.toPhoneNumber,
        };
    } catch (error: any) {
        console.error("[Twilio] Failed to send SMS:", error.message);
        throw error;
    }
};`;


  // 2. Build Workflow Logic
  const startNode = nodes.find((n) => n.data.label === 'Start Workflow');
  let workflowBody = '';

  if (startNode) {
    workflowBody = traverseGraph(startNode.id, nodes, edges, new Set(), 'runId', usedStepFunctions, usedImports, usedHelperFunctions);
  }

  const getWorkflowDefinitionContent = (body: string, scheduleConfig: string) => `async function workflow(params: { runId: string; [key: string]: any }) {
  "use workflow";
  const { runId } = params; // Extract runId
  ${body}
  return { result: "Workflow completed" };
}

${scheduleConfig}`;

const workflowDefinition = getWorkflowDefinitionContent(workflowBody, generateScheduleConfig(nodes));

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

  let finalImports = Array.from(usedImports).join('\n');
  
  // Conditionally add specific step definitions
  let finalStepDefinitions = Array.from(usedGenericStepFunctions)
    .map((functionName) => `
export const ${functionName} = async (params: any) => {
  "use step";
  console.log("Running step: ${functionName}", params);
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { status: "success", step: "${functionName}" };
};`)
    .join('\n');

  if (usedStepFunctions.has('makeHttpRequest')) finalStepDefinitions += `\n${httpStepDefinition}`;
  if (usedStepFunctions.has('sendEmail')) finalStepDefinitions += `\n${emailStepDefinition}`;
  if (usedStepFunctions.has('queryPostgres')) finalStepDefinitions += `\n${postgresStepDefinition}`;
  if (usedStepFunctions.has('queryMysql')) finalStepDefinitions += `\n${mysqlStepDefinition}`;
  if (usedStepFunctions.has('queryMongodb')) finalStepDefinitions += `\n${mongodbStepDefinition}`;
  if (usedStepFunctions.has('queryGeneric')) finalStepDefinitions += `\n${genericDbStepDefinition}`;
  if (usedStepFunctions.has('runScript')) finalStepDefinitions += `\n${scriptStepDefinition}`;
  if (usedStepFunctions.has('sendSlackMessage')) finalStepDefinitions += `\n${slackStepDefinition}`;
  if (usedStepFunctions.has('streamUpdate')) finalStepDefinitions += `\n${streamStepDefinition}`;
  if (usedStepFunctions.has('waitForEvent')) finalStepDefinitions += `\n${waitStepDefinition}`;
  if (usedStepFunctions.has('waitForApproval')) finalStepDefinitions += `\n${approvalStepDefinition}`;
  if (usedStepFunctions.has('generateContent')) finalStepDefinitions += `\n${aiStepDefinition}`;
  if (usedStepFunctions.has('transformData')) finalStepDefinitions += `\n${transformStepDefinition}`;
  if (usedStepFunctions.has('executeCustomCode')) finalStepDefinitions += `\n${customCodeStepDefinition}`;
  if (usedStepFunctions.has('validateData')) finalStepDefinitions += `\n${dataValidationStepDefinition}`;
  if (usedStepFunctions.has('sendTwilioMessage')) finalStepDefinitions += `\n${twilioMessageStepDefinition}`;

  // Conditionally add helper functions
  let finalHelperFunctions = '';
  if (usedHelperFunctions.has('wrapWithRetry')) {
    finalHelperFunctions += `\n${helperFunctions}`; // Assuming helperFunctions contains all retry helpers
  }


  return `${finalImports}\n${subWorkflowImports}\n${finalHelperFunctions}\n${finalStepDefinitions}\nexport ${getWorkflowDefinitionContent(workflowBody, generateScheduleConfig(nodes))}`;
}

function traverseGraph(
  currentId: string,
  nodes: Node[],
  edges: Edge[],
  visited: Set<string>,
  runId: string,
  usedStepFunctions: Set<string>,
  usedImports: Set<string>,
  usedHelperFunctions: Set<string>
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
    const trueCode = trueEdge && trueNode ? generateNodeCall(trueNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(trueEdge.target, nodes, edges, new Set(visited), runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    // Find False branch
    const falseEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'false');
    const falseNode = nodes.find(n => n.id === falseEdge?.target);
    const falseCode = falseEdge && falseNode ? generateNodeCall(falseNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(falseEdge.target, nodes, edges, new Set(visited), runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    return `\n    if (${condition}) {\n      ${trueCode}\n    } else {\n      ${falseCode}\n    }`;
  }

  // Handle Loop Node
  if (currentNode.type === 'loop') {
    const items = (currentNode.data as any).items || '[]';

    // Find Body branch
    const bodyEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'body');
    const bodyCode = bodyEdge && bodyNode ? generateNodeCall(bodyNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(bodyEdge.target, nodes, edges, new Set(visited), runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    // Find Done branch
    const doneEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'done');
    const doneNode = nodes.find(n => n.id === doneEdge?.target);
    const doneCode = doneEdge && doneNode ? generateNodeCall(doneNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(doneEdge.target, nodes, edges, visited, runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    return `\n    for (const item of ${items}) {\n      ${bodyCode}\n    }\n    ${doneCode}`;
  }

  // Handle Parallel Node
  if (currentNode.type === 'parallel') {
    const branches = (currentNode.data as any).branches || 2;
    const branchPromises = [];

    // Generate code for each branch
    for (let i = 0; i < branches; i++) {
      const branchEdge = edges.find(e => e.source === currentId && e.sourceHandle === `branch-${i}`);
      const branchNode = nodes.find(n => n.id === branchEdge?.target);
      const branchCode = branchEdge && branchNode
        ? generateNodeCall(branchNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(branchEdge.target, nodes, edges, new Set(visited), runId, usedStepFunctions, usedImports, usedHelperFunctions)
        : '';

      branchPromises.push(`(async () => {\n      ${branchCode}\n    })()`);
    }

    // Find Merge/Continue branch
    const mergeEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'merge');
    const mergeNode = nodes.find(n => n.id === mergeEdge?.target);
    const mergeCode = mergeEdge && mergeNode
      ? generateNodeCall(mergeNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(mergeEdge.target, nodes, edges, visited, runId, usedStepFunctions, usedImports, usedHelperFunctions)
      : '';

    return `\n    await Promise.all([\n      ${branchPromises.join(',\n      ')}\n    ]);\n    ${mergeCode}`;
  }

  // Handle Batch Process Node
  if (currentNode.type === 'batchProcess') {
    const itemsVar = (currentNode.data as any).items || '[]'; // e.g., "params.data.list"
    const subWorkflowId = (currentNode.data as any).workflowId; // Name of the sub-workflow to call per item
    const concurrency = (currentNode.data as any).concurrency || 1; // Default to 1
    const outputAggregation = (currentNode.data as any).outputAggregation || 'array'; // Default to 'array'

    if (!subWorkflowId) {
      console.warn(`Batch Process node ${currentId} missing sub-workflow ID.`);
      return `\n    // Batch Process node ${currentId} skipped due to missing sub-workflow ID\n`;
    }
    usedStepFunctions.add(subWorkflowId); // Mark sub-workflow as used

    const doneEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'done');

    let batchCode = `\n    let batchItems = [];
    try {
        batchItems = JSON.parse(JSON.stringify(${itemsVar})); // Deep clone to avoid mutation
    } catch (e) {
        console.warn(\`Batch Process node ${currentId}: Could not parse itemsVar "\${itemsVar}". Using empty array. \`, e);
    }`;

    batchCode += `\n    const batchResults = [];`;

    if (concurrency > 1) {
      batchCode += `\n    const processPromises = batchItems.map(async (item) => {`;
      batchCode += `\n      return await ${subWorkflowId}({ ...params, item }); // Pass item and existing params to sub-workflow`;
      batchCode += `\n    });`;
      batchCode += `\n    const itemResults = await Promise.all(processPromises);`;
      batchCode += `\n    batchResults.push(...itemResults);`;
    } else {
      batchCode += `\n    for (const item of batchItems) {`;
      batchCode += `\n      const itemResult = await ${subWorkflowId}({ ...params, item }); // Pass item and existing params`;
      batchCode += `\n      batchResults.push(itemResult);`;
      batchCode += `\n    }`;
    }

    // Handle output aggregation
    batchCode += `\n    let aggregatedBatchResult;`;
    batchCode += `\n    switch ('${outputAggregation}') {`;
    batchCode += `\n      case 'sum':`;
    batchCode += `\n        aggregatedBatchResult = batchResults.reduce((acc, curr) => acc + (typeof curr === 'number' ? curr : 0), 0);`; // Basic sum, needs refinement for complex results
    batchCode += `\n        break;`;
    batchCode += `\n      case 'object':`;
    batchCode += `\n        aggregatedBatchResult = Object.assign({}, ...batchResults.filter(r => typeof r === 'object' && r !== null));`; // Merge objects
    batchCode += `\n        break;`;
    batchCode += `\n      case 'none':`;
    batchCode += `\n        aggregatedBatchResult = undefined;`;
    batchCode += `\n        break;`;
    batchCode += `\n      case 'array':`;
    batchCode += `\n      default:`;
    batchCode += `\n        aggregatedBatchResult = batchResults;`;
    batchCode += `\n        break;`;
    batchCode += `\n    }`;

    // Make the aggregated result available in the workflow context for subsequent nodes
    batchCode += `\n    Object.assign(params, { batchProcessResults: aggregatedBatchResult });`;


    const doneNode = nodes.find(n => n.id === doneEdge?.target);
    const doneCode = doneEdge && doneNode ? generateNodeCall(doneNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(doneEdge.target, nodes, edges, visited, runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    return `${batchCode}\n    // Continue after batch processing\n    ${doneCode}`;
  }

  // Handle Data Validation Node
  if (currentNode.type === 'dataValidation') {
    usedStepFunctions.add('validateData'); // Mark validateData as used
    usedImports.add(`import Ajv from 'ajv';`); // Mark Ajv import as used

    const config = (currentNode.data as any);
    const schema = (config.schema || '{}').replace(/`/g, '\\`'); // Escape backticks
    const dataPath = config.dataPath || 'params';
    const onFailure = config.onFailure || 'failWorkflow';

    const successEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'onSuccess');
    const failureEdge = edges.find(e => e.source === currentId && e.sourceHandle === 'onFailure');

    const successNode = nodes.find(n => n.id === successEdge?.target);
    const failureNode = nodes.find(n => n.id === failureEdge?.target);

    const successCode = successEdge && successNode ? generateNodeCall(successNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(successEdge.target, nodes, edges, new Set(visited), runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';
    const failureCode = failureEdge && failureNode ? generateNodeCall(failureNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(failureEdge.target, nodes, edges, new Set(visited), runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    return `\n    const validationResult = await validateData({
            schema: \`${schema}\`,
            dataPath: "${dataPath}",
            onFailure: "${onFailure}",
            workflowParams: params // Pass the entire workflow params
        });

        if (validationResult.isValid) {
            ${successCode}
        } else {
            console.warn("[Data Validation] Validation failed. Errors:", validationResult.errors);
            if (validationResult.onFailureStrategy === 'failWorkflow') {
                throw new Error("Data validation failed: " + JSON.stringify(validationResult.errors));
            } else if (validationResult.onFailureStrategy === 'routeToError') {
                ${failureCode}
            }
            // If 'passThrough' or no failure code, continue as success
            // Note: If passThrough, we still continue on the success path
            ${onFailure === 'passThrough' ? successCode : ''}
        }`;
  }

  // Handle Twilio Message Node
  if (currentNode.type === 'twilioMessage') {
    usedStepFunctions.add('sendTwilioMessage'); // Mark sendTwilioMessage as used
    usedImports.add(`import twilio from 'twilio';`); // Mark twilio import as used

    const config = (currentNode.data as any);
    const fromPhoneNumber = config.fromPhoneNumber || '';
    const toPhoneNumber = config.toPhoneNumber || '';
    const messageBody = config.messageBody || '';
    const accountSidSecretName = config.accountSidSecretName || 'TWILIO_ACCOUNT_SID';
    const authTokenSecretName = config.authTokenSecretName || 'TWILIO_AUTH_TOKEN';

    const nextEdge = edges.find(e => e.source === currentId);
    const nextNode = nodes.find(n => n.id === nextEdge?.target);
    const nextCode = nextEdge && nextNode ? generateNodeCall(nextNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(nextEdge.target, nodes, edges, visited, runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    return `\n    const twilioResult = await sendTwilioMessage({
        fromPhoneNumber: \`${processString(fromPhoneNumber)}\`,
        toPhoneNumber: \`${processString(toPhoneNumber)}\`,
        messageBody: \`${processString(messageBody)}\`,
        accountSidSecretName: "${accountSidSecretName}",
        authTokenSecretName: "${authTokenSecretName}",
    });\n    ${nextCode}`;
  }




  // Handle Approval Node
  if (currentNode.type === 'approval') {
    usedStepFunctions.add('waitForApproval'); // Mark waitForApproval as used

    const approverEmail = (currentNode.data as any).approverEmail || 'manager@example.com';
    const timeout = (currentNode.data as any).timeout || '24h';

    // Find Next node
    const nextEdge = edges.find(e => e.source === currentId);
    const nextNode = nodes.find(n => n.id === nextEdge?.target);
    const nextCode = nextEdge && nextNode ? generateNodeCall(nextNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(nextEdge.target, nodes, edges, visited, runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    return `\n    const approvalResult = await waitForApproval({ approverEmail: "${approverEmail}", timeout: "${timeout}" });\n    ${nextCode}`;
  }

  // Handle AI Node
  if (currentNode.type === 'ai') {
    usedStepFunctions.add('generateContent'); // Mark generateContent as used

    const config = (currentNode.data as any).aiConfig || {};
    const prompt = config.promptTemplate || (currentNode.data as any).prompt || '';
    const model = config.model || (currentNode.data as any).model || 'gpt-4o';
    const provider = config.provider || 'gemini';
    const thinkingLevel = (currentNode.data as any).thinkingLevel;

    const nextEdge = edges.find(e => e.source === currentId);
    const nextNode = nodes.find(n => n.id === nextEdge?.target);
    const nextCode = nextEdge && nextNode ? generateNodeCall(nextNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(nextEdge.target, nodes, edges, visited, runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    return `\n    const aiResult = await generateContent({
        prompt: \`${prompt.replace(/`/g, '\\`')}\`,
        model: "${model}",
        provider: "${provider}",
        thinkingLevel: "${thinkingLevel || ''}"
    });\n    ${nextCode}`;
  }

  // Handle Transform Node
  if (currentNode.type === 'transform') {
    usedStepFunctions.add('transformData'); // Mark transformData as used
    // If transformType is jsonata, add jsonata import
    const config = (currentNode.data as any).transformConfig || {};
    const transformType = config.transformType || (currentNode.data as any).transformType || 'javascript';
    if (transformType === 'jsonata') {
      usedImports.add(`import jsonata from 'jsonata';`);
    }

    const mapping = config.expression || (currentNode.data as any).mapping || 'return params;';

    const nextEdge = edges.find(e => e.source === currentId);
    const nextNode = nodes.find(n => n.id === nextEdge?.target);
    const nextCode = nextEdge && nextNode ? generateNodeCall(nextNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(nextEdge.target, nodes, edges, visited, runId, usedStepFunctions, usedImports, usedHelperFunctions) : '';

    return `\n    const transformResult = await transformData({
        mapping: \`${mapping.replace(/`/g, '\\`')}\`,
        transformType: "${transformType}", // Pass transformType
        data: params
    });\n    ${nextCode}`;
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
      code += generateNodeCall(targetNode, runId, usedStepFunctions, usedImports, usedHelperFunctions);
      code += traverseGraph(targetId, nodes, edges, visited, runId, usedStepFunctions, usedImports, usedHelperFunctions);
    }
  } else {
    // Parallel (Promise.all)
    const branches = outgoingEdges.map((edge) => {
      const targetId = edge.target;
      const targetNode = nodes.find((n) => n.id === targetId);
      if (!targetNode) return '';

      const branchCode = generateNodeCall(targetNode, runId, usedStepFunctions, usedImports, usedHelperFunctions) + traverseGraph(targetId, nodes, edges, new Set(visited), runId, usedStepFunctions, usedImports, usedHelperFunctions);
      return `(async () => { ${branchCode} })()`;
    });

    code += `\n    await Promise.all([\n      ${branches.join(',\n      ')}\n    ]);`;
  }

  return code;
}

function generateNodeCall(node: Node, runId: string, usedStepFunctions: Set<string>, usedImports: Set<string>, usedHelperFunctions: Set<string>): string {
  // Handle Sleep nodes specifically
  if (node.data.label === 'Sleep') {
    usedStepFunctions.add('sleep'); // Mark sleep as used
    const duration = (node.data as any).config?.timeout || (node.data as any).duration || '5s';
    return `\n    await sleep("${duration}");`;
  }

  // Handle HTTP Request nodes
  if (node.data.label === 'HTTP Request') {
    usedStepFunctions.add('makeHttpRequest'); // Mark makeHttpRequest as used
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

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

    return wrapWithRetry(stepCode, 'HTTP Request', errorConfig, node.id, runId);
  }

  // Handle Send Email nodes
  if (node.data.label === 'Send Email') {
    usedStepFunctions.add('sendEmail'); // Mark sendEmail as used
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

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

    return wrapWithRetry(stepCode, 'Send Email', errorConfig, node.id, runId);
  }

  // Handle Database Query nodes
  if (node.data.label === 'Database Query') {
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

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
    usedStepFunctions.add(functionName); // Mark the specific database query function as used

    const stepCode = `await ${functionName}({ 
        connectionString: ${processString(connectionString)}, 
        ${paramName}: ${processString(query)},
        idempotencyKey: "${(node.data as any).idempotencyKey || node.id}"
    })`;

    return wrapWithRetry(stepCode, 'Database Query', errorConfig, node.id, runId);
  }

  // Handle Run Script nodes
  if (node.data.label === 'Run Script') {
    usedStepFunctions.add('runScript'); // Mark runScript as used
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

    const config = (node.data as any).scriptConfig || {};
    // Escape backticks in user code to prevent template literal breakage
    const code = (config.code || 'return "Hello World";').replace(/`/g, '\\`');
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await runScript({ 
        code: \`${code}\`,
        context: {} 
    })`;

    return wrapWithRetry(stepCode, 'Run Script', errorConfig, node.id, runId);
  }

  // Handle Slack Message nodes
  if (node.data.label === 'Slack Message') {
    usedStepFunctions.add('sendSlackMessage'); // Mark sendSlackMessage as used
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

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

    return wrapWithRetry(stepCode, 'Slack Message', errorConfig, node.id, runId);
  }

  // Handle Stream nodes
  if (node.data.label === 'Stream') {
    usedStepFunctions.add('streamUpdate'); // Mark streamUpdate as used
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

    const config = (node.data as any).streamConfig || {};
    const message = config.message || 'Update';
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await streamUpdate({ 
        message: ${processString(message)} 
    })`;

    return wrapWithRetry(stepCode, 'Stream', errorConfig, node.id, runId);
  }

  // Handle Wait for Event nodes
  if (node.data.label === 'Wait for Event') {
    usedStepFunctions.add('waitForEvent'); // Mark waitForEvent as used
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

    const config = (node.data as any).waitConfig || {};
    const event = config.event || 'my-event';
    const timeout = config.timeout;
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await waitForEvent({ 
        event: "${event}",
        timeout: "${timeout || ''}"
    })`;

    return wrapWithRetry(stepCode, 'Wait for Event', errorConfig, node.id, runId);
  }

  // Handle Sub-Workflow nodes
  if (node.data.label === 'Sub-Workflow') {
    const workflowId = (node.data as any).workflowId || 'leadQualification';
    usedStepFunctions.add(workflowId); // Mark the specific sub-workflow as used
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

    const params = (node.data as any).params || '{}';
    const errorConfig = (node.data as any).errorConfig;

    // Call the imported workflow function
    const stepCode = `
    await ${workflowId}(JSON.parse(${processString(params)}))`;

    return wrapWithRetry(stepCode, 'Sub-Workflow', errorConfig, node.id, runId);
  }

  // Handle Custom Code nodes
  if (node.type === 'customCode') {
    usedStepFunctions.add('executeCustomCode'); // Mark executeCustomCode as used
    usedHelperFunctions.add('wrapWithRetry'); // Mark wrapWithRetry as used

    const config = (node.data as any);
    const code = (config.code || '').replace(/`/g, '\\`'); // Escape backticks
    const errorConfig = (node.data as any).errorConfig;

    const stepCode = `await executeCustomCode({
        language: "${config.language || 'javascript'}",
        code: \`${code}\`,
        entrypoint: "${config.entrypoint || 'handler'}",
        input: ${config.inputMapping || 'params'}, // Pass mapped input
        timeoutMs: ${config.timeoutMs || 10000},
        dependencies: ${processString(config.dependencies || '[]')},
        envVars: ${processString(config.envVars || '{}')}
    }, params.runId, "${node.id}", "${config.outputMapping || 'scriptResult'}")`;

    return wrapWithRetry(stepCode, 'Custom Code', errorConfig, node.id, runId);
  }

  // Handle regular step nodes
  if (node.type === 'step') {
    const functionName = toCamelCase(node.data.label as string);
    usedGenericStepFunctions.add(functionName); // Mark the specific custom step function as used for generic definition generation
    usedStepFunctions.add(functionName); // Also add to the main usedStepFunctions set
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

function wrapWithRetry(stepCode: string, stepName: string, errorConfig: any, nodeId: string, runId: string): string {
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
        // Emit 'running' status at the beginning of each attempt
        await emitNodeStatus(nodeId, 'running', runId, stepName, \`Attempt \${attempt}/${maxRetries}\`); 
        try {
          console.log(\`[${stepName}] Attempt \${attempt}/${maxRetries}\`);
          const stepResult = ${stepExecution}; 
          await emitNodeOutput(nodeId, stepResult, runId, stepName);
          await emitNodeStatus(nodeId, 'success', runId, stepName, \`Succeeded on attempt \${attempt}\`); // Emit 'success' status
          console.log(\`[${stepName}] Succeeded on attempt \${attempt}\`);
          success = true;
          break;
        } catch (error: any) {
          lastError = error;
          await emitNodeStatus(nodeId, 'failed', runId, stepName, \`Failed on attempt \${attempt}: \${error.message}\`); // Emit 'failed' status
          console.error(\`[${stepName}] Failed on attempt \${attempt}:\`, error.message);
          
          // Check for FatalError
          if (error.name === 'FatalError') {
             console.error(\`[${stepName}] Fatal error encountered, stopping retries.\`);
             await emitNodeStatus(nodeId, 'fatal_error', runId, stepName, \`Fatal error: \${error.message}\`); // Emit 'fatal_error' status
             throw error;
          }

          // Check for fatal patterns
          if (fatalPatterns.some((p: string) => error.message.includes(p))) {
             console.error(\`[${stepName}] Error matches fatal pattern, stopping retries.\`);
             await emitNodeStatus(nodeId, 'fatal_error', runId, stepName, \`Fatal pattern match: \${error.message}\`); // Emit 'fatal_error' status
             throw new FatalError(error.message);
          }
          
          ${failureAction === 'fail-workflow'
      ? `await emitNodeStatus(nodeId, 'failed', runId, stepName, \`Failing workflow due to error: \${error.message}\`); // Emit 'failed' status before throwing
        throw new Error(\`Fatal error in ${stepName}: \${error.message}\`);`
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
        await emitNodeStatus(nodeId, 'failed', runId, stepName, \`Max retries (${maxRetries}) exceeded.\`); // Emit 'failed' status after retries
        throw new Error(\`Max retries (${maxRetries}) exceeded for ${stepName}: \${lastError?.message}\`);
      }`
      : ''}
      
      ${failureAction === 'ignore'
      ? `if (!success) {
        await emitNodeStatus(nodeId, 'ignored', runId, stepName, \`All retries failed, error ignored.\`); // Emit 'ignored' status
        console.warn(\`[${stepName}] All retries failed, ignoring error:\`, lastError?.message);
      }`
      : ''}
    }`;
}

function processString(str: string): string {
  // If string contains a secret placeholder, replace it with ${getSecret} call
  if (str.includes('{{') && str.includes('}}')) {
    const processed = str.replace(/\{\{([^}]+)\}\}/g, (_, secretName) => {
      return `\${getSecret("${secretName.trim()}")}`;
    });
    return `\`${processed}\``; // Return as a template literal string
  }
  // If no secrets, return as a regular string literal
  return JSON.stringify(str); // Safely quote the string
}

// NEW: Helper to emit node output
export async function emitNodeOutput(nodeId: string, output: any, runId: string, stepType: string) {
  const writable = getStreamWritable(runId);
  if (writable) {
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify({
      type: 'nodeOutput',
      nodeId,
      stepType,
      output,
      runId,
      timestamp: Date.now()
    }) + "\\n"));
    writer.releaseLock();
  } else {
    console.log(`[Node Output Debug - ${stepType}:${nodeId}]`, output);
  }
}

export async function emitNodeStatus(nodeId: string, status: string, runId: string, stepType: string, message?: string) {
  const writable = getStreamWritable(runId);
  if (writable) {
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify({
      type: 'nodeStatus',
      nodeId,
      stepType,
      status,
      runId,
      timestamp: Date.now(),
      message: message || `Node ${nodeId} status: ${status}`
    }) + "\\n"));
    writer.releaseLock();
  } else {
    console.log(`[Node Status Debug - ${stepType}:${nodeId}] Status: ${status}`, message);
  }
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

export async function saveAndVersionWorkflow(workflowId: string, nodes: Node[], edges: Edge[]): Promise<string> {
  const generatedCode = generateWorkflowCode(workflowId, nodes, edges);
  const versionId = generateVersionId();

  // Save the generated code
  await saveWorkflowVersion(workflowId, versionId, generatedCode);

  // Update metadata and set as active version
  await updateWorkflowMetadata(workflowId, versionId, true);

  return versionId;
}

export async function saveAndVersionWorkflow(workflowId: string, nodes: Node[], edges: Edge[]): Promise<string> {
  const generatedCode = generateWorkflowCode(workflowId, nodes, edges);
  const versionId = generateVersionId();

  // Save the generated code
  await saveWorkflowVersion(workflowId, versionId, generatedCode);

  // Update metadata and set as active version
  await updateWorkflowMetadata(workflowId, versionId, true);

  return versionId;
}


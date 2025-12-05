import { sleep, getWritable, resumeHook, createHook, getSecret } from "workflow";


// Helper function to parse duration strings (e.g., "1s", "500ms", "2m") into milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h)$/);
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
      setTimeout(() => reject(new Error(`Timeout after ${timeout}`)), timeoutMs)
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
}


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
};

export const sendEmail = async (params: { recipient: string; subject: string; body: string; idempotencyKey?: string }) => {
  "use step";
  console.log("Sending email to:", params.recipient);
  console.log("Idempotency Key:", params.idempotencyKey);
  console.log("Subject:", params.subject);
  console.log("Body:", params.body);
  // Simulate sending
  await new Promise(resolve => setTimeout(resolve, 500));
  return { status: "sent", recipient: params.recipient };
};

export const queryPostgres = async (params: { connectionString: string; query: string; idempotencyKey?: string }) => {
  "use step";
  console.log("Executing PostgreSQL Query");
  console.log("Idempotency Key:", params.idempotencyKey);
  
  // NOTE: Requires 'pg' package - install with: npm install pg @types/pg
  const { Client } = await import('pg');
  
  const client = new Client({
    connectionString: params.connectionString
  });
  
  try {
    await client.connect();
    const result = await client.query(params.query);
    return { status: "success", rows: result.rows, rowCount: result.rowCount };
  } finally {
    await client.end();
  }
};

export const queryMysql = async (params: { connectionString: string; query: string; idempotencyKey?: string }) => {
  "use step";
  console.log("Executing MySQL Query");
  console.log("Idempotency Key:", params.idempotencyKey);
  
  // NOTE: Requires 'mysql2' package - install with: npm install mysql2
  const mysql = await import('mysql2/promise');
  
  const connection = await mysql.createConnection(params.connectionString);
  
  try {
    const [rows] = await connection.execute(params.query);
    return { status: "success", rows, rowCount: Array.isArray(rows) ? rows.length : 0 };
  } finally {
    await connection.end();
  }
};

export const queryMongodb = async (params: { connectionString: string; operation: string; idempotencyKey?: string }) => {
  "use step";
  console.log("Executing MongoDB Operation");
  console.log("Idempotency Key:", params.idempotencyKey);
  
  // NOTE: Requires 'mongodb' package - install with: npm install mongodb
  const { MongoClient } = await import('mongodb');
  
  const client = new MongoClient(params.connectionString);
  
  try {
    await client.connect();
    
    // Parse the operation JSON (expected format: { collection: "name", operation: "find", query: {}, options: {} })
    const opConfig = JSON.parse(params.operation);
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
        throw new Error(`Unsupported MongoDB operation: ${opConfig.operation}`);
    }
    
    return { status: "success", result };
  } finally {
    await client.close();
  }
};

export const queryGeneric = async (params: { connectionString: string; query: string; idempotencyKey?: string }) => {
  "use step";
  console.log("Generic Database Query (Placeholder)");
  console.log("Idempotency Key:", params.idempotencyKey);
  console.log("Connection:", params.connectionString ? "Provided" : "Missing");
  console.log("Query:", params.query);
  
  // This is a placeholder for custom database implementations
  // Users should replace this with their specific database client code
  console.warn("Generic database type selected - no actual database connection performed");
  
  await new Promise(resolve => setTimeout(resolve, 500));
  return { status: "success", message: "Generic placeholder - implement your own database logic" };
};

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
};

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
};

export const streamUpdate = async (params: { message: string }) => {
  "use step";
  console.log("Streaming update:", params.message);
  const writable = getWritable();
  if (writable) {
    const writer = writable.getWriter();
    await writer.write(new TextEncoder().encode(params.message + "\n"));
    writer.releaseLock();
  }
  return { status: "streamed", message: params.message };
};

export const waitForEvent = async (params: { event: string; timeout?: string }) => {
  "use step";
  console.log("Waiting for event:", params.event);
  // This will pause execution until the event is received via resumeHook
  // The timeout is handled by the workflow engine if supported, or we can implement a race
  const result = await resumeHook(params.event);
  return { status: "received", event: params.event, data: result };
};

export const waitForApproval = async (params: { approverEmail: string; timeout?: string }) => {
  "use step";
  console.log("Requesting approval from:", params.approverEmail);
  // In a real app, this would send an email and wait for a click
  // We simulate waiting for an event named 'approval-{approverEmail}'
  const eventName = `approval-${params.approverEmail}`;
  const result = await resumeHook(eventName);
  return { status: result.approved ? "approved" : "rejected", approver: params.approverEmail };
};

export const generateContent = async (params: { prompt: string; model?: string; provider?: string }) => {
  "use step";
  console.log("Generating AI content with model:", params.model);
  console.log("Prompt:", params.prompt);
  // Mock AI response
  // Mock AI response or verify provider
  if (params.provider === 'openai') {
      console.log("Calling OpenAI API with model:", params.model);
      // In production, use standard fetch to OpenAI API
      // await fetch('https://api.openai.com/v1/chat/completions', ...);
  } else if (params.provider === 'gemini') {
      console.log("Calling Google Gemini API with model:", params.model);
      // await fetch('https://generativelanguage.googleapis.com/v1beta/models/...', ...);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  return { 
    status: "success", 
    content: `Generated content for: ${params.prompt}`,
    model: params.model 
    content: `Generated content for: ${params.prompt}`,
    model: params.model,
    provider: params.provider
  };
};

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
};

export async function workflow(params: any) {
  "use workflow";
  
  return { result: "Workflow completed" };
}


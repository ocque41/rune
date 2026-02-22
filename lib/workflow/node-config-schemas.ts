import { z } from 'zod';
import type { NodeKind } from './node-catalog';
import type { NodeConfigErrorMap, NodeConfigValidationResult } from './node-config-types';

const trimmedOptionalString = z.string().optional().transform((value) => value ?? '');

const baseSchema = z.object({
  label: z.string().trim().min(1, 'Label is required.'),
}).passthrough();

const retrySchema = z.object({
  maxRetries: z.coerce.number().min(0).max(10).optional(),
  backoffPolicy: z.enum(['exponential', 'linear', 'constant']).optional(),
  baseDelay: trimmedOptionalString,
  failureAction: z.enum(['retry', 'fail-workflow', 'ignore']).optional(),
  timeout: trimmedOptionalString,
}).partial().passthrough();

const stepSchema = baseSchema.extend({
  duration: trimmedOptionalString,
  idempotencyKey: trimmedOptionalString,
  httpRequest: z.object({
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).optional(),
    url: trimmedOptionalString,
    headers: trimmedOptionalString,
    body: trimmedOptionalString,
  }).partial().passthrough().optional(),
  emailConfig: z.object({
    recipient: trimmedOptionalString,
    sender: trimmedOptionalString,
    subject: trimmedOptionalString,
    body: trimmedOptionalString,
  }).partial().passthrough().optional(),
  dbConfig: z.object({
    dbType: z.enum(['postgres', 'mysql', 'mongodb', 'generic']).optional(),
    connectionString: trimmedOptionalString,
    query: trimmedOptionalString,
  }).partial().passthrough().optional(),
  scriptConfig: z.object({
    code: trimmedOptionalString,
  }).partial().passthrough().optional(),
  slackConfig: z.object({
    webhookUrl: trimmedOptionalString,
    channel: trimmedOptionalString,
    message: trimmedOptionalString,
  }).partial().passthrough().optional(),
  streamConfig: z.object({
    message: trimmedOptionalString,
  }).partial().passthrough().optional(),
  waitConfig: z.object({
    event: trimmedOptionalString,
    timeout: trimmedOptionalString,
  }).partial().passthrough().optional(),
  config: z.object({
    retryAfter: trimmedOptionalString,
    timeout: trimmedOptionalString,
  }).partial().passthrough().optional(),
  errorConfig: retrySchema.optional(),
}).passthrough();

const ifSchema = baseSchema.extend({
  condition: z.string().trim().min(1, 'Condition is required.'),
}).passthrough();

const loopSchema = baseSchema.extend({
  items: z.string().trim().min(1, 'Loop items expression is required.'),
}).passthrough();

const parallelSchema = baseSchema.extend({
  branches: z.coerce.number().min(2).max(10),
}).passthrough();

const subWorkflowSchema = baseSchema.extend({
  workflowId: z.string().trim().min(1, 'Workflow ID is required.'),
  params: trimmedOptionalString,
}).passthrough();

const scheduleSchema = baseSchema.extend({
  cron: z.string().trim().min(1, 'Cron expression is required.'),
  timezone: z.string().trim().min(1, 'Timezone is required.'),
}).passthrough();

const approvalSchema = baseSchema.extend({
  approverEmail: z.string().trim().email('Approver email must be valid.'),
  timeout: trimmedOptionalString,
}).passthrough();

const aiSchema = baseSchema.extend({
  model: z.string().trim().min(1, 'Model is required.'),
  prompt: z.string().trim().min(1, 'Prompt is required.'),
  thinkingLevel: trimmedOptionalString,
}).passthrough();

const transformSchema = baseSchema.extend({
  transformType: z.enum(['javascript', 'jsonata']).optional(),
  mapping: z.string().trim().min(1, 'Transform mapping is required.'),
}).passthrough();

const webhookSchema = baseSchema.extend({
  webhookUrl: trimmedOptionalString,
  method: z.enum(['POST', 'GET', 'PUT']).optional(),
}).passthrough();

const errorHandlerSchema = baseSchema.extend({
  actionType: z.enum(['email', 'slack', 'webhook']),
  config: z.object({
    recipient: trimmedOptionalString,
    subject: trimmedOptionalString,
    body: trimmedOptionalString,
    webhookUrl: trimmedOptionalString,
    channel: trimmedOptionalString,
    message: trimmedOptionalString,
    payload: trimmedOptionalString,
  }).partial().passthrough(),
}).passthrough();

const batchProcessSchema = baseSchema.extend({
  items: z.string().trim().min(1, 'Batch items expression is required.'),
  workflowId: z.string().trim().min(1, 'Batch workflow ID is required.'),
  concurrency: z.coerce.number().min(1).max(50),
  outputAggregation: z.enum(['array', 'sum', 'object', 'none']).optional(),
}).passthrough();

const customCodeSchema = baseSchema.extend({
  language: z.enum(['javascript', 'python', 'wasm']).optional(),
  code: z.string().trim().min(1, 'Code is required.'),
  entrypoint: trimmedOptionalString,
  inputMapping: trimmedOptionalString,
  outputMapping: trimmedOptionalString,
  timeoutMs: z.coerce.number().min(1).max(600000).optional(),
  dependencies: trimmedOptionalString,
  envVars: trimmedOptionalString,
}).passthrough();

const dataValidationSchema = baseSchema.extend({
  schema: z.string().trim().min(1, 'Validation schema is required.'),
  dataPath: z.string().trim().min(1, 'Data path is required.'),
  onFailure: z.enum(['failWorkflow', 'continue', 'markInvalid']).optional(),
}).passthrough();

const groupSchema = baseSchema.extend({
  isCollapsed: z.boolean().optional(),
}).passthrough();

const twilioSchema = baseSchema.extend({
  fromPhoneNumber: z.string().trim().min(1, 'From phone number is required.'),
  toPhoneNumber: z.string().trim().min(1, 'To phone number is required.'),
  messageBody: z.string().trim().min(1, 'Message body is required.'),
  accountSidSecretName: z.string().trim().min(1, 'Account SID secret name is required.'),
  authTokenSecretName: z.string().trim().min(1, 'Auth token secret name is required.'),
}).passthrough();

const unknownSchema = baseSchema.passthrough();

export const NODE_KIND_SCHEMAS: Record<NodeKind, z.ZodTypeAny> = {
  startWorkflow: stepSchema,
  sendEmail: stepSchema,
  httpRequest: stepSchema,
  databaseQuery: stepSchema,
  runScript: stepSchema,
  slackMessage: stepSchema,
  stream: stepSchema,
  sleep: stepSchema,
  waitForEvent: stepSchema,
  ifElse: ifSchema,
  loop: loopSchema,
  parallel: parallelSchema,
  subWorkflow: subWorkflowSchema,
  schedule: scheduleSchema,
  approval: approvalSchema,
  ai: aiSchema,
  transform: transformSchema,
  webhook: webhookSchema,
  errorHandler: errorHandlerSchema,
  batchProcess: batchProcessSchema,
  customCode: customCodeSchema,
  dataValidation: dataValidationSchema,
  group: groupSchema,
  twilioMessage: twilioSchema,
  unknown: unknownSchema,
};

export function getNodeConfigSchema(kind: NodeKind): z.ZodTypeAny {
  return NODE_KIND_SCHEMAS[kind] ?? unknownSchema;
}

export function validateNodeConfig(kind: NodeKind, data: Record<string, unknown>): NodeConfigValidationResult {
  const schema = getNodeConfigSchema(kind);
  const result = schema.safeParse(data);

  if (result.success) {
    return { isValid: true, errors: {} };
  }

  const errors: NodeConfigErrorMap = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join('.') : 'root';
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }

  return {
    isValid: false,
    errors,
  };
}

export function normalizeNodeConfig(kind: NodeKind, data: Record<string, unknown>): Record<string, unknown> {
  const schema = getNodeConfigSchema(kind);
  const parsed = schema.safeParse(data);
  if (parsed.success) {
    return parsed.data as Record<string, unknown>;
  }
  return data;
}

import type { Node } from '@xyflow/react';

export const NODE_KINDS = [
  'startWorkflow',
  'sendEmail',
  'httpRequest',
  'databaseQuery',
  'runScript',
  'slackMessage',
  'stream',
  'sleep',
  'waitForEvent',
  'ifElse',
  'loop',
  'parallel',
  'subWorkflow',
  'schedule',
  'approval',
  'ai',
  'transform',
  'webhook',
  'errorHandler',
  'batchProcess',
  'customCode',
  'dataValidation',
  'group',
  'twilioMessage',
  'unknown',
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export const LEGACY_LABEL_TO_KIND: Record<string, NodeKind> = {
  'Start Workflow': 'startWorkflow',
  'Send Email': 'sendEmail',
  'HTTP Request': 'httpRequest',
  'Database Query': 'databaseQuery',
  'Run Script': 'runScript',
  'Slack Message': 'slackMessage',
  'Stream': 'stream',
  'Sleep': 'sleep',
  'Wait for Event': 'waitForEvent',
  'Wait': 'waitForEvent',
  'If / Else': 'ifElse',
  'Loop': 'loop',
  'Parallel': 'parallel',
  'Sub-Workflow': 'subWorkflow',
  'Schedule': 'schedule',
  'Approval': 'approval',
  'AI Generation': 'ai',
  'AI Gen': 'ai',
  'AI Generate': 'ai',
  'AI Agent': 'ai',
  'Transform': 'transform',
  'Webhook': 'webhook',
  'Error Handler': 'errorHandler',
  error: 'errorHandler',
  'Batch Process': 'batchProcess',
  'Custom Code': 'customCode',
  'Data Validation': 'dataValidation',
  Group: 'group',
  'Send SMS (Twilio)': 'twilioMessage',
};

export const NODE_TYPE_TO_KIND: Record<string, NodeKind> = {
  step: 'unknown',
  if: 'ifElse',
  loop: 'loop',
  parallel: 'parallel',
  subWorkflow: 'subWorkflow',
  schedule: 'schedule',
  approval: 'approval',
  ai: 'ai',
  transform: 'transform',
  webhook: 'webhook',
  error: 'errorHandler',
  batchProcess: 'batchProcess',
  customCode: 'customCode',
  dataValidation: 'dataValidation',
  groupNode: 'group',
  twilioMessage: 'twilioMessage',
};

export const KIND_DISPLAY_NAME: Record<NodeKind, string> = {
  startWorkflow: 'Start Workflow',
  sendEmail: 'Send Email',
  httpRequest: 'HTTP Request',
  databaseQuery: 'Database Query',
  runScript: 'Run Script',
  slackMessage: 'Slack Message',
  stream: 'Stream',
  sleep: 'Sleep',
  waitForEvent: 'Wait for Event',
  ifElse: 'If / Else',
  loop: 'Loop',
  parallel: 'Parallel',
  subWorkflow: 'Sub-Workflow',
  schedule: 'Schedule',
  approval: 'Approval',
  ai: 'AI Generation',
  transform: 'Transform',
  webhook: 'Webhook',
  errorHandler: 'Error Handler',
  batchProcess: 'Batch Process',
  customCode: 'Custom Code',
  dataValidation: 'Data Validation',
  group: 'Group',
  twilioMessage: 'Send SMS (Twilio)',
  unknown: 'Node',
};

function resolveStepLabelKind(label?: string): NodeKind {
  if (!label) return 'unknown';
  return LEGACY_LABEL_TO_KIND[label] ?? 'unknown';
}

export function inferKindFromLegacyLabel(label?: string, nodeType?: string): NodeKind {
  if (label && LEGACY_LABEL_TO_KIND[label]) {
    return LEGACY_LABEL_TO_KIND[label];
  }

  if (nodeType && NODE_TYPE_TO_KIND[nodeType] && NODE_TYPE_TO_KIND[nodeType] !== 'unknown') {
    return NODE_TYPE_TO_KIND[nodeType];
  }

  if (nodeType === 'step') {
    return resolveStepLabelKind(label);
  }

  return 'unknown';
}

export function resolveNodeKind(node: Pick<Node, 'type' | 'data'>): NodeKind {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const explicitKind = typeof data.kind === 'string' ? (data.kind as NodeKind) : undefined;

  if (explicitKind && NODE_KINDS.includes(explicitKind)) {
    return explicitKind;
  }

  const label = typeof data.label === 'string' ? data.label : undefined;
  return inferKindFromLegacyLabel(label, node.type);
}

export function withNormalizedNodeData<T extends Record<string, unknown>>(
  node: Pick<Node, 'type' | 'data'> & { data: T },
): T & { kind: NodeKind; label: string } {
  const kind = resolveNodeKind(node);
  const label = typeof node.data.label === 'string' && node.data.label.trim().length > 0
    ? node.data.label
    : KIND_DISPLAY_NAME[kind];

  return {
    ...node.data,
    kind,
    label,
  };
}

export function getNodeKindDisplayName(kind: NodeKind): string {
  return KIND_DISPLAY_NAME[kind] ?? KIND_DISPLAY_NAME.unknown;
}

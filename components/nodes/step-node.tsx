'use client';

import React from 'react';
import { Node, NodeProps, Position } from '@xyflow/react';
import { Clock, Play } from 'lucide-react';
import { NodeCardShell } from './node-card-shell';
import { useNodeConfig } from '@/components/node-config/node-config-context';

export type StepNodeData = {
  label: string;
  description?: string;
  kind?: string;
  status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
  duration?: string;
  httpRequest?: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    url: string;
    headers?: string;
    body?: string;
  };
  emailConfig?: {
    recipient: string;
    sender?: string;
    subject: string;
    body: string;
  };
  dbConfig?: {
    dbType?: 'postgres' | 'mysql' | 'mongodb' | 'generic';
    connectionString: string;
    query: string;
  };
  scriptConfig?: {
    code: string;
  };
  slackConfig?: {
    webhookUrl: string;
    channel?: string;
    message: string;
  };
  streamConfig?: {
    message: string;
  };
  waitConfig?: {
    event: string;
    timeout?: string;
  };
  idempotencyKey?: string;
  config?: {
    retryAfter?: string;
    timeout?: string;
  };
  errorConfig?: {
    maxRetries?: number;
    backoffPolicy?: 'exponential' | 'linear' | 'constant';
    baseDelay?: string;
    failureAction?: 'retry' | 'fail-workflow' | 'ignore';
    errorTypeHandling?: 'all-retryable' | 'custom';
    fatalErrorPatterns?: string[];
    timeout?: string;
  };
};

export type CustomNode = Node<StepNodeData>;

function getSummary(data: StepNodeData): string {
  const label = data.label ?? 'Step';

  if (label === 'Sleep') {
    return `Duration: ${data.duration || 'Not set'}`;
  }
  if (label === 'Wait for Event' || label === 'Wait') {
    return `Event: ${data.waitConfig?.event || 'Not set'}${data.waitConfig?.timeout ? ` · Timeout: ${data.waitConfig.timeout}` : ''}`;
  }
  if (label === 'HTTP Request') {
    return `${data.httpRequest?.method || 'GET'} ${data.httpRequest?.url || 'URL not set'}`;
  }
  if (label === 'Send Email') {
    return `To: ${data.emailConfig?.recipient || 'Not set'} · Subject: ${data.emailConfig?.subject || 'Not set'}`;
  }
  if (label === 'Database Query') {
    return `${data.dbConfig?.dbType || 'database'} query`;
  }
  if (label === 'Run Script') {
    return `Script length: ${data.scriptConfig?.code?.length || 0} chars`;
  }
  if (label === 'Slack Message') {
    return `Channel: ${data.slackConfig?.channel || 'default'} `;
  }
  if (label === 'Stream') {
    return data.streamConfig?.message ? `Message configured` : 'No stream message configured';
  }

  return data.description || 'Use settings to configure this step in full-screen mode.';
}

export default function StepNode({ id, data, selected }: NodeProps<CustomNode>) {
  const { openNodeConfig } = useNodeConfig();
  const isTimeNode = data.label === 'Sleep' || data.label === 'Wait for Event' || data.label === 'Wait';

  return (
    <NodeCardShell
      selected={selected}
      title={data.label || 'Step'}
      subtitle="Workflow step"
      icon={isTimeNode ? <Clock size={16} /> : <Play size={16} />}
      status={data.status}
      summary={getSummary(data)}
      onOpenSettings={() => openNodeConfig(id)}
      className="min-w-[300px]"
      handles={[
        { type: 'target', position: Position.Top },
        { type: 'source', position: Position.Bottom },
      ]}
    />
  );
}

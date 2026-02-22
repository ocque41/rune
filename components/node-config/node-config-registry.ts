import type { ComponentType } from 'react';
import type { NodeKind } from '@/lib/workflow/node-catalog';
import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { StepConfigForm } from './forms/step-config-form';
import { IfConfigForm } from './forms/if-config-form';
import { LoopConfigForm } from './forms/loop-config-form';
import { ParallelConfigForm } from './forms/parallel-config-form';
import { SubworkflowConfigForm } from './forms/subworkflow-config-form';
import { ScheduleConfigForm } from './forms/schedule-config-form';
import { ApprovalConfigForm } from './forms/approval-config-form';
import { AiConfigForm } from './forms/ai-config-form';
import { TransformConfigForm } from './forms/transform-config-form';
import { WebhookConfigForm } from './forms/webhook-config-form';
import { ErrorConfigForm } from './forms/error-config-form';
import { CustomCodeConfigForm } from './forms/custom-code-config-form';
import { DataValidationConfigForm } from './forms/data-validation-config-form';
import { BatchProcessConfigForm } from './forms/batch-process-config-form';
import { GroupConfigForm } from './forms/group-config-form';
import { TwilioConfigForm } from './forms/twilio-config-form';
import { UnknownConfigForm } from './forms/unknown-config-form';

export type NodeConfigFormComponent = ComponentType<NodeConfigFormProps>;

export const nodeConfigFormRegistry: Record<NodeKind, NodeConfigFormComponent> = {
  startWorkflow: StepConfigForm,
  sendEmail: StepConfigForm,
  httpRequest: StepConfigForm,
  databaseQuery: StepConfigForm,
  runScript: StepConfigForm,
  slackMessage: StepConfigForm,
  stream: StepConfigForm,
  sleep: StepConfigForm,
  waitForEvent: StepConfigForm,
  ifElse: IfConfigForm,
  loop: LoopConfigForm,
  parallel: ParallelConfigForm,
  subWorkflow: SubworkflowConfigForm,
  schedule: ScheduleConfigForm,
  approval: ApprovalConfigForm,
  ai: AiConfigForm,
  transform: TransformConfigForm,
  webhook: WebhookConfigForm,
  errorHandler: ErrorConfigForm,
  batchProcess: BatchProcessConfigForm,
  customCode: CustomCodeConfigForm,
  dataValidation: DataValidationConfigForm,
  group: GroupConfigForm,
  twilioMessage: TwilioConfigForm,
  unknown: UnknownConfigForm,
};

export function getConfigFormForKind(kind: NodeKind): NodeConfigFormComponent {
  return nodeConfigFormRegistry[kind] ?? UnknownConfigForm;
}

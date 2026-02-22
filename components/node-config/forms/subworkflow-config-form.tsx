'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function SubworkflowConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Reference another workflow and pass parameters safely." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Invoke Billing Workflow"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        <Field label="Workflow ID" hint="Use the exact ID of the workflow to execute.">
          <TextInput
            value={asString(getPathValue(draftData, 'workflowId'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'workflowId', value))}
            placeholder="processInvoice"
          />
          <ErrorText errors={errors} path="workflowId" />
        </Field>
        <Field label="Parameters (JSON)" hint="Provide JSON object with input values for the sub-workflow.">
          <TextAreaInput
            rows={8}
            value={asString(getPathValue(draftData, 'params'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'params', value))}
            placeholder='{"invoiceId": "{{params.invoiceId}}"}'
          />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Reliability" description="Sub-workflows should be stable and versioned to prevent breaking callers." />
      <p className="text-sm text-[color:var(--subtitle)]">Prefer explicit parameter contracts between parent and sub-workflow.</p>
    </div>
  );
}

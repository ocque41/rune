'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, NumberInput, SelectInput, ErrorText, asString, asNumber, getPathValue, setPathValue, sectionVisible } from './shared';

export function BatchProcessConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Batch processing runs the same workflow for each item in a collection." />
        <Field label="Label">
          <TextInput value={asString(getPathValue(draftData, 'label'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))} placeholder="Process Order Batch" />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        <Field label="Items Expression" hint="Expression returning the array of items to process.">
          <TextInput value={asString(getPathValue(draftData, 'items'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'items', value))} placeholder="params.records" />
          <ErrorText errors={errors} path="items" />
        </Field>
        <Field label="Workflow ID">
          <TextInput value={asString(getPathValue(draftData, 'workflowId'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'workflowId', value))} placeholder="processSingleRecord" />
          <ErrorText errors={errors} path="workflowId" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <Field label="Concurrency" hint="How many items run in parallel.">
          <NumberInput value={asNumber(getPathValue(draftData, 'concurrency'), 1)} min={1} max={50} onChange={(value) => setDraftData((current) => setPathValue(current, 'concurrency', value))} />
          <ErrorText errors={errors} path="concurrency" />
        </Field>
        <Field label="Output Aggregation">
          <SelectInput
            value={asString(getPathValue(draftData, 'outputAggregation'), 'array')}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'outputAggregation', value))}
            options={[
              { value: 'array', label: 'Array' },
              { value: 'sum', label: 'Sum' },
              { value: 'object', label: 'Object' },
              { value: 'none', label: 'None' },
            ]}
          />
        </Field>
      </div>
    );
  }

  return <p className="text-sm text-[color:var(--subtitle)]">Use low concurrency first, then increase gradually while monitoring downstream limits.</p>;
}

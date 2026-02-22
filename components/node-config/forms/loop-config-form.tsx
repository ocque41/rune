'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function LoopConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Name the loop after what it iterates through." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Loop Through Orders"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Inputs" description="Provide an iterable source (array expression) for loop body execution." />
        <Field label="Items Expression" hint="Example: params.orders or outputs.fetchOrders.data">
          <TextInput
            value={asString(getPathValue(draftData, 'items'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'items', value))}
            placeholder="params.items"
          />
          <ErrorText errors={errors} path="items" />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Behavior" description="Connect body steps to the loop body handle and continuation steps to done." />
      <p className="text-sm text-[color:var(--subtitle)]">Use small loop body steps to keep execution traceable and easy to debug.</p>
    </div>
  );
}

'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, NumberInput, ErrorText, asString, asNumber, getPathValue, setPathValue, sectionVisible } from './shared';

export function ParallelConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Name this parallel group to reflect branch purpose." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Run In Parallel"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Behavior" description="Set how many branches execute concurrently." />
        <Field label="Branch Count" hint="Between 2 and 10 branches.">
          <NumberInput
            value={asNumber(getPathValue(draftData, 'branches'), 2)}
            min={2}
            max={10}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'branches', value))}
          />
          <ErrorText errors={errors} path="branches" />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Output" description="Use branch handles for branch-specific flow and merge handle to continue after all branches complete." />
      <p className="text-sm text-[color:var(--subtitle)]">Keep branch side effects idempotent to avoid duplicate external operations on retry.</p>
    </div>
  );
}

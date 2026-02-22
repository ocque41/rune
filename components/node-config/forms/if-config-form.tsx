'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function IfConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Name this decision clearly so branches are easy to understand." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Check Account Status"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Behavior" description="Define the condition expression used to choose true/false paths." />
        <Field label="Condition" hint="Return true or false. Example: params.score > 80">
          <TextAreaInput
            rows={6}
            value={asString(getPathValue(draftData, 'condition'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'condition', value))}
            placeholder="params.status === 'approved'"
          />
          <ErrorText errors={errors} path="condition" />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Guidance" description="True branch uses the 'true' handle, false branch uses the 'false' handle." />
      <p className="text-sm text-[color:var(--subtitle)]">Keep expressions simple and deterministic for predictable branching.</p>
    </div>
  );
}

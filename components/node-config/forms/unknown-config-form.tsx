'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function UnknownConfigForm({ draftData, setDraftData, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="This node type does not yet have a specialized editor." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Node Label"
          />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Raw JSON" description="Edit advanced values directly when needed." />
      <Field label="Node Data JSON">
        <TextAreaInput
          rows={16}
          value={JSON.stringify(draftData, null, 2)}
          onChange={(value) => {
            try {
              const parsed = JSON.parse(value) as Record<string, unknown>;
              setDraftData(() => parsed);
            } catch {
              // ignore invalid json while typing
            }
          }}
        />
      </Field>
    </div>
  );
}

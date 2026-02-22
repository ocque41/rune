'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, CheckboxInput, ErrorText, asString, asBoolean, getPathValue, setPathValue, sectionVisible } from './shared';

export function GroupConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Groups organize related nodes and support collapsed editing." />
        <Field label="Label">
          <TextInput value={asString(getPathValue(draftData, 'label'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))} placeholder="Data Pipeline Group" />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Behavior" description="Control default collapsed state for canvas readability." />
        <CheckboxInput
          checked={asBoolean(getPathValue(draftData, 'isCollapsed'), false)}
          onCheckedChange={(value) => setDraftData((current) => setPathValue(current, 'isCollapsed', value))}
          label="Start collapsed"
        />
      </div>
    );
  }

  return <p className="text-sm text-[color:var(--subtitle)]">Group layout dimensions are managed automatically by the editor.</p>;
}

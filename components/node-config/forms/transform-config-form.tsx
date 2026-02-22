'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, SelectInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function TransformConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Transform nodes reshape data for downstream steps." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Normalize Response"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <Field label="Transform Type">
          <SelectInput
            value={asString(getPathValue(draftData, 'transformType'), 'javascript')}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'transformType', value))}
            options={[
              { value: 'javascript', label: 'JavaScript' },
              { value: 'jsonata', label: 'JSONata' },
            ]}
          />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    const type = asString(getPathValue(draftData, 'transformType'), 'javascript');
    return (
      <div className="space-y-6">
        <Field
          label={type === 'jsonata' ? 'JSONata Expression' : 'JavaScript Mapping'}
          hint={type === 'jsonata' ? 'Example: $.items[status="active"]' : 'Example: return { value: params.data };'}
        >
          <TextAreaInput
            rows={10}
            value={asString(getPathValue(draftData, 'mapping'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'mapping', value))}
            placeholder={type === 'jsonata' ? '$.' : 'return params;'}
          />
          <ErrorText errors={errors} path="mapping" />
        </Field>
      </div>
    );
  }

  return <div className="text-sm text-[color:var(--subtitle)]">No additional settings in this section.</div>;
}

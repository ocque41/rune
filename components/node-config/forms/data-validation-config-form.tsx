'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, SelectInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function DataValidationConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Define validation behavior for incoming data payloads." />
        <Field label="Label">
          <TextInput value={asString(getPathValue(draftData, 'label'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))} placeholder="Validate Payload" />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        <Field label="Data Path" hint="Path pointing to data to validate.">
          <TextInput value={asString(getPathValue(draftData, 'dataPath'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'dataPath', value))} placeholder="params.payload" />
          <ErrorText errors={errors} path="dataPath" />
        </Field>
        <Field label="Schema (JSON Schema)">
          <TextAreaInput rows={10} value={asString(getPathValue(draftData, 'schema'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'schema', value))} placeholder='{"type":"object","required":["id"]}' />
          <ErrorText errors={errors} path="schema" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <Field label="On Failure Action">
          <SelectInput
            value={asString(getPathValue(draftData, 'onFailure'), 'failWorkflow')}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'onFailure', value))}
            options={[
              { value: 'failWorkflow', label: 'Fail Workflow' },
              { value: 'continue', label: 'Continue' },
              { value: 'markInvalid', label: 'Mark Invalid' },
            ]}
          />
        </Field>
      </div>
    );
  }

  return <p className="text-sm text-[color:var(--subtitle)]">Keep schemas versioned and reviewed to avoid accidental contract drift.</p>;
}

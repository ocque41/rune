'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, SelectInput, NumberInput, ErrorText, asString, asNumber, getPathValue, setPathValue, sectionVisible } from './shared';

export function CustomCodeConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Custom code gives full control over transformation and processing." />
        <Field label="Label">
          <TextInput value={asString(getPathValue(draftData, 'label'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))} placeholder="Custom Processor" />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <Field label="Language">
          <SelectInput
            value={asString(getPathValue(draftData, 'language'), 'javascript')}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'language', value))}
            options={[
              { value: 'javascript', label: 'JavaScript' },
              { value: 'python', label: 'Python' },
              { value: 'wasm', label: 'WASM' },
            ]}
          />
        </Field>
        <Field label="Entrypoint" hint="Function name invoked by runtime.">
          <TextInput value={asString(getPathValue(draftData, 'entrypoint'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'entrypoint', value))} placeholder="handler" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        <Field label="Code">
          <TextAreaInput rows={12} value={asString(getPathValue(draftData, 'code'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'code', value))} placeholder="return params;" />
          <ErrorText errors={errors} path="code" />
        </Field>
        <Field label="Input Mapping"><TextInput value={asString(getPathValue(draftData, 'inputMapping'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'inputMapping', value))} placeholder="params" /></Field>
        <Field label="Output Mapping"><TextInput value={asString(getPathValue(draftData, 'outputMapping'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'outputMapping', value))} placeholder="result" /></Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'reliability')) {
    return (
      <div className="space-y-6">
        <Field label="Timeout (ms)">
          <NumberInput value={asNumber(getPathValue(draftData, 'timeoutMs'), 10000)} min={1} max={600000} onChange={(value) => setDraftData((current) => setPathValue(current, 'timeoutMs', value))} />
          <ErrorText errors={errors} path="timeoutMs" />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Security" description="Keep dependencies and environment variables explicit and auditable." />
      <Field label="Dependencies (JSON Array)">
        <TextAreaInput rows={4} value={asString(getPathValue(draftData, 'dependencies'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'dependencies', value))} placeholder='["lodash"]' />
      </Field>
      <Field label="Environment Variables (JSON)">
        <TextAreaInput rows={4} value={asString(getPathValue(draftData, 'envVars'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'envVars', value))} placeholder='{"MODE":"safe"}' />
      </Field>
    </div>
  );
}

'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, SelectInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function AiConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Name the AI task so outcomes are predictable and easy to trace." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Generate Summary"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Behavior" description="Select model and reasoning profile for this generation task." />
        <Field label="Model">
          <SelectInput
            value={asString(getPathValue(draftData, 'model'), 'gemini-3-flash-preview')}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'model', value))}
            options={[
              { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Preview)' },
              { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro (Preview)' },
            ]}
          />
          <ErrorText errors={errors} path="model" />
        </Field>
        <Field label="Thinking Level">
          <SelectInput
            value={asString(getPathValue(draftData, 'thinkingLevel'), 'high')}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'thinkingLevel', value))}
            options={[
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
              { value: 'minimal', label: 'Minimal' },
            ]}
          />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        <Field label="Prompt" hint="Provide complete instructions and expected output format.">
          <TextAreaInput
            rows={10}
            value={asString(getPathValue(draftData, 'prompt'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'prompt', value))}
            placeholder="Summarize the incident report in 5 bullet points."
          />
          <ErrorText errors={errors} path="prompt" />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Security" description="Avoid inserting secrets directly into prompts. Use templated runtime data only." />
      <p className="text-sm text-[color:var(--subtitle)]">For sensitive data, redact before prompt construction.</p>
    </div>
  );
}

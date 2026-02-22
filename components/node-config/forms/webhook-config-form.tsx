'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, SelectInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function WebhookConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Webhook triggers start workflows from external HTTP calls." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Webhook Trigger"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <Field label="HTTP Method">
          <SelectInput
            value={asString(getPathValue(draftData, 'method'), 'POST')}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'method', value))}
            options={[
              { value: 'POST', label: 'POST' },
              { value: 'GET', label: 'GET' },
              { value: 'PUT', label: 'PUT' },
            ]}
          />
        </Field>
        <Field label="Webhook URL" hint="Leave blank to auto-generate from runtime endpoint mapping.">
          <TextInput
            value={asString(getPathValue(draftData, 'webhookUrl'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'webhookUrl', value))}
            placeholder="https://api.cumulus.dev/v1/webhooks/..."
          />
        </Field>
      </div>
    );
  }

  return <div className="text-sm text-[color:var(--subtitle)]">This node forwards request payload into workflow context.</div>;
}

'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, SelectInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function ErrorConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  const actionType = asString(getPathValue(draftData, 'actionType'), 'email');

  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Configure how workflow errors are handled and notified." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Error Handler"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <Field label="Action Type">
          <SelectInput
            value={actionType}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'actionType', value))}
            options={[
              { value: 'email', label: 'Send Email' },
              { value: 'slack', label: 'Slack Alert' },
              { value: 'webhook', label: 'Webhook' },
            ]}
          />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        {actionType === 'email' ? (
          <>
            <Field label="Recipient"><TextInput value={asString(getPathValue(draftData, 'config.recipient'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'config.recipient', value))} placeholder="support@company.com" /></Field>
            <Field label="Subject"><TextInput value={asString(getPathValue(draftData, 'config.subject'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'config.subject', value))} placeholder="Workflow Error" /></Field>
            <Field label="Body"><TextAreaInput rows={6} value={asString(getPathValue(draftData, 'config.body'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'config.body', value))} placeholder="An error occurred in {{workflow.name}}" /></Field>
          </>
        ) : null}

        {actionType === 'slack' ? (
          <>
            <Field label="Webhook URL"><TextInput value={asString(getPathValue(draftData, 'config.webhookUrl'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'config.webhookUrl', value))} placeholder="{{SECRET_SLACK_WEBHOOK_URL}}" /></Field>
            <Field label="Channel"><TextInput value={asString(getPathValue(draftData, 'config.channel'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'config.channel', value))} placeholder="#alerts" /></Field>
            <Field label="Message"><TextAreaInput rows={5} value={asString(getPathValue(draftData, 'config.message'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'config.message', value))} placeholder="Error in {{workflow.name}}: {{error.message}}" /></Field>
          </>
        ) : null}

        {actionType === 'webhook' ? (
          <>
            <Field label="Webhook URL"><TextInput value={asString(getPathValue(draftData, 'config.webhookUrl'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'config.webhookUrl', value))} placeholder="https://hooks.example.com/errors" /></Field>
            <Field label="Payload (JSON)"><TextAreaInput rows={8} value={asString(getPathValue(draftData, 'config.payload'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'config.payload', value))} placeholder='{"error":"{{error.message}}"}' /></Field>
          </>
        ) : null}
      </div>
    );
  }

  return <div className="text-sm text-[color:var(--subtitle)]">Use templated fields to include workflow and error context in notifications.</div>;
}

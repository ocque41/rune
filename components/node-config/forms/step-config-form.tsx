'use client';

import React, { useState } from 'react';
import ApiConnectorWizard from '@/components/api-connector-wizard';
import { VerifiedSendersDrawer } from '@/components/verified-senders-drawer';
import { Button } from '@/components/ui/button';
import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { getPathValue, setPathValue, asString, sectionVisible, SectionTitle, Field, TextInput, TextAreaInput, SelectInput, ErrorText } from './shared';

function updateWithPath(
  setDraftData: NodeConfigFormProps['setDraftData'],
  path: string,
  value: unknown,
) {
  setDraftData((current) => setPathValue(current, path, value));
}

export function StepConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  const kind = asString(getPathValue(draftData, 'kind'));
  const [showApiWizard, setShowApiWizard] = useState(false);
  const [showVerifiedSenders, setShowVerifiedSenders] = useState(false);

  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6" id="section-general">
        <SectionTitle title="General" description="Set a clear name so teammates instantly know what this step does." />
        <Field label="Label" hint="Use action-oriented wording, for example 'Send Welcome Email'.">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => updateWithPath(setDraftData, 'label', value)}
            placeholder="Step label"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6" id="section-behavior">
        <SectionTitle title="Behavior" description="Configure how this step behaves at runtime." />
        {kind === 'sleep' ? (
          <Field label="Duration" hint="Examples: 10s, 5m, 1h.">
            <TextInput
              value={asString(getPathValue(draftData, 'duration'))}
              onChange={(value) => updateWithPath(setDraftData, 'duration', value)}
              placeholder="5m"
            />
            <ErrorText errors={errors} path="duration" />
          </Field>
        ) : null}

        {kind === 'waitForEvent' ? (
          <>
            <Field label="Event Name" hint="This step waits until the named event is received.">
              <TextInput
                value={asString(getPathValue(draftData, 'waitConfig.event'))}
                onChange={(value) => updateWithPath(setDraftData, 'waitConfig.event', value)}
                placeholder="order.approved"
              />
              <ErrorText errors={errors} path="waitConfig.event" />
            </Field>
            <Field label="Timeout" hint="Optional safety timeout, for example 24h.">
              <TextInput
                value={asString(getPathValue(draftData, 'waitConfig.timeout'))}
                onChange={(value) => updateWithPath(setDraftData, 'waitConfig.timeout', value)}
                placeholder="24h"
              />
            </Field>
          </>
        ) : null}
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6" id="section-inputs">
        <SectionTitle title="Inputs" description="Add all required values so this step runs correctly on first use." />

        {kind === 'httpRequest' ? (
          <>
            <div className="rounded-md border border-[color:var(--border-color)] bg-[color:var(--accent-bg)]/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[color:var(--subtitle)]">
                  Need help configuring request fields? Use the guided wizard.
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowApiWizard((current) => !current)}>
                  {showApiWizard ? 'Hide Wizard' : 'Open Wizard'}
                </Button>
              </div>
              {showApiWizard ? (
                <div className="mt-3">
                  <ApiConnectorWizard
                    embedded
                    initialHttpRequest={getPathValue(draftData, 'httpRequest') as any}
                    onSave={(httpRequest) => {
                      updateWithPath(setDraftData, 'httpRequest', httpRequest ?? {});
                      setShowApiWizard(false);
                    }}
                    onCancel={() => setShowApiWizard(false)}
                  />
                </div>
              ) : null}
            </div>
            <Field label="HTTP Method" hint="Use GET for reads, POST/PUT/PATCH for writes.">
              <SelectInput
                value={asString(getPathValue(draftData, 'httpRequest.method'), 'GET')}
                onValueChange={(value) => updateWithPath(setDraftData, 'httpRequest.method', value)}
                options={[
                  { value: 'GET', label: 'GET' },
                  { value: 'POST', label: 'POST' },
                  { value: 'PUT', label: 'PUT' },
                  { value: 'PATCH', label: 'PATCH' },
                  { value: 'DELETE', label: 'DELETE' },
                ]}
              />
            </Field>
            <Field label="URL" hint="Supports template values like {{params.userId}}.">
              <TextInput
                value={asString(getPathValue(draftData, 'httpRequest.url'))}
                onChange={(value) => updateWithPath(setDraftData, 'httpRequest.url', value)}
                placeholder="https://api.example.com/users/{{params.userId}}"
              />
              <ErrorText errors={errors} path="httpRequest.url" />
            </Field>
            <Field
              label="Headers (JSON)"
              hint={'Use a JSON object. Example: {"Authorization":"Bearer {{SECRET_API_KEY}}"}.'}
            >
              <TextAreaInput
                rows={4}
                value={asString(getPathValue(draftData, 'httpRequest.headers'))}
                onChange={(value) => updateWithPath(setDraftData, 'httpRequest.headers', value)}
                placeholder="{}"
              />
            </Field>
            <Field label="Body (JSON)" hint="For POST/PUT/PATCH, provide request body JSON.">
              <TextAreaInput
                rows={6}
                value={asString(getPathValue(draftData, 'httpRequest.body'))}
                onChange={(value) => updateWithPath(setDraftData, 'httpRequest.body', value)}
                placeholder="{}"
              />
            </Field>
          </>
        ) : null}

        {kind === 'sendEmail' ? (
          <>
            <Field label="Recipient" hint="Single email or templated email from inputs.">
              <TextInput
                value={asString(getPathValue(draftData, 'emailConfig.recipient'))}
                onChange={(value) => updateWithPath(setDraftData, 'emailConfig.recipient', value)}
                placeholder="user@example.com"
              />
            </Field>
            <Field label="Sender" hint="Optional sender address. Leave empty to use default sender.">
              <TextInput
                value={asString(getPathValue(draftData, 'emailConfig.sender'))}
                onChange={(value) => updateWithPath(setDraftData, 'emailConfig.sender', value)}
                placeholder="ops@example.com"
              />
            </Field>
            <div className="flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={() => setShowVerifiedSenders(true)}>
                Manage Verified Senders
              </Button>
            </div>
            <Field label="Subject" hint="Keep subject concise and specific.">
              <TextInput
                value={asString(getPathValue(draftData, 'emailConfig.subject'))}
                onChange={(value) => updateWithPath(setDraftData, 'emailConfig.subject', value)}
                placeholder="Welcome to Cumulus"
              />
            </Field>
            <Field label="Body" hint="Supports template variables like {{params.name}}.">
              <TextAreaInput
                rows={8}
                value={asString(getPathValue(draftData, 'emailConfig.body'))}
                onChange={(value) => updateWithPath(setDraftData, 'emailConfig.body', value)}
                placeholder="Hello {{params.name}}, ..."
              />
            </Field>
            <VerifiedSendersDrawer
              isOpen={showVerifiedSenders}
              onClose={() => setShowVerifiedSenders(false)}
              onSenderVerified={() => undefined}
            />
          </>
        ) : null}

        {kind === 'databaseQuery' ? (
          <>
            <Field label="Database Type" hint="Select the database driver used at runtime.">
              <SelectInput
                value={asString(getPathValue(draftData, 'dbConfig.dbType'), 'postgres')}
                onValueChange={(value) => updateWithPath(setDraftData, 'dbConfig.dbType', value)}
                options={[
                  { value: 'postgres', label: 'PostgreSQL' },
                  { value: 'mysql', label: 'MySQL' },
                  { value: 'mongodb', label: 'MongoDB' },
                  { value: 'generic', label: 'Generic' },
                ]}
              />
            </Field>
            <Field label="Connection String" hint="Use secrets syntax instead of hardcoding credentials.">
              <TextInput
                value={asString(getPathValue(draftData, 'dbConfig.connectionString'))}
                onChange={(value) => updateWithPath(setDraftData, 'dbConfig.connectionString', value)}
                placeholder="{{SECRET_DB_CONNECTION_STRING}}"
              />
            </Field>
            <Field label="Query" hint="Write the exact query this step should execute.">
              <TextAreaInput
                rows={8}
                value={asString(getPathValue(draftData, 'dbConfig.query'))}
                onChange={(value) => updateWithPath(setDraftData, 'dbConfig.query', value)}
                placeholder="SELECT * FROM users LIMIT 10;"
              />
            </Field>
          </>
        ) : null}

        {kind === 'runScript' ? (
          <Field label="Script Code" hint="Write deterministic code and avoid side effects when possible.">
            <TextAreaInput
              rows={10}
              value={asString(getPathValue(draftData, 'scriptConfig.code'))}
              onChange={(value) => updateWithPath(setDraftData, 'scriptConfig.code', value)}
              placeholder="return params;"
            />
          </Field>
        ) : null}

        {kind === 'slackMessage' ? (
          <>
            <Field label="Webhook URL" hint="Use a secret placeholder for production setups.">
              <TextInput
                value={asString(getPathValue(draftData, 'slackConfig.webhookUrl'))}
                onChange={(value) => updateWithPath(setDraftData, 'slackConfig.webhookUrl', value)}
                placeholder="{{SECRET_SLACK_WEBHOOK_URL}}"
              />
            </Field>
            <Field label="Channel" hint="Optional channel override when supported.">
              <TextInput
                value={asString(getPathValue(draftData, 'slackConfig.channel'))}
                onChange={(value) => updateWithPath(setDraftData, 'slackConfig.channel', value)}
                placeholder="#alerts"
              />
            </Field>
            <Field label="Message" hint="Supports template variables from upstream outputs.">
              <TextAreaInput
                rows={6}
                value={asString(getPathValue(draftData, 'slackConfig.message'))}
                onChange={(value) => updateWithPath(setDraftData, 'slackConfig.message', value)}
                placeholder="Workflow {{workflow.name}} completed"
              />
            </Field>
          </>
        ) : null}

        {kind === 'stream' ? (
          <Field label="Message" hint="Content that will be streamed to the output channel.">
            <TextAreaInput
              rows={6}
              value={asString(getPathValue(draftData, 'streamConfig.message'))}
              onChange={(value) => updateWithPath(setDraftData, 'streamConfig.message', value)}
              placeholder="Streaming payload"
            />
          </Field>
        ) : null}
      </div>
    );
  }

  if (sectionVisible(activeSection, 'reliability')) {
    return (
      <div className="space-y-6" id="section-reliability">
        <SectionTitle title="Reliability" description="Protect this step against transient failures and duplicate execution." />
        <Field label="Idempotency Key" hint="Use a stable key when retries might re-send the same operation.">
          <TextInput
            value={asString(getPathValue(draftData, 'idempotencyKey'))}
            onChange={(value) => updateWithPath(setDraftData, 'idempotencyKey', value)}
            placeholder="{{params.requestId}}"
          />
        </Field>
        <Field label="Max Retries" hint="Maximum retry attempts when retry policy is active.">
          <TextInput
            value={asString(getPathValue(draftData, 'errorConfig.maxRetries'))}
            onChange={(value) => updateWithPath(setDraftData, 'errorConfig.maxRetries', Number(value || 0))}
            placeholder="3"
          />
          <ErrorText errors={errors} path="errorConfig.maxRetries" />
        </Field>
        <Field label="Backoff Policy" hint="Exponential is recommended for network/API calls.">
          <SelectInput
            value={asString(getPathValue(draftData, 'errorConfig.backoffPolicy'), 'exponential')}
            onValueChange={(value) => updateWithPath(setDraftData, 'errorConfig.backoffPolicy', value)}
            options={[
              { value: 'exponential', label: 'Exponential' },
              { value: 'linear', label: 'Linear' },
              { value: 'constant', label: 'Constant' },
            ]}
          />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="section-security">
      <SectionTitle title="Security" description="Keep credentials in secrets and avoid plain text credentials in fields." />
      <p className="text-sm text-[color:var(--text)]">
        Use <code className="px-1 py-0.5 rounded bg-[color:var(--accent-bg)]">{'{{SECRET_NAME}}'}</code> placeholders for API keys, tokens, and passwords.
      </p>
    </div>
  );
}

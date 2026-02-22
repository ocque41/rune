'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function ApprovalConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Approval steps stop execution until a reviewer approves or timeout is reached." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Manager Approval"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        <Field label="Approver Email" hint="Primary reviewer email address.">
          <TextInput
            value={asString(getPathValue(draftData, 'approverEmail'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'approverEmail', value))}
            placeholder="approver@company.com"
          />
          <ErrorText errors={errors} path="approverEmail" />
        </Field>
        <Field label="Timeout" hint="Optional timeout to prevent blocked workflows. Example: 24h.">
          <TextInput
            value={asString(getPathValue(draftData, 'timeout'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'timeout', value))}
            placeholder="24h"
          />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Reliability" description="Define clear timeout and fallback actions to avoid indefinite waiting." />
      <p className="text-sm text-[color:var(--subtitle)]">Include enough context in prior steps so approvers can decide quickly.</p>
    </div>
  );
}

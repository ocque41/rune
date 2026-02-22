'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, TextAreaInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

export function TwilioConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Configure SMS delivery with Twilio credentials and message template." />
        <Field label="Label">
          <TextInput value={asString(getPathValue(draftData, 'label'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))} placeholder="Send SMS (Twilio)" />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'inputs')) {
    return (
      <div className="space-y-6">
        <Field label="From Phone Number">
          <TextInput value={asString(getPathValue(draftData, 'fromPhoneNumber'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'fromPhoneNumber', value))} placeholder="{{SECRET_TWILIO_FROM_NUMBER}}" />
          <ErrorText errors={errors} path="fromPhoneNumber" />
        </Field>
        <Field label="To Phone Number">
          <TextInput value={asString(getPathValue(draftData, 'toPhoneNumber'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'toPhoneNumber', value))} placeholder="{{params.phoneNumber}}" />
          <ErrorText errors={errors} path="toPhoneNumber" />
        </Field>
        <Field label="Message Body">
          <TextAreaInput rows={6} value={asString(getPathValue(draftData, 'messageBody'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'messageBody', value))} placeholder="Your order has shipped." />
          <ErrorText errors={errors} path="messageBody" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'security')) {
    return (
      <div className="space-y-6">
        <Field label="Account SID Secret Name">
          <TextInput value={asString(getPathValue(draftData, 'accountSidSecretName'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'accountSidSecretName', value))} placeholder="TWILIO_ACCOUNT_SID" />
          <ErrorText errors={errors} path="accountSidSecretName" />
        </Field>
        <Field label="Auth Token Secret Name">
          <TextInput value={asString(getPathValue(draftData, 'authTokenSecretName'))} onChange={(value) => setDraftData((current) => setPathValue(current, 'authTokenSecretName', value))} placeholder="TWILIO_AUTH_TOKEN" />
          <ErrorText errors={errors} path="authTokenSecretName" />
        </Field>
      </div>
    );
  }

  return <p className="text-sm text-[color:var(--subtitle)]">Keep Twilio credentials in secrets and rotate regularly.</p>;
}

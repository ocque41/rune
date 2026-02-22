'use client';

import type { NodeConfigFormProps } from '@/lib/workflow/node-config-types';
import { SectionTitle, Field, TextInput, SelectInput, ErrorText, asString, getPathValue, setPathValue, sectionVisible } from './shared';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'America/New_York' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo' },
];

export function ScheduleConfigForm({ draftData, setDraftData, errors, activeSection }: NodeConfigFormProps) {
  if (sectionVisible(activeSection, 'general')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="General" description="Name this schedule in a way operations can quickly identify." />
        <Field label="Label">
          <TextInput
            value={asString(getPathValue(draftData, 'label'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'label', value))}
            placeholder="Daily Report Trigger"
          />
          <ErrorText errors={errors} path="label" />
        </Field>
      </div>
    );
  }

  if (sectionVisible(activeSection, 'behavior')) {
    return (
      <div className="space-y-6">
        <SectionTitle title="Behavior" description="Set cron and timezone for predictable triggering." />
        <Field label="Cron Expression" hint="Format: minute hour day month weekday.">
          <TextInput
            value={asString(getPathValue(draftData, 'cron'))}
            onChange={(value) => setDraftData((current) => setPathValue(current, 'cron', value))}
            placeholder="0 9 * * 1-5"
          />
          <ErrorText errors={errors} path="cron" />
        </Field>
        <Field label="Timezone">
          <SelectInput
            value={asString(getPathValue(draftData, 'timezone'), 'UTC')}
            onValueChange={(value) => setDraftData((current) => setPathValue(current, 'timezone', value))}
            options={TIMEZONES}
          />
          <ErrorText errors={errors} path="timezone" />
        </Field>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionTitle title="Guidance" description="Use clear schedule naming and document business intent in workflow description." />
      <p className="text-sm text-[color:var(--subtitle)]">Validate timezone assumptions for globally distributed teams.</p>
    </div>
  );
}

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { NodeConfigErrorMap } from '@/lib/workflow/node-config-types';

export function sectionVisible(activeSection: string, section: string): boolean {
  return activeSection === section;
}

export function getPathValue(data: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = data;
  for (const key of keys) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function setPathValue(data: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  const clone = structuredClone(data) as Record<string, unknown>;

  let current: Record<string, unknown> = clone;
  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1;
    if (isLast) {
      current[key] = value;
      return;
    }

    const next = current[key];
    if (!next || typeof next !== 'object') {
      current[key] = {};
    }

    current = current[key] as Record<string, unknown>;
  });

  return clone;
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function ErrorText({ errors, path }: { errors: NodeConfigErrorMap; path: string }) {
  const message = errors[path];
  if (!message) return null;
  return (
    <p
      className="text-xs text-white/75"
      role="alert"
      data-error-path={path}
      id={`node-config-error-${path.replace(/[^a-zA-Z0-9-_]/g, '-')}`}
    >
      {message}
    </p>
  );
}

export function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h3 className="text-base font-semibold text-[color:var(--title)]">{title}</h3>
      <p className="text-sm text-[color:var(--subtitle)] mt-1">{description}</p>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[color:var(--text)]">{label}</Label>
      {children}
      {hint ? <p className="text-xs text-[color:var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="bg-[color:var(--bg)] border-[color:var(--border-color)] text-[color:var(--text)]"
    />
  );
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <Input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      onChange={(event) => onChange(Number(event.target.value))}
      className="bg-[color:var(--bg)] border-[color:var(--border-color)] text-[color:var(--text)]"
    />
  );
}

export function TextAreaInput({
  value,
  onChange,
  rows = 5,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Textarea
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="bg-[color:var(--bg)] border-[color:var(--border-color)] text-[color:var(--text)]"
    />
  );
}

export function SelectInput({
  value,
  onValueChange,
  options,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-[color:var(--bg)] border-[color:var(--border-color)] text-[color:var(--text)]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CheckboxInput({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(Boolean(value))} />
      <Label className="text-[color:var(--text)]">{label}</Label>
    </div>
  );
}

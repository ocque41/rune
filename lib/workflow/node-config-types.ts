import type { NodeKind } from './node-catalog';

export const NODE_CONFIG_SECTIONS = [
  'general',
  'behavior',
  'inputs',
  'output',
  'reliability',
  'security',
] as const;

export type NodeConfigSection = (typeof NODE_CONFIG_SECTIONS)[number];

export type NodeConfigErrorMap = Record<string, string>;

export interface NodeConfigValidationResult {
  isValid: boolean;
  errors: NodeConfigErrorMap;
}

export interface NodeConfigDraft {
  nodeId: string;
  nodeType: string;
  kind: NodeKind;
  label: string;
  data: Record<string, unknown>;
  sourceNodeVersion: string;
}

export interface NodeConfigModalState {
  isOpen: boolean;
  draft: NodeConfigDraft | null;
  activeSection: NodeConfigSection;
  errors: NodeConfigErrorMap;
  isDirty: boolean;
  hasConflict: boolean;
  conflictMessage?: string;
}

export interface NodeConfigFormProps {
  draftData: Record<string, unknown>;
  setDraftData: (updater: (current: Record<string, unknown>) => Record<string, unknown>) => void;
  errors: NodeConfigErrorMap;
  activeSection: NodeConfigSection;
}

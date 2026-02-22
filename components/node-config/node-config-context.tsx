'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { Node } from '@xyflow/react';
import { getNodeKindDisplayName, resolveNodeKind, withNormalizedNodeData, type NodeKind } from '@/lib/workflow/node-catalog';
import { normalizeNodeConfig, validateNodeConfig } from '@/lib/workflow/node-config-schemas';
import type {
  NodeConfigDraft,
  NodeConfigErrorMap,
  NodeConfigModalState,
  NodeConfigSection,
} from '@/lib/workflow/node-config-types';

interface NodeConfigProviderProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  children: React.ReactNode;
}

interface ApplyOptions {
  force?: boolean;
}

interface NodeConfigContextValue {
  modalState: NodeConfigModalState;
  openNodeConfig: (nodeId: string) => void;
  closeNodeConfig: (force?: boolean) => boolean;
  setActiveSection: (section: NodeConfigSection) => void;
  setDraftData: (updater: (current: Record<string, unknown>) => Record<string, unknown>) => void;
  applyNodeConfig: (options?: ApplyOptions) => boolean;
  resetDraft: () => void;
  reloadDraftFromNode: () => void;
}

const NodeConfigContext = createContext<NodeConfigContextValue | null>(null);

function hashNodeData(data: unknown): string {
  return JSON.stringify(data ?? {});
}

function inferSectionFromErrorPath(path: string): NodeConfigSection {
  if (path === 'label') return 'general';
  if (path.startsWith('errorConfig') || path === 'idempotencyKey') return 'reliability';
  if (path.includes('Secret') || path.includes('secret') || path.includes('Token')) return 'security';
  if (path.startsWith('config') || path.startsWith('condition') || path.startsWith('branches') || path.startsWith('cron') || path.startsWith('timeout')) {
    return 'behavior';
  }
  if (path.startsWith('httpRequest') || path.startsWith('emailConfig') || path.startsWith('dbConfig') || path.startsWith('scriptConfig') || path.startsWith('slackConfig') || path.startsWith('waitConfig') || path.startsWith('workflowId') || path.startsWith('params') || path.startsWith('prompt') || path.startsWith('mapping') || path.startsWith('schema') || path.startsWith('dataPath') || path.startsWith('fromPhoneNumber') || path.startsWith('toPhoneNumber') || path.startsWith('messageBody') || path === 'items') {
    return 'inputs';
  }
  return 'general';
}

function ensureKindAndLabel(data: Record<string, unknown>, fallbackKind: NodeKind): Record<string, unknown> {
  const kind = typeof data.kind === 'string' ? data.kind : fallbackKind;
  const safeKind = (kind as NodeKind) ?? fallbackKind;
  const label = typeof data.label === 'string' && data.label.trim().length > 0
    ? data.label
    : getNodeKindDisplayName(safeKind);

  return {
    ...data,
    kind: safeKind,
    label,
  };
}

export function NodeConfigProvider({ nodes, setNodes, children }: NodeConfigProviderProps) {
  const [modalState, setModalState] = useState<NodeConfigModalState>({
    isOpen: false,
    draft: null,
    activeSection: 'general',
    errors: {},
    isDirty: false,
    hasConflict: false,
    conflictMessage: undefined,
  });
  const [originalData, setOriginalData] = useState<Record<string, unknown> | null>(null);

  const openNodeConfig = useCallback((nodeId: string) => {
    const node = nodes.find((candidate) => candidate.id === nodeId);
    if (!node) {
      return;
    }

    const normalized = withNormalizedNodeData({
      type: node.type,
      data: (node.data ?? {}) as Record<string, unknown>,
    } as Node & { data: Record<string, unknown> });

    const kind = resolveNodeKind(node);
    const draftData = ensureKindAndLabel(structuredClone(normalized), kind);

    const draft: NodeConfigDraft = {
      nodeId,
      nodeType: node.type ?? 'step',
      kind,
      label: String(draftData.label ?? getNodeKindDisplayName(kind)),
      data: draftData,
      sourceNodeVersion: hashNodeData(node.data),
    };

    setOriginalData(structuredClone(draftData));
    setModalState({
      isOpen: true,
      draft,
      activeSection: 'general',
      errors: {},
      isDirty: false,
      hasConflict: false,
      conflictMessage: undefined,
    });
  }, [nodes]);

  const closeNodeConfig = useCallback((force = false) => {
    if (modalState.isDirty && !force) {
      const shouldClose = window.confirm('You have unsaved changes. Close without applying?');
      if (!shouldClose) {
        return false;
      }
    }

    setModalState({
      isOpen: false,
      draft: null,
      activeSection: 'general',
      errors: {},
      isDirty: false,
      hasConflict: false,
      conflictMessage: undefined,
    });
    setOriginalData(null);
    return true;
  }, [modalState.isDirty]);

  const setActiveSection = useCallback((section: NodeConfigSection) => {
    setModalState((current) => ({ ...current, activeSection: section }));
  }, []);

  const setDraftData = useCallback((updater: (current: Record<string, unknown>) => Record<string, unknown>) => {
    setModalState((current) => {
      if (!current.draft) return current;

      const nextData = ensureKindAndLabel(
        updater(current.draft.data),
        current.draft.kind,
      );
      const nextDirty = JSON.stringify(nextData) !== JSON.stringify(originalData ?? {});
      const nextKind = typeof nextData.kind === 'string' ? (nextData.kind as NodeKind) : current.draft.kind;
      const nextLabel = typeof nextData.label === 'string' ? nextData.label : current.draft.label;

      return {
        ...current,
        draft: {
          ...current.draft,
          kind: nextKind,
          label: nextLabel,
          data: nextData,
        },
        isDirty: nextDirty,
        errors: {},
        hasConflict: false,
        conflictMessage: undefined,
      };
    });
  }, [originalData]);

  const resetDraft = useCallback(() => {
    setModalState((current) => {
      if (!current.draft || !originalData) return current;
      const resetData = structuredClone(originalData);
      return {
        ...current,
        draft: {
          ...current.draft,
          data: resetData,
          label: String(resetData.label ?? current.draft.label),
          kind: (resetData.kind as NodeKind) ?? current.draft.kind,
        },
        isDirty: false,
        errors: {},
        hasConflict: false,
        conflictMessage: undefined,
      };
    });
  }, [originalData]);

  const reloadDraftFromNode = useCallback(() => {
    if (!modalState.draft) return;
    const node = nodes.find((candidate) => candidate.id === modalState.draft?.nodeId);
    if (!node) return;

    const normalized = withNormalizedNodeData({
      type: node.type,
      data: (node.data ?? {}) as Record<string, unknown>,
    } as Node & { data: Record<string, unknown> });

    const kind = resolveNodeKind(node);
    const data = ensureKindAndLabel(structuredClone(normalized), kind);

    setOriginalData(structuredClone(data));
    setModalState((current) => {
      if (!current.draft) return current;
      return {
        ...current,
        draft: {
          ...current.draft,
          nodeType: node.type ?? 'step',
          kind,
          label: String(data.label ?? getNodeKindDisplayName(kind)),
          data,
          sourceNodeVersion: hashNodeData(node.data),
        },
        errors: {},
        isDirty: false,
        hasConflict: false,
        conflictMessage: undefined,
      };
    });
  }, [modalState.draft, nodes]);

  const applyNodeConfig = useCallback((options?: ApplyOptions) => {
    if (!modalState.draft) {
      return false;
    }

    const targetNode = nodes.find((candidate) => candidate.id === modalState.draft?.nodeId);
    if (!targetNode) {
      setModalState((current) => ({
        ...current,
        hasConflict: true,
        conflictMessage: 'The node no longer exists. Reload the workflow and try again.',
      }));
      return false;
    }

    const currentVersion = hashNodeData(targetNode.data);
    if (!options?.force && currentVersion !== modalState.draft.sourceNodeVersion) {
      setModalState((current) => ({
        ...current,
        hasConflict: true,
        conflictMessage: 'This node changed while you were editing. Reload latest values or force apply.',
      }));
      return false;
    }

    const validation = validateNodeConfig(modalState.draft.kind, modalState.draft.data);
    if (!validation.isValid) {
      const firstPath = Object.keys(validation.errors)[0] ?? 'label';
      setModalState((current) => ({
        ...current,
        errors: validation.errors,
        activeSection: inferSectionFromErrorPath(firstPath),
      }));
      return false;
    }

    const normalizedData = ensureKindAndLabel(
      normalizeNodeConfig(modalState.draft.kind, modalState.draft.data),
      modalState.draft.kind,
    );

    setNodes((previous) => previous.map((node) => {
      if (node.id !== modalState.draft?.nodeId) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          ...normalizedData,
        },
      };
    }));

    closeNodeConfig(true);
    return true;
  }, [closeNodeConfig, modalState.draft, nodes, setNodes]);

  const value = useMemo<NodeConfigContextValue>(() => ({
    modalState,
    openNodeConfig,
    closeNodeConfig,
    setActiveSection,
    setDraftData,
    applyNodeConfig,
    resetDraft,
    reloadDraftFromNode,
  }), [
    modalState,
    openNodeConfig,
    closeNodeConfig,
    setActiveSection,
    setDraftData,
    applyNodeConfig,
    resetDraft,
    reloadDraftFromNode,
  ]);

  return (
    <NodeConfigContext.Provider value={value}>
      {children}
    </NodeConfigContext.Provider>
  );
}

export function useNodeConfig(): NodeConfigContextValue {
  const context = useContext(NodeConfigContext);
  if (!context) {
    throw new Error('useNodeConfig must be used within NodeConfigProvider.');
  }
  return context;
}

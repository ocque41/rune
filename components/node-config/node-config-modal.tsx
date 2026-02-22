'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import anime from 'animejs';
import { X, RotateCcw, Save, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { NODE_CONFIG_SECTIONS, type NodeConfigSection } from '@/lib/workflow/node-config-types';
import { getNodeKindDisplayName } from '@/lib/workflow/node-catalog';
import { getConfigFormForKind } from './node-config-registry';
import { useNodeConfig } from './node-config-context';

const SECTION_LABELS: Record<NodeConfigSection, string> = {
  general: 'General',
  behavior: 'Behavior',
  inputs: 'Inputs',
  output: 'Output',
  reliability: 'Reliability',
  security: 'Security',
};

export function NodeConfigModal() {
  const {
    modalState,
    closeNodeConfig,
    setActiveSection,
    setDraftData,
    applyNodeConfig,
    resetDraft,
    reloadDraftFromNode,
  } = useNodeConfig();

  const reducedMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const FormComponent = useMemo(() => {
    if (!modalState.draft) return null;
    return getConfigFormForKind(modalState.draft.kind);
  }, [modalState.draft]);

  useEffect(() => {
    if (!modalState.isOpen || reducedMotion || !panelRef.current) return;

    anime({
      targets: panelRef.current,
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 220,
      easing: 'easeOutQuad',
    });
  }, [modalState.isOpen, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !sectionRef.current) return;
    anime({
      targets: sectionRef.current,
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 180,
      easing: 'easeOutQuad',
    });
  }, [modalState.activeSection, reducedMotion]);

  useEffect(() => {
    if (!modalState.isOpen) return;
    const handleSave = (event: KeyboardEvent) => {
      const isSave = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's';
      if (!isSave) return;

      event.preventDefault();
      applyNodeConfig();
    };

    window.addEventListener('keydown', handleSave);
    return () => window.removeEventListener('keydown', handleSave);
  }, [modalState.isOpen, applyNodeConfig]);

  useEffect(() => {
    if (!modalState.isOpen) return;
    const errorPaths = Object.keys(modalState.errors);
    if (!errorPaths.length || !sectionRef.current) return;

    for (const path of errorPaths) {
      const selector = `[data-error-path="${path}"]`;
      const errorNode = sectionRef.current.querySelector<HTMLElement>(selector);
      const fieldContainer = errorNode?.parentElement;
      const control = fieldContainer?.querySelector<HTMLElement>('input, textarea, [role="combobox"], button');
      if (control) {
        control.focus();
        return;
      }
    }

    const firstInteractive = sectionRef.current.querySelector<HTMLElement>('input, textarea, [role="combobox"], button');
    firstInteractive?.focus();
  }, [modalState.errors, modalState.isOpen]);

  if (!modalState.draft || !FormComponent) {
    return null;
  }

  const kindName = getNodeKindDisplayName(modalState.draft.kind);
  const hasErrors = Object.keys(modalState.errors).length > 0;

  return (
    <Dialog open={modalState.isOpen} onOpenChange={(open) => {
      if (!open) closeNodeConfig(false);
    }}>
      <DialogContent
        ref={panelRef}
        showCloseButton={false}
        className="w-screen h-[100dvh] max-w-none rounded-none p-0 border-0 bg-[color:var(--bg)] text-[color:var(--text)]"
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          closeNodeConfig(false);
        }}
      >
        <div className="flex h-full w-full flex-col">
          <DialogHeader className="border-b border-[color:var(--border-color)] px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-semibold text-[color:var(--title)]">
                  Configure Node
                </DialogTitle>
                <p className="text-sm text-[color:var(--subtitle)] mt-1">
                  {modalState.draft.label} · {kindName}
                </p>
              </div>
              <Button variant="ghost" onClick={() => closeNodeConfig(false)} aria-label="Close node configuration">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {modalState.hasConflict ? (
            <div className="mx-6 mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-300" />
                <div className="flex-1">
                  <p className="text-sm text-amber-100">{modalState.conflictMessage}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={reloadDraftFromNode}>Reload Latest</Button>
                    <Button size="sm" variant="destructive" onClick={() => applyNodeConfig({ force: true })}>Force Apply</Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {hasErrors ? (
            <div className="mx-6 mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3" role="alert" aria-live="assertive">
              <p className="text-sm text-red-200 font-medium">Please fix the highlighted fields before applying changes.</p>
            </div>
          ) : null}

          <div className="md:hidden border-b border-[color:var(--border-color)] px-4 py-3 overflow-x-auto">
            <nav className="flex w-max gap-2" aria-label="Configuration sections">
              {NODE_CONFIG_SECTIONS.map((section) => {
                const active = modalState.activeSection === section;
                return (
                  <button
                    key={section}
                    type="button"
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
                      active
                        ? 'bg-[color:var(--accent-bg)] text-[color:var(--title)]'
                        : 'text-[color:var(--subtitle)] hover:bg-[color:var(--accent-bg)]/60 hover:text-[color:var(--text)]',
                    )}
                    onClick={() => setActiveSection(section)}
                  >
                    {SECTION_LABELS[section]}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <aside className="hidden md:flex md:w-64 shrink-0 border-r border-[color:var(--border-color)] p-4">
              <nav className="w-full space-y-1" aria-label="Configuration sections">
                {NODE_CONFIG_SECTIONS.map((section) => {
                  const active = modalState.activeSection === section;
                  return (
                    <button
                      key={section}
                      type="button"
                      className={cn(
                        'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                        active
                          ? 'bg-[color:var(--accent-bg)] text-[color:var(--title)]'
                          : 'text-[color:var(--subtitle)] hover:bg-[color:var(--accent-bg)]/60 hover:text-[color:var(--text)]',
                      )}
                      onClick={() => setActiveSection(section)}
                    >
                      {SECTION_LABELS[section]}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <ScrollArea className="flex-1">
              <div ref={sectionRef} className="mx-auto w-full max-w-4xl px-6 py-6">
                <FormComponent
                  draftData={modalState.draft.data}
                  setDraftData={setDraftData}
                  errors={modalState.errors}
                  activeSection={modalState.activeSection}
                />
              </div>
            </ScrollArea>
          </div>

          <footer className="sticky bottom-0 border-t border-[color:var(--border-color)] bg-[color:var(--bg)]/95 backdrop-blur px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-[color:var(--muted)]">
                {modalState.isDirty ? 'Unsaved changes' : 'No pending changes'}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => closeNodeConfig(false)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={resetDraft} disabled={!modalState.isDirty}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
                <Button onClick={() => applyNodeConfig()}>
                  <Save className="h-4 w-4 mr-1" /> Apply
                </Button>
              </div>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useEffect } from 'react';

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[data-tooltip]',
].join(', ');

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function hasReadableText(value: string | null | undefined): value is string {
  if (!value) return false;
  const text = normalizeText(value);
  return text.length > 0 && text.length <= 100;
}

function deriveTooltipLabel(element: HTMLElement): string | null {
  const explicit = element.getAttribute('data-tooltip');
  if (hasReadableText(explicit)) return normalizeText(explicit);

  const aria = element.getAttribute('aria-label');
  if (hasReadableText(aria)) return normalizeText(aria);

  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    const labelText = ariaLabelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent || '')
      .map((text) => normalizeText(text))
      .filter(Boolean)
      .join(' ');
    if (hasReadableText(labelText)) return labelText;
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) {
    const placeholder = element.getAttribute('placeholder');
    if (hasReadableText(placeholder)) return normalizeText(placeholder);

    const name = element.getAttribute('name');
    if (hasReadableText(name)) return `Field: ${normalizeText(name)}`;
  }

  if (element instanceof HTMLAnchorElement && hasReadableText(element.textContent)) {
    return `Open ${normalizeText(element.textContent)}`;
  }

  const text = normalizeText(element.textContent || '');
  if (text.length > 0 && text.length <= 100) return text;

  return null;
}

function hydrateTooltips(root: ParentNode) {
  const elements = root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR);
  elements.forEach((element) => {
    if (element.hasAttribute('title')) return;
    if (element.closest('[data-disable-auto-tooltip="true"]')) return;

    const label = deriveTooltipLabel(element);
    if (label) {
      element.setAttribute('title', label);
    }
  });
}

export function AutoTooltipHints() {
  useEffect(() => {
    hydrateTooltips(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          hydrateTooltips(mutation.target);
          continue;
        }

        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node.matches(INTERACTIVE_SELECTOR)) {
              hydrateTooltips(node.parentNode || document);
              return;
            }
            hydrateTooltips(node);
          });
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'placeholder', 'data-tooltip', 'title'],
    });

    return () => observer.disconnect();
  }, []);

  return null;
}

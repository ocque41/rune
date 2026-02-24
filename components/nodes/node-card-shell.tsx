'use client';

import React from 'react';
import type { Position } from '@xyflow/react';
import { NodeWrapper } from './node-wrapper';
import { NodeStatusDot } from './node-status';

export type NodeCardTone =
  | 'default'
  | 'trigger'
  | 'logic'
  | 'data'
  | 'ai'
  | 'integration'
  | 'safety'
  | 'group';

const TONE_STYLES: Record<NodeCardTone, {
  shell: string;
  header: string;
  summary: string;
  badge: string;
}> = {
  default: {
    shell: 'bg-[color:var(--metric-surface-2)]',
    header: 'bg-[color:var(--metric-surface-3)] border-white/12',
    summary: 'text-white/72',
    badge: 'bg-white/10 text-white/65 border-white/20',
  },
  trigger: {
    shell: 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-xl before:bg-white/45',
    header: 'bg-[color:var(--metric-surface-3)] border-white/20',
    summary: 'text-white/78',
    badge: 'bg-white/18 text-white/85 border-white/30',
  },
  logic: {
    shell: 'border-dashed border-white/20 bg-[color:var(--metric-surface-2)]',
    header: 'bg-[color:var(--metric-surface-3)] border-white/16',
    summary: 'text-white/72',
    badge: 'bg-white/14 text-white/72 border-white/22',
  },
  data: {
    shell: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] bg-[color:var(--metric-surface-2)]',
    header: 'bg-[color:var(--metric-surface-3)] border-white/16',
    summary: 'text-white/74',
    badge: 'bg-white/13 text-white/72 border-white/20',
  },
  ai: {
    shell: 'bg-[color:var(--metric-surface-3)] border-white/20',
    header: 'bg-[color:var(--metric-surface-3)] border-white/22',
    summary: 'text-white/80',
    badge: 'bg-white/20 text-white/82 border-white/28',
  },
  integration: {
    shell: 'bg-[color:var(--metric-surface-2)] border-white/18',
    header: 'bg-[color:var(--metric-surface-3)] border-white/20',
    summary: 'text-white/74',
    badge: 'bg-white/15 text-white/74 border-white/22',
  },
  safety: {
    shell: 'border-white/30 bg-[color:var(--metric-surface-3)]',
    header: 'bg-[color:var(--metric-surface-3)] border-white/26',
    summary: 'text-white/82',
    badge: 'bg-white/20 text-white/84 border-white/30',
  },
  group: {
    shell: 'border-double border-[3px] border-white/24 bg-[color:var(--metric-surface-2)]',
    header: 'bg-[color:var(--metric-surface-3)] border-white/20',
    summary: 'text-white/72',
    badge: 'bg-white/13 text-white/72 border-white/20',
  },
};

interface NodeCardShellProps {
  selected?: boolean;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  status?: string;
  tone?: NodeCardTone;
  categoryLabel?: string;
  onOpenSettings?: () => void;
  summary?: React.ReactNode;
  className?: string;
  handles?: { type: 'source' | 'target'; position: Position; id?: string }[];
  children?: React.ReactNode;
}

export function NodeCardShell({
  selected,
  title,
  subtitle,
  icon: _icon,
  status,
  tone = 'default',
  categoryLabel,
  onOpenSettings,
  summary,
  className,
  handles,
  children,
}: NodeCardShellProps) {
  const styles = TONE_STYLES[tone];
  void _icon;

  return (
    <NodeWrapper selected={selected} className={`${styles.shell} ${className ?? ''}`} handles={handles}>
      <div className={`flex items-center justify-between border-b px-4 py-3 ${styles.header}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-white/90 truncate">{title}</span>
            <NodeStatusDot status={status} />
            {categoryLabel ? (
              <span className={`hidden md:inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] ${styles.badge}`}>
                {categoryLabel}
              </span>
            ) : null}
          </div>
          {subtitle ? <div className="text-[10px] text-white/55 truncate">{subtitle}</div> : null}
        </div>
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white hover:bg-white/12"
            aria-label={`Configure ${title}`}
            title={`Configure ${title}`}
          >
            Edit
          </button>
        ) : null}
      </div>

      {summary ? (
        <div className={`p-3 text-xs leading-relaxed ${styles.summary}`}>{summary}</div>
      ) : null}

      {children}
    </NodeWrapper>
  );
}

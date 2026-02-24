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
    shell: 'bg-[rgba(10,10,10,0.96)]',
    header: 'bg-[rgba(22,22,22,0.95)] border-white/10',
    summary: 'text-white/70',
    badge: 'bg-white/10 text-white/55 border-white/15',
  },
  trigger: {
    shell: 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-xl before:bg-white/55',
    header: 'bg-[rgba(30,30,30,0.95)] border-white/20',
    summary: 'text-white/78',
    badge: 'bg-white/20 text-white/85 border-white/30',
  },
  logic: {
    shell: 'border-dashed border-white/20 bg-[rgba(11,11,11,0.97)]',
    header: 'bg-[rgba(24,24,24,0.94)] border-white/12',
    summary: 'text-white/70',
    badge: 'bg-white/14 text-white/70 border-white/20',
  },
  data: {
    shell: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] bg-[rgba(13,13,13,0.97)]',
    header: 'bg-[rgba(26,26,26,0.95)] border-white/12',
    summary: 'text-white/72',
    badge: 'bg-white/12 text-white/72 border-white/18',
  },
  ai: {
    shell: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(0,0,0,0.98))]',
    header: 'bg-[rgba(28,28,28,0.95)] border-white/18',
    summary: 'text-white/80',
    badge: 'bg-white/18 text-white/82 border-white/25',
  },
  integration: {
    shell: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.96))]',
    header: 'bg-[rgba(24,24,24,0.96)] border-white/16',
    summary: 'text-white/74',
    badge: 'bg-white/14 text-white/74 border-white/20',
  },
  safety: {
    shell: 'border-white/30 bg-[rgba(18,18,18,0.96)]',
    header: 'bg-[rgba(28,28,28,0.96)] border-white/24',
    summary: 'text-white/80',
    badge: 'bg-white/18 text-white/82 border-white/28',
  },
  group: {
    shell: 'border-double border-[3px] border-white/22 bg-[rgba(10,10,10,0.95)]',
    header: 'bg-[rgba(24,24,24,0.95)] border-white/18',
    summary: 'text-white/72',
    badge: 'bg-white/13 text-white/70 border-white/18',
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
          {subtitle ? <div className="text-[10px] text-white/45 truncate">{subtitle}</div> : null}
        </div>
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded border border-white/10 px-2 py-1 text-[10px] font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white hover:bg-white/10"
            aria-label={`Configure ${title}`}
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

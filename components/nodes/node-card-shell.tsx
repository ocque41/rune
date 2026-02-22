'use client';

import React from 'react';
import type { Position } from '@xyflow/react';
import { Settings } from 'lucide-react';
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
  icon: string;
  summary: string;
  badge: string;
}> = {
  default: {
    shell: '',
    header: 'bg-white/5 border-white/10',
    icon: 'rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20',
    summary: 'text-white/60',
    badge: 'bg-white/8 text-white/50 border-white/10',
  },
  trigger: {
    shell: 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-l-xl before:bg-white/45',
    header: 'bg-white/10 border-white/20',
    icon: 'rounded-full bg-white/15 text-white ring-1 ring-white/25',
    summary: 'text-white/75',
    badge: 'bg-white/15 text-white/75 border-white/20',
  },
  logic: {
    shell: 'border-dashed border-white/25',
    header: 'bg-white/[0.045] border-white/10',
    icon: 'rounded-md bg-white/8 text-white/75 ring-1 ring-white/15',
    summary: 'text-white/65',
    badge: 'bg-white/10 text-white/65 border-white/15',
  },
  data: {
    shell: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
    header: 'bg-[color:var(--accent-bg)]/70 border-white/10',
    icon: 'rounded-md bg-white/12 text-white/75 ring-1 ring-white/20',
    summary: 'text-white/70',
    badge: 'bg-white/10 text-white/70 border-white/15',
  },
  ai: {
    shell: 'bg-[linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.01))]',
    header: 'bg-white/10 border-white/15',
    icon: 'rounded-full bg-white/20 text-white ring-1 ring-white/30',
    summary: 'text-white/80',
    badge: 'bg-white/15 text-white/80 border-white/25',
  },
  integration: {
    shell: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]',
    header: 'bg-white/7 border-white/15',
    icon: 'rounded-lg bg-white/12 text-white/80 ring-1 ring-white/22',
    summary: 'text-white/72',
    badge: 'bg-white/12 text-white/72 border-white/20',
  },
  safety: {
    shell: 'border-white/30 bg-[rgba(36,36,36,0.9)]',
    header: 'bg-white/9 border-white/20',
    icon: 'rounded-md bg-white/14 text-white ring-1 ring-white/25',
    summary: 'text-white/76',
    badge: 'bg-white/16 text-white/80 border-white/25',
  },
  group: {
    shell: 'border-double border-[3px] border-white/25',
    header: 'bg-white/[0.055] border-white/15',
    icon: 'rounded-lg bg-white/10 text-white/75 ring-1 ring-white/20',
    summary: 'text-white/68',
    badge: 'bg-white/10 text-white/68 border-white/15',
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
  icon,
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

  return (
    <NodeWrapper selected={selected} className={`${styles.shell} ${className ?? ''}`} handles={handles}>
      <div className={`flex items-center justify-between border-b px-4 py-3 ${styles.header}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-8 w-8 items-center justify-center ${styles.icon}`}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-white/90 tracking-wide truncate">{title}</span>
              <NodeStatusDot status={status} />
              {categoryLabel ? (
                <span className={`hidden md:inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider ${styles.badge}`}>
                  {categoryLabel}
                </span>
              ) : null}
            </div>
            {subtitle ? <div className="text-[10px] text-white/40 truncate">{subtitle}</div> : null}
          </div>
        </div>
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded p-1.5 transition-colors text-white/45 hover:text-white/90 hover:bg-white/10"
            aria-label={`Configure ${title}`}
          >
            <Settings size={16} />
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

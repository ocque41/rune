'use client';

import React from 'react';
import type { Position } from '@xyflow/react';
import { Settings } from 'lucide-react';
import { NodeWrapper } from './node-wrapper';
import { NodeStatusDot } from './node-status';

interface NodeCardShellProps {
  selected?: boolean;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  status?: string;
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
  onOpenSettings,
  summary,
  className,
  handles,
  children,
}: NodeCardShellProps) {
  return (
    <NodeWrapper selected={selected} className={className} handles={handles}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white/90 tracking-wide truncate">{title}</span>
              <NodeStatusDot status={status} />
            </div>
            {subtitle ? <div className="text-[10px] text-white/40 truncate">{subtitle}</div> : null}
          </div>
        </div>
        {onOpenSettings ? (
          <button
            type="button"
            onClick={onOpenSettings}
            className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
            aria-label={`Configure ${title}`}
          >
            <Settings size={16} />
          </button>
        ) : null}
      </div>

      {summary ? (
        <div className="p-3 text-xs text-white/60 leading-relaxed">{summary}</div>
      ) : null}

      {children}
    </NodeWrapper>
  );
}

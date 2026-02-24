'use client';

import React from 'react';

export type NodeRuntimeStatus = 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure' | 'waiting' | 'skipped';

export function NodeStatusDot({ status }: { status?: string }) {
  if (!status || status === 'idle') return null;

  const normalized = status as NodeRuntimeStatus;
  const classes = normalized === 'running'
    ? 'bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.35)] animate-pulse'
    : normalized === 'completed' || normalized === 'success'
      ? 'bg-white/75 shadow-[0_0_10px_rgba(255,255,255,0.25)]'
      : normalized === 'failed' || normalized === 'failure'
        ? 'bg-white/55 shadow-[0_0_8px_rgba(255,255,255,0.18)]'
        : normalized === 'waiting'
          ? 'bg-white/65 shadow-[0_0_10px_rgba(255,255,255,0.22)] animate-pulse'
          : normalized === 'skipped'
            ? 'bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.12)]'
            : 'bg-white/30';

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${classes}`} aria-label={`Node status: ${status}`} />;
}

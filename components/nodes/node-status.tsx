'use client';

import React from 'react';

export type NodeRuntimeStatus = 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure' | 'waiting' | 'skipped';

export function NodeStatusDot({ status }: { status?: string }) {
  if (!status || status === 'idle') return null;

  const normalized = status as NodeRuntimeStatus;
  const classes = normalized === 'running'
    ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse'
    : normalized === 'completed' || normalized === 'success'
      ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]'
      : normalized === 'failed' || normalized === 'failure'
        ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
        : normalized === 'waiting'
          ? 'bg-yellow-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse'
          : normalized === 'skipped'
            ? 'bg-gray-500 shadow-[0_0_10px_rgba(107,114,128,0.5)]'
            : 'bg-white/30';

  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${classes}`} aria-label={`Node status: ${status}`} />;
}

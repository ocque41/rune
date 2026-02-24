export const WORKFLOW_MODES = ['lineal', 'branching', 'circular'] as const;

export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

export interface WorkflowModeConfig {
  max_node_executions?: number;
  max_runtime_minutes?: number;
  alert_thresholds?: number[];
}

export interface ModeExecutionPolicy {
  mode: WorkflowMode;
  maxNodeExecutions: number;
  maxRuntimeMinutes: number;
  alertThresholds: number[];
}

export const DEFAULT_WORKFLOW_MODE: WorkflowMode = 'branching';

export const DEFAULT_MODE_CONFIG: Record<WorkflowMode, WorkflowModeConfig> = {
  lineal: {},
  branching: {},
  circular: {
    max_node_executions: 100000,
    max_runtime_minutes: 1440,
    alert_thresholds: [60, 80, 95],
  },
};

export function isWorkflowMode(value: unknown): value is WorkflowMode {
  return typeof value === 'string' && WORKFLOW_MODES.includes(value as WorkflowMode);
}

export function normalizeWorkflowMode(value: unknown): WorkflowMode {
  return isWorkflowMode(value) ? value : DEFAULT_WORKFLOW_MODE;
}

export function normalizeWorkflowModeConfig(
  mode: WorkflowMode,
  config: unknown,
): WorkflowModeConfig {
  const source = (config && typeof config === 'object') ? (config as WorkflowModeConfig) : {};
  const defaults = DEFAULT_MODE_CONFIG[mode] ?? {};
  return {
    ...defaults,
    ...source,
  };
}

export function buildModeExecutionPolicy(
  mode: WorkflowMode,
  config: unknown,
): ModeExecutionPolicy {
  const normalized = normalizeWorkflowModeConfig(mode, config);

  const maxNodeExecutions = Math.max(
    1,
    Number.isFinite(normalized.max_node_executions)
      ? Number(normalized.max_node_executions)
      : (mode === 'circular' ? 100000 : 10000),
  );

  const maxRuntimeMinutes = Math.max(
    1,
    Number.isFinite(normalized.max_runtime_minutes)
      ? Number(normalized.max_runtime_minutes)
      : (mode === 'circular' ? 1440 : 120),
  );

  const thresholdSource = Array.isArray(normalized.alert_thresholds)
    ? normalized.alert_thresholds
    : [60, 80, 95];
  const alertThresholds = thresholdSource
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n) && n > 0 && n < 100)
    .sort((a, b) => a - b);

  return {
    mode,
    maxNodeExecutions,
    maxRuntimeMinutes,
    alertThresholds: alertThresholds.length ? alertThresholds : [60, 80, 95],
  };
}


export type WorkflowMetric = {
  label: string;
  value: string;
};

export type WorkflowItem = {
  id: string;
  name: string;
  grade: number; // 1–10
  metrics: WorkflowMetric[];
  color: string;
  tags: string[];
  summary: string;
};

export const workflowFallbacks: WorkflowItem[] = [
  {
    id: "placeholder-workflow",
    name: "No workflows yet",
    grade: 0,
    color: "#AAAAAA",
    summary: "Create a workflow in the Editor to populate the wheel.",
    metrics: [
      { label: "Nodes", value: "0" },
      { label: "Edges", value: "0" },
      { label: "Updated", value: "—" }
    ],
    tags: []
  }
];

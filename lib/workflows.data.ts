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

export const workflows: WorkflowItem[] = [
  {
    id: "atlas-sweep",
    name: "Atlas Sweep",
    grade: 9,
    color: "#7CFF8B",
    summary: "High‑fidelity ingestion + realtime indexing.",
    metrics: [
      { label: "Latency", value: "42ms" },
      { label: "Success", value: "99.2%" },
      { label: "Throughput", value: "1.8k/s" }
    ],
    tags: ["ingest", "realtime", "index"]
  },
  {
    id: "signal-weave",
    name: "Signal Weave",
    grade: 8,
    color: "#7CD3FF",
    summary: "Multi‑channel enrichment + scoring.",
    metrics: [
      { label: "Score", value: "0.91" },
      { label: "Cost", value: "$0.004" },
      { label: "Drift", value: "‑1.2%" }
    ],
    tags: ["enrich", "score"]
  },
  {
    id: "vector-prism",
    name: "Vector Prism",
    grade: 10,
    color: "#E5C6FF",
    summary: "Semantic routing + memory retrieval.",
    metrics: [
      { label: "Recall", value: "96%" },
      { label: "P99", value: "88ms" },
      { label: "Cache", value: "82%" }
    ],
    tags: ["semantic", "routing"]
  },
  {
    id: "pulse-forge",
    name: "Pulse Forge",
    grade: 7,
    color: "#FFC27C",
    summary: "Batch execution with adaptive retries.",
    metrics: [
      { label: "Batch", value: "2.4k" },
      { label: "Retry", value: "1.3%" },
      { label: "Queue", value: "0.6s" }
    ],
    tags: ["batch", "retries"]
  },
  {
    id: "nebula-guard",
    name: "Nebula Guard",
    grade: 8,
    color: "#FF7C9C",
    summary: "Policy gate + anomaly detection.",
    metrics: [
      { label: "Anomaly", value: "0.7%" },
      { label: "Risk", value: "Low" },
      { label: "Block", value: "32" }
    ],
    tags: ["policy", "security"]
  }
];

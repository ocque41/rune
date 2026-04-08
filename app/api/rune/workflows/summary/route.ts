import { NextResponse } from "next/server";
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { withTrace } from "@/lib/trace";

const WORKFLOW_COLORS = ["#7CFF8B", "#7CD3FF", "#E5C6FF", "#FFC27C", "#FF7C9C", "#AAAAAA"];

export const dynamic = "force-dynamic";

export async function GET() {
  return withTrace("api.workflows.summary", async () => {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ workflows: [] });
      }

      const { data, error } = await supabase
        .from("rune_workflows")
        .select("id, name, description, updated_at, graph_json")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const workflows = (data || []).map((workflow: any, index: number) => {
        const graph = workflow.graph_json || workflow.graph || {};
        const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        const edges = Array.isArray(graph.edges) ? graph.edges : [];

        const nodeCount = nodes.length;
        const edgeCount = edges.length;
        const gradeBase = nodeCount + edgeCount;
        const grade = gradeBase > 0 ? Math.min(10, Math.max(1, Math.round(gradeBase / 3))) : 0;

        const tags = Array.from(new Set(nodes.map((node: any) => node?.type).filter(Boolean))).slice(0, 3);

        return {
          id: workflow.id,
          name: workflow.name,
          summary: workflow.description || `${nodeCount} nodes · ${edgeCount} edges`,
          grade,
          color: WORKFLOW_COLORS[index % WORKFLOW_COLORS.length],
          tags,
          metrics: [
            { label: "Nodes", value: `${nodeCount}` },
            { label: "Edges", value: `${edgeCount}` },
            { label: "Updated", value: workflow.updated_at ? new Date(workflow.updated_at).toLocaleDateString() : "—" }
          ]
        };
      });

      return NextResponse.json({ workflows });
    } catch (error: unknown) {
      console.error("Workflow summary error:", error);
      const message = error instanceof Error ? error.message : "Failed to load workflow summaries";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}

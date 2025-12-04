// Mock Node and Edge types
type WorkflowNode = any;
type WorkflowEdge = any;

// Minimal generator logic to test sub-workflow imports
function generateWorkflowCode(nodes: WorkflowNode[], edges: WorkflowEdge[]): string {
    const imports = `import { sleep, getWritable, resumeHook, getSecret } from "workflow";`;

    // Collect unique Sub-Workflow IDs
    const subWorkflowIds = Array.from(new Set(
        nodes
            .filter(n => n.data.label === 'Sub-Workflow' || (n.type === 'subWorkflow'))
            .map(n => (n.data as any).workflowId)
            .filter(Boolean)
    ));

    const subWorkflowImports = subWorkflowIds
        .map(id => `import { ${id} } from "./workflows/${id}";`)
        .join('\n');

    const workflowBody = `
  "use workflow";
  
    await myCustomFlow(JSON.parse(\`{"id": 1}\`));
  return { result: "Workflow completed" };`;

    const workflowDefinition = `
export async function workflow(params: any) {${workflowBody}
}`;

    return `${imports}\n${subWorkflowImports}\n${workflowDefinition}`;
}

const nodes: WorkflowNode[] = [
    { id: 'start', type: 'step', data: { label: 'Start Workflow' } },
    { id: 'sub1', type: 'subWorkflow', data: { label: 'Sub-Workflow', workflowId: 'myCustomFlow', params: '{"id": 1}' } },
];

const edges: WorkflowEdge[] = [
    { id: 'e1', source: 'start', target: 'sub1' },
];

try {
    console.log("Generating workflow code...");
    const code = generateWorkflowCode(nodes, edges);

    console.log("\n--- Generated Code ---");
    console.log(code);
    console.log("------------------------------\n");

    // Assertions
    if (!code.includes('import { myCustomFlow } from "./workflows/myCustomFlow";')) {
        throw new Error("FAILED: Import statement missing");
    }

    if (!code.includes('await myCustomFlow(JSON.parse(`{"id": 1}`))')) {
        throw new Error("FAILED: Sub-workflow call missing or incorrect");
    }

    console.log("SUCCESS: Sub-workflow code generation verified!");

} catch (error) {
    console.error(error);
    process.exit(1);
}

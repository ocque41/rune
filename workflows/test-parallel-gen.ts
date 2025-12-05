
import { generateWorkflowCode } from '../lib/workflow-generator';

// Mock Node and Edge types to avoid importing from @xyflow/react in Node environment
type Node = any;
type Edge = any;

const nodes: Node[] = [
    { id: 'start', type: 'step', data: { label: 'Start Workflow' } },
    { id: 'parallel', type: 'parallel', data: { label: 'Parallel Split', branches: 2 } },
    { id: 'branch1_step', type: 'step', data: { label: 'Branch 1 Step' } },
    { id: 'branch2_step', type: 'step', data: { label: 'Branch 2 Step' } },
    { id: 'merge_step', type: 'step', data: { label: 'Merge Step' } },
];

const edges: Edge[] = [
    { id: 'e1', source: 'start', target: 'parallel' },
    { id: 'e2', source: 'parallel', sourceHandle: 'branch-0', target: 'branch1_step' },
    { id: 'e3', source: 'parallel', sourceHandle: 'branch-1', target: 'branch2_step' },
    { id: 'e4', source: 'parallel', sourceHandle: 'merge', target: 'merge_step' },
];

try {
    console.log("Generating workflow code...");
    const code = generateWorkflowCode(nodes, edges);

    console.log("\n--- Generated Code Snippet ---");
    // Extract the workflow function body for inspection
    const workflowBody = code.match(/export async function workflow\(params: any\) \{([\s\S]*?)\}/)?.[1];
    console.log(workflowBody);
    console.log("------------------------------\n");

    // Assertions
    if (!code.includes('Promise.all([')) {
        throw new Error("FAILED: Code does not contain Promise.all");
    }

    if (!code.includes('await branch1Step({})')) {
        throw new Error("FAILED: Branch 1 step not found");
    }

    if (!code.includes('await branch2Step({})')) {
        throw new Error("FAILED: Branch 2 step not found");
    }

    if (!code.includes('await mergeStep({})')) {
        throw new Error("FAILED: Merge step not found");
    }

    // Check structure: Promise.all should wrap the branches
    // This is a loose check, but good enough for now
    const promiseAllIndex = code.indexOf('Promise.all([');
    const branch1Index = code.indexOf('branch1Step', promiseAllIndex);
    const branch2Index = code.indexOf('branch2Step', promiseAllIndex);
    const mergeIndex = code.indexOf('mergeStep', promiseAllIndex);

    if (branch1Index === -1 || branch2Index === -1) {
        throw new Error("FAILED: Branches should be inside/after Promise.all start");
    }

    // Merge step should be AFTER the Promise.all block (which is hard to check strictly with regex, 
    // but we can check it appears after the branches)
    if (mergeIndex < branch1Index || mergeIndex < branch2Index) {
        throw new Error("FAILED: Merge step should be after branches");
    }

    console.log("SUCCESS: Parallel code generation verified!");

} catch (error) {
    console.error(error);
    process.exit(1);
}

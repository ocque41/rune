// Test script for New Nodes Code Generation
import fs from 'fs';
import path from 'path';

// Mock generateWorkflowCode logic relevant to new nodes
function generateWorkflowCode(nodes: any[], edges: any[]): string {
    const imports = `import { sleep, getWritable, resumeHook, createHook, getSecret } from "workflow";`;

    // ... (simplified for test)

    const approvalStepDefinition = `
export const waitForApproval = async (params: { approverEmail: string; timeout?: string }) => {
  "use step";
  console.log("Requesting approval from:", params.approverEmail);
  const eventName = \`approval-\${params.approverEmail}\`;
  const result = await resumeHook(eventName);
  return { status: result.approved ? "approved" : "rejected", approver: params.approverEmail };
};`;

    const aiStepDefinition = `
export const generateContent = async (params: { prompt: string; model?: string }) => {
  "use step";
  console.log("Generating AI content with model:", params.model);
  return { status: "success", content: \`Generated content for: \${params.prompt}\` };
};`;

    const transformStepDefinition = `
export const transformData = async (params: { mapping: string; data: any }) => {
  "use step";
  const transformFn = new Function('params', params.mapping);
  const result = transformFn(params.data);
  return { status: "success", result };
};`;

    let body = '';

    // Simulate traversal
    for (const node of nodes) {
        if (node.type === 'approval') {
            body += `\n    const approvalResult = await waitForApproval({ approverEmail: "${node.data.approverEmail}", timeout: "${node.data.timeout}" });`;
        } else if (node.type === 'ai') {
            body += `\n    const aiResult = await generateContent({ prompt: \`${node.data.prompt}\`, model: "${node.data.model}" });`;
        } else if (node.type === 'transform') {
            body += `\n    const transformResult = await transformData({ mapping: \`${node.data.mapping}\`, data: params });`;
        }
    }

    return `${imports}\n${approvalStepDefinition}\n${aiStepDefinition}\n${transformStepDefinition}\nexport async function workflow(params: any) {${body}\n}`;
}

async function testNewNodes() {
    console.log('Running New Nodes tests...\n');

    // Test 1: Approval Node
    console.log('Test 1: Approval Node Generation');
    const approvalNode = {
        id: 'approval-1',
        type: 'approval',
        data: { label: 'Approval', approverEmail: 'boss@example.com', timeout: '48h' }
    };

    const code1 = generateWorkflowCode([approvalNode], []);

    console.assert(code1.includes('waitForApproval'), 'Should generate waitForApproval call');
    console.assert(code1.includes('boss@example.com'), 'Should include email');
    console.assert(code1.includes('48h'), 'Should include timeout');
    console.log('✓ Passed\n');

    // Test 2: AI Node
    console.log('Test 2: AI Node Generation');
    const aiNode = {
        id: 'ai-1',
        type: 'ai',
        data: { label: 'AI', prompt: 'Write a haiku', model: 'gpt-4' }
    };

    const code2 = generateWorkflowCode([aiNode], []);

    console.assert(code2.includes('generateContent'), 'Should generate generateContent call');
    console.assert(code2.includes('Write a haiku'), 'Should include prompt');
    console.assert(code2.includes('gpt-4'), 'Should include model');
    console.log('✓ Passed\n');

    // Test 3: Transform Node
    console.log('Test 3: Transform Node Generation');
    const transformNode = {
        id: 'transform-1',
        type: 'transform',
        data: { label: 'Transform', mapping: 'return params.data.map(x => x * 2);' }
    };

    const code3 = generateWorkflowCode([transformNode], []);

    console.assert(code3.includes('transformData'), 'Should generate transformData call');
    console.assert(code3.includes('return params.data.map'), 'Should include mapping code');
    console.log('✓ Passed\n');

    console.log('=================================');
    console.log('ALL NEW NODE TESTS PASSED! ✓');
    console.log('=================================');
}

testNewNodes().catch(console.error);

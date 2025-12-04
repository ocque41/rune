import { Node, Edge } from '@xyflow/react';
import { generateWorkflowCode } from './workflow-generator';

/**
 * Generate simulation code with stubbed step functions
 * This allows testing workflow logic without side effects
 */
export function generateSimulationCode(nodes: Node[], edges: Edge[]): string {
    // First generate the normal workflow code
    const workflowCode = generateWorkflowCode(nodes, edges);

    // Add simulation stubs at the top
    const simulationStubs = `
// ===== SIMULATION MODE =====
// All step functions are stubbed for testing
// No real API calls, emails, or database operations will be executed

let simulationLog: string[] = [];

export function getSimulationLog(): string[] {
  return simulationLog;
}

export function clearSimulationLog() {
  simulationLog = [];
}

// Stub the workflow helpers
const sleep = async (duration: string) => {
  simulationLog.push(\`[SLEEP] Sleeping for \${duration}\`);
  // In simulation, we don't actually sleep
  return Promise.resolve();
};

const getWritable = () => {
  simulationLog.push('[STREAM] Getting writable stream');
  // Return a mock writable stream
  return {
    getWriter: () => ({
      write: async (data: any) => {
        simulationLog.push(\`[STREAM] Writing: \${new TextDecoder().decode(data)}\`);
      },
      releaseLock: () => {}
    })
  };
};

const resumeHook = async (eventName: string) => {
  simulationLog.push(\`[WAIT] Waiting for event: \${eventName}\`);
  // In simulation, immediately resume with mock data
  return { event: eventName, data: { simulated: true } };
};

const getSecret = (secretName: string) => {
  simulationLog.push(\`[SECRET] Accessing secret: \${secretName}\`);
  return \`SIMULATED_\${secretName}\`;
};

// Override fetch for HTTP requests
const originalFetch = global.fetch;
global.fetch = async (url: any, options?: any) => {
  simulationLog.push(\`[HTTP] \${options?.method || 'GET'} \${url}\`);
  // Return mock response
  return {
    status: 200,
    json: async () => ({ simulated: true, url }),
    text: async () => 'Simulated response'
  } as any;
};
`;

    // Replace the real imports with simulation versions
    const simulatedCode = workflowCode.replace(
        'import { sleep, getWritable, resumeHook, getSecret } from "workflow";',
        '// Original imports replaced with simulation stubs above'
    );

    // Wrap the entire workflow code
    return `${simulationStubs}\n\n${simulatedCode}\n\n// Restore original fetch after simulation\nexport function cleanupSimulation() {\n  global.fetch = originalFetch;\n}`;
}

/**
 * Generate a test file that runs the simulated workflow
 */
export function generateSimulationTest(nodes: Node[], edges: Edge[], workflowName: string = 'workflow'): string {
    return `
import { ${workflowName}, getSimulationLog, clearSimulationLog, cleanupSimulation } from './simulated-workflow';

async function runSimulation() {
  console.log('\\n========== WORKFLOW SIMULATION ==========\\n');
  
  clearSimulationLog();
  
  try {
    const result = await ${workflowName}({ test: true });
    
    console.log('\\n--- Simulation Log ---');
    getSimulationLog().forEach(entry => console.log(entry));
    
    console.log('\\n--- Result ---');
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\\n========== SIMULATION COMPLETE ==========\\n');
  } catch (error) {
    console.error('\\nSimulation failed:', error);
  } finally {
    cleanupSimulation();
  }
}

runSimulation();
`;
}

/**
 * Create mock data for different step types
 */
export function getMockStepData(nodeType: string, nodeLabel: string): any {
    switch (nodeLabel) {
        case 'HTTP Request':
            return {
                status: 200,
                data: { simulated: true, message: 'Mock HTTP response' }
            };

        case 'Send Email':
            return {
                status: 'sent',
                recipient: 'test@example.com',
                messageId: 'simulated-123'
            };

        case 'Database Query':
            return {
                status: 'success',
                rows: [
                    { id: 1, name: 'Mock Record 1' },
                    { id: 2, name: 'Mock Record 2' }
                ],
                rowCount: 2
            };

        case 'Run Script':
            return {
                status: 'success',
                result: 'Mock script result'
            };

        case 'Slack Message':
            return {
                status: 'sent',
                channel: '#general',
                ts: '1234567890.123456'
            };

        case 'Stream':
            return {
                status: 'streamed',
                message: 'Mock stream update'
            };

        case 'Wait for Event':
            return {
                status: 'received',
                event: 'mock-event',
                data: { simulated: true }
            };

        default:
            return {
                status: 'success',
                step: nodeLabel,
                simulated: true
            };
    }
}

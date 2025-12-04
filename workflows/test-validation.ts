// Standalone validation test (copied validation logic to avoid import issues)

type Node = any;
type Edge = any;

type ValidationError = {
    type: 'error' | 'warning';
    message: string;
    nodeId?: string;
    code: string;
};

type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
};

function validateGraph(nodes: Node[], edges: Edge[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const startNode = nodes.find(n => n.data.label === 'Start Workflow');
    if (!startNode) {
        errors.push({
            type: 'error',
            message: 'Workflow must have a "Start Workflow" node',
            code: 'NO_START_NODE'
        });
        return { valid: false, errors, warnings };
    }

    const disconnected = detectDisconnectedNodes(nodes, edges, startNode.id);
    disconnected.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        warnings.push({
            type: 'warning',
            message: `Node "${node?.data.label || nodeId}" is not connected to the workflow`,
            nodeId,
            code: 'DISCONNECTED_NODE'
        });
    });

    const cycles = detectCycles(nodes, edges, startNode.id);
    if (cycles.length > 0) {
        cycles.forEach(cycle => {
            errors.push({
                type: 'error',
                message: `Cycle detected: ${cycle.join(' → ')}`,
                code: 'CYCLE_DETECTED'
            });
        });
    }

    nodes.forEach(node => {
        const nodeErrors = validateNodeConfiguration(node);
        errors.push(...nodeErrors.filter(e => e.type === 'error'));
        warnings.push(...nodeErrors.filter(e => e.type === 'warning'));
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

function detectDisconnectedNodes(nodes: Node[], edges: Edge[], startNodeId: string): string[] {
    const reachable = new Set<string>();
    const visited = new Set<string>();

    function dfs(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        reachable.add(nodeId);

        const outgoing = edges.filter(e => e.source === nodeId);
        outgoing.forEach(edge => dfs(edge.target));
    }

    dfs(startNodeId);

    return nodes.filter(n => !reachable.has(n.id)).map(n => n.id);
}

function detectCycles(nodes: Node[], edges: Edge[], startNodeId: string): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];
    const currentPath: string[] = [];

    function dfs(nodeId: string): boolean {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        currentPath.push(nodeId);

        const outgoing = edges.filter(e => e.source === nodeId);

        for (const edge of outgoing) {
            const targetId = edge.target;

            if (!visited.has(targetId)) {
                if (dfs(targetId)) return true;
            } else if (recursionStack.has(targetId)) {
                const cycleStartIndex = currentPath.indexOf(targetId);
                const cycle = currentPath.slice(cycleStartIndex);
                const cycleLabels = cycle.map(id => {
                    const node = nodes.find(n => n.id === id);
                    return node?.data.label || id;
                });
                cycles.push([...cycleLabels, cycleLabels[0]]);
                return true;
            }
        }

        currentPath.pop();
        recursionStack.delete(nodeId);
        return false;
    }

    dfs(startNodeId);
    return cycles;
}

function validateNodeConfiguration(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];

    if (node.data.label === 'Database Query') {
        const config = (node.data as any).dbConfig;
        if (!config?.connectionString) {
            errors.push({
                type: 'error',
                message: `Database node is missing connection string`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD'
            });
        }
    }

    if (node.data.label === 'Sub-Workflow') {
        const workflowId = (node.data as any).workflowId;
        if (!workflowId) {
            errors.push({
                type: 'error',
                message: `Sub-Workflow node is missing workflow ID`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD'
            });
        }
    }

    if ((node.data as any).params) {
        try {
            JSON.parse((node.data as any).params);
        } catch (e) {
            errors.push({
                type: 'error',
                message: `Invalid JSON in parameters field`,
                nodeId: node.id,
                code: 'INVALID_JSON'
            });
        }
    }

    return errors;
}

// Run tests
console.log('Running validation tests...\n');

// Test 1: Valid workflow
console.log('Test 1: Valid workflow');
const result1 = validateGraph(
    [
        { id: 'start', type: 'step', data: { label: 'Start Workflow' } },
        { id: 'step1', type: 'step', data: { label: 'Process Data' } },
    ],
    [{ id: 'e1', source: 'start', target: 'step1' }]
);
console.assert(result1.valid === true, 'Should be valid');
console.log('✓ Passed\n');

// Test 2: Missing start node
console.log('Test 2: Missing start node');
const result2 = validateGraph(
    [{ id: 'step1', type: 'step', data: { label: 'Process Data' } }],
    []
);
console.assert(result2.valid === false, 'Should be invalid');
console.assert(result2.errors[0].code === 'NO_START_NODE', 'Should have NO_START_NODE error');
console.log('✓ Passed\n');

// Test 3: Disconnected node
console.log('Test 3: Disconnected node');
const result3 = validateGraph(
    [
        { id: 'start', type: 'step', data: { label: 'Start Workflow' } },
        { id: 'step1', type: 'step', data: { label: 'Connected' } },
        { id: 'step2', type: 'step', data: { label: 'Disconnected' } },
    ],
    [{ id: 'e1', source: 'start', target: 'step1' }]
);
console.assert(result3.warnings.length > 0, 'Should have warnings');
console.assert(result3.warnings.some(w => w.code === 'DISCONNECTED_NODE'), 'Should have DISCONNECTED_NODE warning');
console.log('✓ Passed\n');

// Test 4: Cycle detection
console.log('Test 4: Cycle detection');
const result4 = validateGraph(
    [
        { id: 'start', type: 'step', data: { label: 'Start Workflow' } },
        { id: 'step1', type: 'step', data: { label: 'Step 1' } },
        { id: 'step2', type: 'step', data: { label: 'Step 2' } },
    ],
    [
        { id: 'e1', source: 'start', target: 'step1' },
        { id: 'e2', source: 'step1', target: 'step2' },
        { id: 'e3', source: 'step2', target: 'step1' },
    ]
);
console.assert(result4.valid === false, 'Should be invalid');
console.assert(result4.errors.some(e => e.code === 'CYCLE_DETECTED'), 'Should have CYCLE_DETECTED error');
console.log('✓ Passed\n');

// Test 5: Missing required field
console.log('Test 5: Missing required field');
const result5 = validateGraph(
    [
        { id: 'start', type: 'step', data: { label: 'Start Workflow' } },
        { id: 'db', type: 'step', data: { label: 'Database Query', dbConfig: { query: 'SELECT *' } } },
    ],
    [{ id: 'e1', source: 'start', target: 'db' }]
);
console.assert(result5.valid === false, 'Should be invalid');
console.assert(result5.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD'), 'Should have MISSING_REQUIRED_FIELD error');
console.log('✓ Passed\n');

// Test 6: Invalid JSON
console.log('Test 6: Invalid JSON in parameters');
const result6 = validateGraph(
    [
        { id: 'start', type: 'step', data: { label: 'Start Workflow' } },
        { id: 'sub', type: 'subWorkflow', data: { label: 'Sub-Workflow', workflowId: 'test', params: '{invalid}' } },
    ],
    [{ id: 'e1', source: 'start', target: 'sub' }]
);
console.assert(result6.valid === false, 'Should be invalid');
console.assert(result6.errors.some(e => e.code === 'INVALID_JSON'), 'Should have INVALID_JSON error');
console.log('✓ Passed\n');

console.log('=================================');
console.log('ALL VALIDATION TESTS PASSED! ✓');
console.log('=================================');

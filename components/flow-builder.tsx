'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    Connection,
    Edge,
    Node,
    BackgroundVariant,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Sidebar } from './sidebar';
import StepNode from './nodes/step-node';
import IfNode from './nodes/if-node';
import LoopNode from './nodes/loop-node';
import ParallelNode from './nodes/parallel-node';
import SubWorkflowNode from './nodes/sub-workflow-node';
import { ScheduleNode } from './nodes/schedule-node';
import { ApprovalNode } from './nodes/approval-node';
import { AINode } from './nodes/ai-node';
import { TransformNode } from './nodes/transform-node';
import { generateWorkflowCode } from '@/lib/workflow-generator';
import { validateGraph, ValidationResult } from '@/lib/workflow-validator';
import { LayoutTemplate, AlertCircle, X } from 'lucide-react';
import { templates, Template } from '@/lib/templates';

const nodeTypes = {
    step: StepNode,
    if: IfNode,
    loop: LoopNode,
    parallel: ParallelNode,
    subWorkflow: SubWorkflowNode,
    schedule: ScheduleNode,
    approval: ApprovalNode,
    ai: AINode,
    transform: TransformNode,
} as any;

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'step',
        position: { x: 250, y: 50 },
        data: { label: 'Start Workflow', description: 'Triggered manually' },
    },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

const FlowBuilderContent = ({
    onSave,
    onRun,
    savedFilename
}: {
    onSave?: (code: string) => void;
    onRun?: () => void;
    savedFilename?: string | null;
}) => {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const { getNodes, getEdges } = useReactFlow();
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [showValidation, setShowValidation] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const type = event.dataTransfer.getData('application/reactflow');
            const label = event.dataTransfer.getData('application/reactflow/label');

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const newNode: Node = {
                id: getId(),
                type,
                position,
                data: { label: label || `${type} node` },
            };

            setNodes((nds) => nds.concat(newNode));
        },
        [reactFlowInstance, setNodes],
    );

    const onSaveDraft = useCallback(async () => {
        if (!nodes.length) return;

        const code = generateWorkflowCode(nodes, edges);
        // Use a default filename/slug for now
        const filename = 'my-workflow.ts';

        try {
            const response = await fetch('/api/workflows/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, filename }),
            });

            if (!response.ok) throw new Error('Failed to save');

            console.log('Saved draft successfully');
            alert('Draft saved!');
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save draft');
        }
    }, [nodes, edges]);

    const onDeploy = useCallback(async () => {
        try {
            const response = await fetch('/api/workflows/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: 'my-workflow' }),
            });

            if (!response.ok) throw new Error('Failed to deploy');

            const data = await response.json();
            console.log(`Deployed version ${data.version}`);
            alert(`Deployed version ${data.version} successfully!`);
        } catch (error) {
            console.error('Deploy error:', error);
            alert('Failed to deploy');
        }
    }, []);

    const loadTemplate = useCallback((template: Template) => {
        setNodes(template.nodes);
        setEdges(template.edges);
        setShowTemplates(false);
    }, [setNodes, setEdges]);

    return (
        <div className="flex h-[calc(100vh-64px)] w-full flex-row overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
            <Sidebar />
            <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    fitView
                    style={{ backgroundColor: 'var(--background)' }}
                >
                    <Controls style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)',
                        color: 'var(--foreground-body)'
                    }} className="!shadow-none [&>button]:!border-transparent" />
                    <Background color="var(--foreground-subtitle)" gap={16} size={1} variant={BackgroundVariant.Dots} className="opacity-10" />
                    <MiniMap
                        style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}
                        className="!shadow-none"
                        nodeColor={(n) => {
                            return 'var(--foreground-subtitle)';
                        }}
                    />
                    <div className="absolute right-4 top-4 z-10 flex gap-3">
                        <button
                            onClick={() => setShowTemplates(true)}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <LayoutTemplate size={14} />
                            Templates
                        </button>
                        <button
                            onClick={() => {
                                const result = validateGraph(getNodes(), getEdges());
                                setValidationResult(result);
                                setShowValidation(true);
                            }}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <AlertCircle size={14} />
                            Validate
                        </button>
                        <button
                            onClick={onSaveDraft}
                            className="px-6 py-2 text-sm font-medium transition-all"
                            style={{
                                backgroundColor: 'var(--foreground-title)',
                                color: 'var(--background)',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}
                        >
                            Save Draft
                        </button>
                        <button
                            onClick={onDeploy}
                            className="px-6 py-2 text-sm font-medium transition-all"
                            style={{
                                backgroundColor: 'var(--foreground-body)',
                                color: 'var(--background)',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}
                        >
                            Deploy
                        </button>
                    </div>
                </ReactFlow>

                {/* Templates Modal */}
                {showTemplates && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-[600px] rounded-lg border p-6 shadow-xl" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--foreground-title)' }}>Choose a Template</h2>
                                <button onClick={() => setShowTemplates(false)} className="opacity-60 hover:opacity-100">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="grid gap-4">
                                {templates.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => loadTemplate(template)}
                                        className="flex flex-col items-start rounded-lg border p-4 text-left transition-all hover:bg-black/5 dark:hover:bg-white/5"
                                        style={{ borderColor: 'var(--border-color)' }}
                                    >
                                        <span className="font-medium" style={{ color: 'var(--foreground-title)' }}>{template.name}</span>
                                        <span className="text-sm opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>{template.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Validation Panel (existing) */}
                {showValidation && validationResult && (
                    <div className="absolute bottom-4 left-4 z-50 w-80 rounded-lg border p-4 shadow-lg" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: validationResult.valid ? 'green' : 'red'
                    }}>
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-bold" style={{ color: validationResult.valid ? 'green' : 'red' }}>
                                {validationResult.valid ? 'Valid Workflow' : 'Validation Errors'}
                            </h3>
                            <button onClick={() => setShowValidation(false)}>
                                <X size={16} />
                            </button>
                            {!validationResult.valid && validationResult.errors.length > 0 && (
                                <div className="space-y-2">
                                    {validationResult.errors.map((error, idx) => (
                                        <div key={idx} className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                            <span style={{ color: '#ef4444' }}>✕</span>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium" style={{ color: '#ef4444' }}>Error</div>
                                                <div className="text-xs" style={{ color: 'var(--foreground-body)' }}>{error.message}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {validationResult.warnings.length > 0 && (
                                <div className="mt-2 space-y-2">
                                    {validationResult.warnings.map((warning, idx) => (
                                        <div key={idx} className="flex items-start gap-2 p-2 rounded" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                            <span style={{ color: '#f59e0b' }}>⚠</span>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium" style={{ color: '#f59e0b' }}>Warning</div>
                                                <div className="text-xs" style={{ color: 'var(--foreground-body)' }}>{warning.message}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


export const FlowBuilder = () => {
    const [savedFilename, setSavedFilename] = useState<string | null>(null);

    const handleSave = useCallback(async (code: string) => {
        const filename = prompt("Enter a name for your workflow (e.g., my-workflow):", "generated-flow");
        if (!filename) return;

        try {
            const response = await fetch('/api/workflows/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code, filename }),
            });

            if (!response.ok) {
                throw new Error('Failed to save workflow');
            }

            const data = await response.json();
            alert(`Workflow saved successfully to ${data.path}`);
            setSavedFilename(filename);
        } catch (error) {
            console.error('Error saving workflow:', error);
            alert('Failed to save workflow');
        }
    }, []);

    const handleRun = useCallback(async () => {
        if (!savedFilename) {
            alert('Please save a workflow first.');
            return;
        }
        try {
            const response = await fetch('/api/workflows/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: savedFilename, args: [] }),
            });
            if (!response.ok) {
                throw new Error('Failed to run workflow');
            }
            const data = await response.json();
            alert(`Workflow started: ${JSON.stringify(data)}`);
        } catch (error) {
            console.error('Error running workflow:', error);
            alert('Failed to run workflow');
        }
    }, [savedFilename]);

    return (
        <ReactFlowProvider>
            <FlowBuilderContent onSave={handleSave} onRun={handleRun} savedFilename={savedFilename} />
        </ReactFlowProvider>
    );
};


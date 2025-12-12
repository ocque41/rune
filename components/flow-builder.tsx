'use client';

import "@/lib/react-shim";
import React, { useCallback, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { Cloud } from 'lucide-react';
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
import { AnimatedGridBackground } from './animated-grid-background';
import StepNode from './nodes/step-node';
import IfNode from './nodes/if-node';
import LoopNode from './nodes/loop-node';
import ParallelNode from './nodes/parallel-node';
import SubWorkflowNode from './nodes/sub-workflow-node';
import { ScheduleNode } from './nodes/schedule-node';
import { ApprovalNode } from './nodes/approval-node';
import { AINode } from './nodes/ai-node';
import { TransformNode } from './nodes/transform-node';
import WebhookNode from './nodes/webhook-node';
import { generateWorkflowCode } from '@/lib/workflow-generator';
import { validateGraph, ValidationResult } from '@/lib/workflow-validator';
import { LayoutTemplate, AlertCircle, X, Download, Upload, Trash2, HelpCircle, Play } from 'lucide-react';
import { templates, Template } from '@/lib/templates';
import { ExportedWorkflow } from '@/lib/types/export';
import { toast } from 'sonner';
import { useLocalWorkflowSession } from '@/hooks/useLocalWorkflowSession';
import { simulateWorkflow, SimulationLogEntry } from '@/lib/workflow-simulator';

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
    webhook: WebhookNode,
} as any;

const initialNodes: Node[] = [
    {
        id: '1',
        type: 'step',
        position: { x: 250, y: 50 },
        data: { label: 'Start Workflow', description: 'Triggered manually' },
    },
];

const getId = () => `dndnode_${crypto.randomUUID()}`;

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
    const [workflowId, setWorkflowId] = useState<string | null>(null);
    const [workflowName, setWorkflowName] = useState<string>('My Workflow');
    const [isSaving, setIsSaving] = useState(false);

    // Simulation State
    const [simulationLogs, setSimulationLogs] = useState<SimulationLogEntry[]>([]);
    const [isSimulating, setIsSimulating] = useState(false);
    const [showSimulationPanel, setShowSimulationPanel] = useState(false);

    const onSimulate = useCallback(async () => {
        setIsSimulating(true);
        setShowSimulationPanel(true);
        setSimulationLogs([]); // Clear previous logs

        try {
            // Basic input mock
            const initialInput = {
                triggeredAt: new Date().toISOString(),
                user: { id: 'sim-user', email: 'test@example.com' }
            };

            const result = await simulateWorkflow(nodes, edges, initialInput);
            setSimulationLogs(result.logs);

            if (result.success) {
                toast.success('Simulation completed');
            } else {
                toast.error('Simulation finished with errors');
            }
        } catch (error) {
            console.error('Simulation error:', error);
            toast.error('Simulation failed');
        } finally {
            setIsSimulating(false);
        }
    }, [nodes, edges]);

    const { clearSession } = useLocalWorkflowSession({
        nodes,
        edges,
        setNodes,
        setEdges
    });

    const onClearSession = useCallback(() => {
        if (window.confirm('Are you sure you want to clear the current session? This will reset the workflow to the default state.')) {
            clearSession();
            setNodes(initialNodes);
            setEdges([]);
            toast.success('Session cleared');
        }
    }, [clearSession, setNodes, setEdges]);

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

    const onSaveCloud = useCallback(async () => {
        if (!nodes.length) return;

        const name = prompt("Enter workflow name:", workflowName);
        if (name === null) return; // Cancelled
        if (name) setWorkflowName(name);

        const finalName = name || workflowName;
        setIsSaving(true);
        const code = generateWorkflowCode(nodes, edges);

        try {
            // Retrieve user_id separately in a real app, e.g. from context
            const response = await fetch('/api/rune/workflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: workflowId,
                    name: finalName,
                    description: 'Created via Flow Builder',
                    graph: { nodes, edges },
                    code,
                    // user_id: '...' // Handled on server/dummy for now
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save to cloud');
            }

            if (data.workflow?.id) {
                setWorkflowId(data.workflow.id);
            }

            toast.success('Workflow saved to cloud successfully');
        } catch (error) {
            console.error('Cloud save error:', error);
            const msg = error instanceof Error ? error.message : 'Failed to save';
            toast.error(msg);
        } finally {
            setIsSaving(false);
        }
    }, [nodes, edges, workflowId, workflowName]);

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
            toast.success('Draft saved locally');
        } catch (error) {
            console.error('Save error:', error);
            toast.error('Failed to save draft');
        }
    }, [nodes, edges]);

    const onDeploy = useCallback(async () => {
        try {
            // Auto-save draft before deploying
            const code = generateWorkflowCode(nodes, edges);
            // Use saved filename if available, otherwise default
            const filename = savedFilename ? (savedFilename.endsWith('.ts') ? savedFilename : `${savedFilename}.ts`) : 'my-workflow.ts';

            const saveResponse = await fetch('/api/workflows/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, filename }),
            });

            if (!saveResponse.ok) {
                const err = await saveResponse.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(`Failed to auto-save draft: ${err.error || saveResponse.statusText}`);
            }

            const response = await fetch('/api/workflows/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: filename.replace(/\.ts$/, '') }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to deploy');
            }

            const data = await response.json();
            console.log(`Deployed version ${data.version}`);
            toast.success(`Deployed version ${data.version} successfully!`, {
                description: 'Your workflow is now live in production.'
            });
        } catch (error) {
            console.error('Deploy error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to deploy');
        }
    }, [nodes, edges]);

    const loadTemplate = useCallback((template: Template) => {
        setNodes(template.nodes);
        setEdges(template.edges);
        setShowTemplates(false);
        toast.success(`Template "${template.name}" loaded`);
    }, [setNodes, setEdges]);

    const [exportUrl, setExportUrl] = useState<string | null>(null);
    const [exportFilename, setExportFilename] = useState<string | null>(null);

    // Export workflow - show modal with manual download link
    const onExport = useCallback(() => {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const code = generateWorkflowCode(nodes, edges);

            const exportData: ExportedWorkflow = {
                version: '1.0.0',
                meta: {
                    name: 'Workflow Export',
                    description: 'Exported workflow from Flow Builder',
                    createdAt: new Date().toISOString(),
                },
                nodes,
                edges,
                code,
            };

            const json = JSON.stringify(exportData, null, 2);
            const filename = `workflow-${timestamp}.json`;

            // Create blob URL
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            setExportUrl(url);
            setExportFilename(filename);

        } catch (error) {
            console.error('Export error:', error);
            toast.error('Failed to export workflow');
        }
    }, [nodes, edges]);

    const closeExportModal = useCallback(() => {
        if (exportUrl) {
            URL.revokeObjectURL(exportUrl);
        }
        setExportUrl(null);
        setExportFilename(null);
    }, [exportUrl]);

    // Import workflow from JSON file
    const onImport = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text) as ExportedWorkflow;

                // Validate required fields
                if (!data.version) {
                    throw new Error('Invalid workflow file: missing version field');
                }
                if (!data.nodes || !Array.isArray(data.nodes)) {
                    throw new Error('Invalid workflow file: missing or invalid nodes array');
                }
                if (!data.edges || !Array.isArray(data.edges)) {
                    throw new Error('Invalid workflow file: missing or invalid edges array');
                }

                // Replace current workflow with imported data
                setNodes(data.nodes);
                setEdges(data.edges);

                toast.success('Workflow imported successfully!');
            } catch (error) {
                console.error('Import error:', error);
                const message = error instanceof Error ? error.message : 'Failed to import workflow';
                toast.error(message);
            }
        };

        input.click();
    }, [setNodes, setEdges]);

    return (
        <div className="flex h-[calc(100vh-64px)] w-full flex-row overflow-hidden relative" style={{
            backgroundColor: '#000000'
        }}>
            <Sidebar />
            <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
                <AnimatedGridBackground />
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
                    className="transition-opacity duration-500" // Smooth load
                    style={{ backgroundColor: 'transparent' }} // Let radial gradient show
                >
                    <Controls style={{
                        backgroundColor: 'rgba(20, 20, 25, 0.9)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        borderRadius: '8px',
                        padding: '4px'
                    }} className="!shadow-2xl backdrop-blur-md [&>button]:!border-transparent [&>button:hover]:!bg-white/10" />

                    <Background
                        color="#4a4a5e"
                        gap={24}
                        size={1}
                        variant={BackgroundVariant.Dots}
                        className="opacity-5"
                    />

                    <MiniMap
                        style={{
                            backgroundColor: 'rgba(20, 20, 25, 0.9)',
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px'
                        }}
                        className="!shadow-2xl backdrop-blur-md m-4"
                        nodeColor={(n) => {
                            return '#3b82f6'; // Neon blue nodes
                        }}
                        maskColor="rgba(0, 0, 0, 0.6)"
                    />
                    <div className="absolute right-4 top-4 z-10 flex gap-3">
                        <Link
                            href="/docs/quickstart"
                            target="_blank"
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <HelpCircle size={14} />
                            Help
                        </Link>
                        <button
                            onClick={onClearSession}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <Trash2 size={14} />
                            Clear
                        </button>
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
                            onClick={onExport}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <Download size={14} />
                            Export
                        </button>
                        <button
                            onClick={onImport}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <Upload size={14} />
                            Import
                        </button>
                        <button
                            onClick={() => {
                                const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                                if (isLocal) {
                                    onSaveDraft();
                                } else {
                                    onSaveCloud();
                                }
                            }}
                            disabled={isSaving}
                            className="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                            style={{
                                backgroundColor: 'var(--foreground-title)',
                                color: 'var(--background)',
                            }}
                        >
                            <Cloud size={14} />
                            {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                            onClick={onSimulate}
                            disabled={isSimulating}
                            className="flex items-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                            style={{
                                backgroundColor: 'var(--accent-bg)',
                                color: 'var(--foreground-title)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <Play size={14} />
                            {isSimulating ? 'Simulating...' : 'Simulate'}
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

                {/* Export Modal */}
                {exportUrl && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-[400px] rounded-lg border p-6 shadow-xl" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--foreground-title)' }}>Export Ready</h2>
                                <button onClick={closeExportModal} className="opacity-60 hover:opacity-100">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex flex-col gap-4">
                                <p className="text-sm opacity-80" style={{ color: 'var(--foreground-body)' }}>
                                    Your workflow has been serialized successfully. Click the button below to download the JSON file.
                                </p>
                                <a
                                    href={exportUrl}
                                    download={exportFilename || 'workflow.json'}
                                    className="flex items-center justify-center gap-2 rounded px-4 py-2 text-sm font-medium transition-all hover:opacity-90"
                                    style={{
                                        backgroundColor: 'var(--foreground-title)',
                                        color: 'var(--background)',
                                    }}
                                    onClick={(e) => {
                                        // Optional: close modal after download
                                        // setTimeout(closeExportModal, 1000);
                                    }}
                                >
                                    <Download size={16} />
                                    Download {exportFilename}
                                </a>
                            </div>
                        </div>
                    </div>
                )}

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
                {/* Simulation Logs Panel */}
                {showSimulationPanel && (
                    <div className="absolute bottom-0 left-0 right-0 z-40 border-t shadow-xl flex flex-col transition-all duration-300 ease-in-out" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)',
                        height: '350px',
                        maxHeight: '40vh'
                    }}>
                        <div className="flex items-center justify-between border-b px-4 py-2" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center gap-2">
                                <Play size={14} className="text-blue-500" />
                                <span className="font-bold text-sm" style={{ color: 'var(--foreground-title)' }}>Simulation Logs</span>
                                <span className="text-xs opacity-50 ml-2" style={{ color: 'var(--foreground-subtitle)' }}>
                                    {simulationLogs.length} steps
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSimulationLogs([])}
                                    title="Clear Logs"
                                    className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded opacity-60 hover:opacity-100"
                                >
                                    <Trash2 size={14} style={{ color: 'var(--foreground-title)' }} />
                                </button>
                                <button onClick={() => setShowSimulationPanel(false)} className="opacity-60 hover:opacity-100 p-1">
                                    <X size={16} style={{ color: 'var(--foreground-title)' }} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                            {simulationLogs.length === 0 ? (
                                <div className="text-center opacity-50 italic py-4">
                                    {isSimulating ? 'Running simulation...' : 'Ready to simulate'}
                                </div>
                            ) : (
                                simulationLogs.map((log, i) => (
                                    <div key={i} className="flex gap-3 group animate-in fade-in slide-in-from-bottom-1 duration-200">
                                        <span className="opacity-40 shrink-0 select-none w-16 text-right" style={{ color: 'var(--foreground-subtitle)' }}>
                                            {new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}
                                        </span>
                                        <div className="flex-1 border-l pl-3" style={{ borderColor: 'var(--border-color)' }}>
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${log.type === 'error' ? 'bg-red-500/10 text-red-500' :
                                                    log.type === 'success' ? 'bg-green-500/10 text-green-500' :
                                                        log.type === 'warning' ? 'bg-yellow-500/10 text-yellow-500' :
                                                            'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {log.type}
                                                </span>
                                                <span className="font-semibold" style={{ color: 'var(--foreground-title)' }}>
                                                    {log.stepLabel}
                                                </span>
                                            </div>
                                            <div className="mt-1" style={{ color: 'var(--foreground-body)' }}>
                                                {log.message}
                                            </div>

                                            {log.data && Object.keys(log.data).length > 0 && (
                                                <pre className="mt-2 block overflow-x-auto rounded bg-black/5 dark:bg-white/5 p-2 text-[10px] opacity-80" style={{ color: 'var(--foreground-body)' }}>
                                                    {JSON.stringify(log.data, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                ))
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


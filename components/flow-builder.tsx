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
import { LayoutTemplate, AlertCircle, X, Download, Upload, Trash2, HelpCircle, Play, FolderOpen, Loader2, FileCode, Plus, Save } from 'lucide-react';
import { templates, Template } from '@/lib/templates';
import { ExportedWorkflow } from '@/lib/types/export';
import { toast } from 'sonner';
import { useLocalWorkflowSession } from '@/hooks/useLocalWorkflowSession';
import { simulateWorkflow, SimulationLogEntry } from '@/lib/workflow-simulator';
import { DeploymentSuccessDialog } from './deployment-success-dialog';

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
    savedFilename,
    initialWorkflowId
}: {
    onSave?: (code: string) => void;
    onRun?: () => void;
    savedFilename?: string | null;
    initialWorkflowId?: string | null;
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

    // Open/Load Modal State
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [workflowList, setWorkflowList] = useState<any[]>([]);

    const [isLoadingList, setIsLoadingList] = useState(false);

    // Deployment Success Modal State
    const [showDeployModal, setShowDeployModal] = useState(false);
    const [deployResult, setDeployResult] = useState<{
        version: number;
        workflowId: string;
        workflowName: string;
        code: string;
        graphJson: string;
    } | null>(null);
    const [deployTab, setDeployTab] = useState<'Integration' | 'Source Code' | 'JSON Definition'>('Integration');

    // User Templates State
    const [templateTab, setTemplateTab] = useState<'system' | 'my'>('system');
    const [userTemplates, setUserTemplates] = useState<any[]>([]);
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [templateForm, setTemplateForm] = useState({ name: '', description: '' });
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);

    const fetchUserTemplates = useCallback(async () => {
        try {
            const response = await fetch('/api/rune/templates');
            if (response.ok) {
                const data = await response.json();
                setUserTemplates(data.templates || []);
            }
        } catch (error) {
            console.error('Fetch user templates error:', error);
        }
    }, []);

    const onSaveTemplate = useCallback(async () => {
        if (!nodes.length) return;
        setIsSavingTemplate(true);
        try {
            const response = await fetch('/api/rune/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: templateForm.name,
                    description: templateForm.description,
                    graph_json: { nodes, edges }
                }),
            });

            if (!response.ok) throw new Error('Failed to save template');

            toast.success('Template saved successfully');
            setShowSaveTemplateModal(false);
            setTemplateForm({ name: '', description: '' });
            fetchUserTemplates(); // Refresh list
        } catch (error) {
            console.error('Save template error:', error);
            toast.error('Failed to save template');
        } finally {
            setIsSavingTemplate(false);
        }
    }, [nodes, edges, templateForm, fetchUserTemplates]);

    const onDeleteTemplate = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Delete this template?")) return;
        try {
            const response = await fetch(`/api/rune/templates/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');
            toast.success('Template deleted');
            fetchUserTemplates();
        } catch (error) {
            console.error('Delete template error:', error);
            toast.error('Failed to delete template');
        }
    }, [fetchUserTemplates]);

    const loadUserTemplate = useCallback((template: any) => {
        if (template.graph_json?.nodes && template.graph_json?.edges) {
            setNodes(template.graph_json.nodes);
            setEdges(template.graph_json.edges);
            setShowTemplates(false);
            toast.success(`Template "${template.name}" loaded`);
        }
    }, [setNodes, setEdges]);

    const fetchWorkflows = useCallback(async () => {
        setIsLoadingList(true);
        try {
            // Determine API based on environment or toggle? 
            // For now, prioritize the 'rune' (cloud) API if we are in this specific context, 
            // but the app has local dev mode too.
            // Let's try to fetch cloud first as that's the production requirement.
            const response = await fetch('/api/rune/workflows');
            if (response.ok) {
                const data = await response.json();
                setWorkflowList(data.workflows || []);
            } else {
                // Fallback or error?
                console.warn("Failed to fetch cloud workflows");
                setWorkflowList([]);
            }
        } catch (error) {
            console.error('Fetch workflows error:', error);
            toast.error('Failed to load workflows');
        } finally {
            setIsLoadingList(false);
        }
    }, []);

    const onLoadWorkflow = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/rune/workflows/${id}`);
            if (!response.ok) throw new Error('Failed to load workflow');

            const data = await response.json();
            const workflow = data.workflow;

            if (!workflow) throw new Error('Workflow data missing');

            // Restore state
            // Logic to restore graph from workflow.graph_json
            // We assume graph_json has { nodes, edges } structure
            const graph = workflow.graph_json;
            if (graph && graph.nodes && graph.edges) {
                setNodes(graph.nodes);
                setEdges(graph.edges);
                setWorkflowName(workflow.name);
                setWorkflowId(workflow.id); // Set ID so subsequent saves are updates

                setShowOpenModal(false);
                toast.success(`Loaded "${workflow.name}"`);
            } else {
                throw new Error('Invalid graph data');
            }

        } catch (error) {
            console.error('Load error:', error);
            toast.error('Failed to load workflow');
        }
    }, [setNodes, setEdges]);

    const onDeleteWorkflow = useCallback(async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering load
        if (!confirm("Are you sure you want to delete this workflow?")) return;

        try {
            const response = await fetch(`/api/rune/workflows/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');

            toast.success('Workflow deleted');
            // Refresh list
            fetchWorkflows();

            // If deleting current workflow, maybe reset ID?
            if (id === workflowId) {
                setWorkflowId(null);
            }
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete workflow');
        }
    }, [fetchWorkflows, workflowId]);

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



    // Handle initial workflow load
    useEffect(() => {
        if (initialWorkflowId) {
            onLoadWorkflow(initialWorkflowId);
        }
    }, [initialWorkflowId]); // removed onLoadWorkflow from deps to avoid double-call if it's unstable, though useCallback should be stable

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
            if (!nodes.length) return;

            // 1. Ensure it's saved to cloud first
            // We can reuse onSaveCloud logic or call it directly if refactored, 
            // but for now let's duplicate the essential save logic or prompt user if not saved.
            // Better UX: Auto-save if ID exists, or prompt if new.

            let currentWorkflowId = workflowId;
            let currentName = workflowName;

            // Generate code once for use in saving and modal
            const code = generateWorkflowCode(nodes, edges);

            if (!currentWorkflowId) {
                const name = prompt("Enter workflow name to deploy:", workflowName);
                if (name === null) return;
                currentName = name;
                setWorkflowName(name);

                setIsSaving(true);

                // Save first
                const saveRes = await fetch('/api/rune/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: currentName,
                        description: 'Auto-saved before deploy',
                        graph: { nodes, edges },
                        code
                    }),
                });

                const saveData = await saveRes.json();
                setIsSaving(false);

                if (!saveRes.ok) throw new Error(saveData.error || 'Failed to auto-save');
                currentWorkflowId = saveData.workflow.id;
                setWorkflowId(currentWorkflowId);
            } else {
                // Determine if we should auto-save updates? Yes, usually deploy = save + deploy version
                setIsSaving(true);
                await fetch('/api/rune/workflows', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: currentWorkflowId,
                        name: currentName,
                        graph: { nodes, edges },
                        code
                    }),
                });
                setIsSaving(false);
            }

            // 2. Deploy
            const response = await fetch('/api/rune/workflows/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflow_id: currentWorkflowId }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to deploy');
            }

            const data = await response.json();
            console.log(`Deployed version ${data.version}`);

            // Show success modal
            setDeployResult({
                version: data.version,
                workflowId: currentWorkflowId || '',
                workflowName: currentName,
                code: code,
                graphJson: JSON.stringify({ nodes, edges }, null, 2)
            });
            setShowDeployModal(true);

            toast.success(`Deployed version ${data.version} successfully!`, {
                description: 'Your workflow is now live.'
            });
        } catch (error) {
            console.error('Deploy error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to deploy');
            setIsSaving(false);
        }
    }, [nodes, edges, workflowId, workflowName]);

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

    // Check if start node exists
    const hasStartNode = nodes.some(n => n.data.label === 'Start Workflow');

    return (
        <div className="flex h-[calc(100vh-64px)] w-full flex-row overflow-hidden relative" style={{
            backgroundColor: '#000000'
        }}>
            <Sidebar hasStartNode={hasStartNode} />
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
                    }} className="!shadow-2xl backdrop-blur-md [&>button]:!bg-transparent [&>button]:!border-none [&>button:hover]:!bg-white/10" />

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
                            onClick={() => {
                                setShowOpenModal(true);
                                fetchWorkflows();
                            }}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <FolderOpen size={14} />
                            Open
                        </button>
                        <button
                            onClick={onClearSession}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <Trash2 size={14} />
                            Clear
                        </button>
                        <button
                            onClick={() => {
                                setShowTemplates(true);
                                fetchUserTemplates();
                            }}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <LayoutTemplate size={14} />
                            Templates
                        </button>
                        <button
                            onClick={() => {
                                setTemplateForm({ name: workflowName || 'My Template', description: '' });
                                setShowSaveTemplateModal(true);
                            }}
                            className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: 'var(--foreground-title)' }}
                        >
                            <Save size={14} />
                            Add as Template
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

                <DeploymentSuccessDialog
                    open={showDeployModal}
                    onClose={() => setShowDeployModal(false)}
                    result={deployResult}
                />

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
                            <div className="flex gap-4 mb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <button
                                    className={`pb-2 text-sm font-medium transition-colors ${templateTab === 'system' ? 'border-b-2' : 'opacity-60'}`}
                                    style={{
                                        borderColor: templateTab === 'system' ? 'var(--foreground-title)' : 'transparent',
                                        color: 'var(--foreground-title)'
                                    }}
                                    onClick={() => setTemplateTab('system')}
                                >
                                    System Templates
                                </button>
                                <button
                                    className={`pb-2 text-sm font-medium transition-colors ${templateTab === 'my' ? 'border-b-2' : 'opacity-60'}`}
                                    style={{
                                        borderColor: templateTab === 'my' ? 'var(--foreground-title)' : 'transparent',
                                        color: 'var(--foreground-title)'
                                    }}
                                    onClick={() => setTemplateTab('my')}
                                >
                                    My Templates
                                </button>
                            </div>

                            <div className="grid gap-4 max-h-[400px] overflow-y-auto">
                                {templateTab === 'system' ? (
                                    templates.map(template => (
                                        <button
                                            key={template.id}
                                            onClick={() => loadTemplate(template)}
                                            className="flex flex-col items-start rounded-lg border p-4 text-left transition-all hover:bg-black/5 dark:hover:bg-white/5"
                                            style={{ borderColor: 'var(--border-color)' }}
                                        >
                                            <span className="font-medium" style={{ color: 'var(--foreground-title)' }}>{template.name}</span>
                                            <span className="text-sm opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>{template.description}</span>
                                        </button>
                                    ))
                                ) : (
                                    userTemplates.length > 0 ? (
                                        userTemplates.map(template => (
                                            <div
                                                key={template.id}
                                                className="group relative flex flex-col items-start rounded-lg border p-4 text-left transition-all hover:bg-black/5 dark:hover:bg-white/5"
                                                style={{ borderColor: 'var(--border-color)', cursor: 'pointer' }}
                                                onClick={() => loadUserTemplate(template)}
                                            >
                                                <div className="flex w-full justify-between items-start">
                                                    <div>
                                                        <span className="font-medium" style={{ color: 'var(--foreground-title)' }}>{template.name}</span>
                                                        <p className="text-sm opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>{template.description || 'No description'}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => onDeleteTemplate(template.id, e)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                                                        title="Delete Template"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-center text-sm opacity-60 py-8" style={{ color: 'var(--foreground-subtitle)' }}>
                                            No templates saved yet.
                                        </p>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Save Template Modal */}
                {showSaveTemplateModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-[400px] rounded-lg border p-6 shadow-xl" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--foreground-title)' }}>Save as Template</h2>
                                <button onClick={() => setShowSaveTemplateModal(false)} className="opacity-60 hover:opacity-100">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Template Name
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full rounded border px-3 py-2 text-sm bg-transparent"
                                        style={{ borderColor: 'var(--border-color)', color: 'var(--foreground-body)' }}
                                        value={templateForm.name}
                                        onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                                        placeholder="My Awesome Template"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Description
                                    </label>
                                    <textarea
                                        className="w-full rounded border px-3 py-2 text-sm bg-transparent"
                                        style={{ borderColor: 'var(--border-color)', color: 'var(--foreground-body)' }}
                                        rows={3}
                                        value={templateForm.description}
                                        onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })}
                                        placeholder="What does this workflow do?"
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setShowSaveTemplateModal(false)}
                                        className="px-4 py-2 text-sm font-medium rounded hover:bg-black/5 dark:hover:bg-white/5"
                                        style={{ color: 'var(--foreground-body)' }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={onSaveTemplate}
                                        disabled={isSavingTemplate || !templateForm.name.trim()}
                                        className="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSavingTemplate ? 'Saving...' : 'Save Template'}
                                    </button>
                                </div>
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

                {/* Open Workflow Modal */}
                {showOpenModal && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="w-[600px] max-h-[80vh] flex flex-col rounded-lg border shadow-xl" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                                <h2 className="text-lg font-bold" style={{ color: 'var(--foreground-title)' }}>Open Workflow</h2>
                                <button onClick={() => setShowOpenModal(false)} className="opacity-60 hover:opacity-100">
                                    <X size={20} style={{ color: 'var(--foreground-title)' }} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                                {isLoadingList ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-50 gap-2">
                                        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--foreground-title)' }} />
                                        <span style={{ color: 'var(--foreground-subtitle)' }}>Loading workflows...</span>
                                    </div>
                                ) : workflowList.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full opacity-50 gap-2">
                                        <FolderOpen size={32} style={{ color: 'var(--foreground-subtitle)' }} />
                                        <span style={{ color: 'var(--foreground-subtitle)' }}>No saved workflows found.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {workflowList.map((wf) => (
                                            <div
                                                key={wf.id}
                                                onClick={() => onLoadWorkflow(wf.id)}
                                                className="group flex items-center justify-between p-3 rounded-md border transition-all hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                                style={{ borderColor: 'var(--border-color)' }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                                                        <FileCode size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium" style={{ color: 'var(--foreground-title)' }}>{wf.name}</div>
                                                        <div className="text-xs opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>
                                                            Last updated: {new Date(wf.updated_at).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => onDeleteWorkflow(wf.id, e)}
                                                    className="p-2 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                                    title="Delete workflow"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};




export const FlowBuilder = ({ initialWorkflowId }: { initialWorkflowId?: string | null }) => {
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
            <FlowBuilderContent
                onSave={handleSave}
                onRun={handleRun}
                savedFilename={savedFilename}
                initialWorkflowId={initialWorkflowId}
            />
        </ReactFlowProvider>
    );
};


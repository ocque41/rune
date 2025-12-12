import { useEffect, useCallback, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';

const STORAGE_KEY = 'rune_workflow_session';

interface WorkflowSession {
    nodes: Node[];
    edges: Edge[];
    meta?: {
        name?: string;
        description?: string;
    };
    updatedAt: number;
}

interface UseLocalWorkflowSessionProps {
    nodes: Node[];
    edges: Edge[];
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    workflowMeta?: {
        name?: string;
        description?: string;
    };
}

export function useLocalWorkflowSession({
    nodes,
    edges,
    setNodes,
    setEdges,
    workflowMeta
}: UseLocalWorkflowSessionProps) {
    const isInitialized = useRef(false);

    // Load from session storage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isInitialized.current) return;

        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const session: WorkflowSession = JSON.parse(stored);

                // Basic validation
                if (Array.isArray(session.nodes) && Array.isArray(session.edges)) {
                    // Deduplicate nodes by ID to prevent React key conflicts
                    const seenIds = new Set<string>();
                    let hasDuplicates = false;
                    const uniqueNodes = session.nodes.filter((node: Node) => {
                        if (seenIds.has(node.id)) {
                            console.warn(`Duplicate node ID found and removed: ${node.id}`);
                            hasDuplicates = true;
                            return false;
                        }
                        seenIds.add(node.id);
                        return true;
                    });

                    // If duplicates were found, immediately save cleaned data
                    if (hasDuplicates) {
                        const cleanedSession: WorkflowSession = {
                            nodes: uniqueNodes,
                            edges: session.edges,
                            meta: session.meta,
                            updatedAt: Date.now(),
                        };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedSession));
                        console.log('Cleaned up duplicate nodes in localStorage');
                    }

                    setNodes(uniqueNodes);
                    setEdges(session.edges);
                    console.log('Restored workflow session from', new Date(session.updatedAt).toLocaleString());
                }
            }
        } catch (error) {
            console.warn('Failed to load workflow session:', error);
            // On error, we just don't load anything and let the default state take over
        } finally {
            isInitialized.current = true;
        }
    }, [setNodes, setEdges]);

    // Save to session storage on changes
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isInitialized.current) return; // Don't save before initial load attempt

        // Debounce could be added here if performance becomes an issue,
        // but for now we'll save on every change (or rely on React's batching)
        // We'll use a small timeout to avoid blocking the main thread on every render
        const timeoutId = setTimeout(() => {
            try {
                const session: WorkflowSession = {
                    nodes,
                    edges,
                    meta: workflowMeta,
                    updatedAt: Date.now(),
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            } catch (error) {
                console.warn('Failed to save workflow session:', error);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [nodes, edges, workflowMeta]);

    const clearSession = useCallback(() => {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(STORAGE_KEY);
            // We don't verify resetting nodes/edges here because the caller
            // is responsible for resetting the state to defaults if they want
            // immediately after clearing.
        } catch (error) {
            console.error('Failed to clear workflow session:', error);
        }
    }, []);

    return {
        clearSession
    };
}

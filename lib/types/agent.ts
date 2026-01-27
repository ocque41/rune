
import { AgentConfig } from '@/lib/agent/config-schema';

export type LLMConfig = AgentConfig;

export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
    timestamp?: number;
}

export interface NodeConnection {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

export interface PlaygroundSnapshot {
    config: LLMConfig;
    messages: Message[];
    graphState?: {
        nodes: any[]; // Using any for ReactFlow nodes for flexibility here
        edges: NodeConnection[];
    };
}

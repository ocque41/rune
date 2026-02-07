'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Code, Settings } from 'lucide-react'; // Using 'Code' icon for custom code

export type CustomCodeNodeData = {
    label: string;
    language: 'javascript' | 'python' | 'wasm';
    code: string;
    entrypoint: string;
    inputMapping: string; // e.g., 'params.data'
    outputMapping: string; // How to map script output
    timeoutMs: number;
    dependencies: string; // JSON string array
    envVars: string; // JSON string object
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomCustomCodeNode = Node<CustomCodeNodeData>;

const CustomCodeNode = ({ data, selected }: NodeProps<CustomCustomCodeNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [language, setLanguage] = useState(data.language || 'javascript');
    const [code, setCode] = useState(data.code || 'return params;');
    const [entrypoint, setEntrypoint] = useState(data.entrypoint || 'handler');
    const [inputMapping, setInputMapping] = useState(data.inputMapping || 'params');
    const [outputMapping, setOutputMapping] = useState(data.outputMapping || 'scriptResult');
    const [timeoutMs, setTimeoutMs] = useState(data.timeoutMs || 10000);
    const [dependencies, setDependencies] = useState(data.dependencies || '[]');
    const [envVars, setEnvVars] = useState(data.envVars || '{}');

    return (
        <div
            className={`min-w-[300px] rounded-xl border-2 transition-all ${selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}`}
            style={{
                backgroundColor: '#111111',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                {/* Status Indicator */}
                {data.status && data.status !== 'idle' && (
                    <div className="absolute top-0 right-0 p-2">
                        <div className={`h-3 w-3 rounded-full shadow-lg ${data.status === 'running' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse' :
                            (data.status === 'completed' || data.status === 'success') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                (data.status === 'failed' || data.status === 'failure') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                    'bg-white/30' // Default for unknown/idle
                            }`} />
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        <Code size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        Custom Code
                    </span>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
                >
                    <Settings size={16} />
                </button>
            </div>

            <div className="p-3">
                {showConfig && (
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Language</label>
                            <select
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={language}
                                onChange={(e) => {
                                    setLanguage(e.target.value as 'javascript' | 'python' | 'wasm');
                                    data.language = e.target.value as 'javascript' | 'python' | 'wasm';
                                }}
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="wasm">WASM (Experimental)</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Code</label>
                            {/* In a real app, this would be a proper code editor component */}
                            <textarea
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={code}
                                onChange={(e) => {
                                    setCode(e.target.value);
                                    data.code = e.target.value;
                                }}
                                placeholder="function handler(params) { return params; }"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Entrypoint</label>
                            <input
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={entrypoint}
                                onChange={(e) => {
                                    setEntrypoint(e.target.value);
                                    data.entrypoint = e.target.value;
                                }}
                                placeholder="handler"
                            />
                            <p className="mt-1 text-[10px] text-white/50">Function name to execute (JS/Python) or export name (WASM).</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Input Mapping</label>
                            <input
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={inputMapping}
                                onChange={(e) => {
                                    setInputMapping(e.target.value);
                                    data.inputMapping = e.target.value;
                                }}
                                placeholder="params"
                            />
                            <p className="mt-1 text-[10px] text-white/50">Expression for the input to the custom code (e.g., `params.data`, `params.httpRequestResult`).</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Output Mapping</label>
                            <input
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={outputMapping}
                                onChange={(e) => {
                                    setOutputMapping(e.target.value);
                                    data.outputMapping = e.target.value;
                                }}
                                placeholder="scriptResult"
                            />
                            <p className="mt-1 text-[10px] text-white/50">Expression to map the script's raw output to the workflow context (e.g., `scriptResult.response`, `scriptResult`).</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Timeout (ms)</label>
                            <input
                                type="number"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={timeoutMs}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setTimeoutMs(isNaN(val) ? 10000 : val);
                                    data.timeoutMs = isNaN(val) ? 10000 : val;
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Dependencies (JSON Array)</label>
                            <textarea
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={dependencies}
                                onChange={(e) => {
                                    setDependencies(e.target.value);
                                    data.dependencies = e.target.value;
                                }}
                                placeholder='["axios", "lodash"]'
                            />
                            <p className="mt-1 text-[10px] text-white/50">JSON array of external packages to be installed/available.</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Environment Variables (JSON Object)</label>
                            <textarea
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={envVars}
                                onChange={(e) => {
                                    setEnvVars(e.target.value);
                                    data.envVars = e.target.value;
                                }}
                                placeholder='{"API_KEY": "{{SECRET_MY_API_KEY}}"}'
                            />
                            <p className="mt-1 text-[10px] text-white/50">JSON object of environment variables to pass to the script.</p>
                        </div>
                    </div>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="!h-3 !w-3 !bg-[#F0EEE9] !border-2"
                style={{ borderColor: '#131313' }}
            />

            <Handle
                type="source"
                position={Position.Bottom}
                className="!h-3 !w-3 !bg-[#F0EEE9] !border-2"
                style={{ borderColor: '#131313' }}
            />
        </div>
    );
};

export default CustomCodeNode;
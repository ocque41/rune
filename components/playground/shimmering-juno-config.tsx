import React from 'react';
import { Sparkles, Cpu, Thermometer, MessageSquare, Terminal, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LLMConfig } from '@/lib/types/agent';

interface ShimmeringJunoConfigProps {
    config: LLMConfig;
    onChange: (updates: Partial<LLMConfig>) => void;
    onMcpConfigure?: () => void;
}

export function ShimmeringJunoConfig({ config, onChange, onMcpConfigure }: ShimmeringJunoConfigProps) {
    const handleChange = (key: keyof LLMConfig, value: any) => {
        onChange({ [key]: value });
    };

    return (
        <div className="flex flex-col h-full w-full text-white bg-black/40 backdrop-blur-xl relative overflow-hidden group">
            {/* Shimmering Ambient Background Effect */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,theme(colors.green.500/0.1),transparent_50%)] animate-pulse duration-[4s]" />
                <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_100%)]" />
            </div>

            <div className="relative z-10 flex flex-col gap-6 p-4 h-full overflow-y-auto custom-scrollbar">

                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20 shadow-[0_0_15px_rgba(0,255,0,0.2)]">
                        <Sparkles className="w-5 h-5 text-[var(--neon-green)] animate-pulse" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-wider text-white/90 uppercase">Juno Intelligence</h2>
                        <p className="text-[10px] text-[var(--neon-green)]/70 font-mono">Auto-Pilot Configuration</p>
                    </div>
                </div>

                {/* Model Selector */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>Model Architecture</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {['gpt-4-turbo', 'claude-3-sonnet', 'mistral-large'].map((model) => (
                            <button
                                key={model}
                                onClick={() => handleChange('model', model)}
                                className={cn(
                                    "relative px-3 py-2.5 text-xs text-left rounded-md border transition-all duration-300 group/btn overflow-hidden",
                                    config.model === model
                                        ? "bg-[var(--neon-green)]/10 border-[var(--neon-green)]/50 text-white shadow-[0_0_20px_-5px_rgba(0,255,0,0.3)]"
                                        : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20"
                                )}
                            >
                                <div className={cn(
                                    "absolute inset-0 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-500",
                                    "bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/btn:animate-shimmer"
                                )} />
                                <span className="relative z-10 font-mono">{model}</span>
                                {config.model === model && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] shadow-[0_0_8px_currentColor]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Temperature Control */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-medium text-white/70">
                        <div className="flex items-center gap-2">
                            <Thermometer className="w-3.5 h-3.5" />
                            <span>Creativity Index</span>
                        </div>
                        <span className="font-mono text-[var(--neon-green)] bg-[var(--neon-green)]/10 px-1.5 py-0.5 rounded border border-[var(--neon-green)]/20">
                            {config.temperature.toFixed(1)}
                        </span>
                    </div>
                    <div className="relative h-6 flex items-center">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.temperature}
                            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--neon-green)] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,255,0,0.8)] transition-all hover:[&::-webkit-slider-thumb]:scale-125"
                        />
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-[var(--neon-green)]/50 rounded-full pointer-events-none"
                            style={{ width: `${config.temperature * 100}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-white/30 italic">
                        Lower values for consistent logic, higher for creative generation.
                    </p>
                </div>

                {/* Tools Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-medium text-white/70">
                        <div className="flex items-center gap-2">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Active Tools</span>
                        </div>
                        <span className="font-mono text-xs text-white/50">
                            {config.tools?.length || 0}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-white/5 rounded-lg border border-white/10">
                        {!config.tools || config.tools.length === 0 ? (
                            <span className="text-[10px] text-white/30 italic px-1">No tools selected</span>
                        ) : (
                            config.tools.map(toolId => (
                                <span key={toolId} className="px-2 py-1 rounded bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20 text-[10px] font-mono text-[var(--neon-green)]">
                                    {toolId}
                                </span>
                            ))
                        )}
                    </div>

                    <button
                        onClick={onMcpConfigure}
                        className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-md text-xs text-center text-white/60 transition-colors"
                    >
                        Configure Capabilities
                    </button>
                </div>

                {/* System Prompt */}
                <div className="flex-1 flex flex-col min-h-[200px] space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                        <Terminal className="w-3.5 h-3.5" />
                        <span>System Instructions</span>
                    </div>
                    <div className="relative flex-1 group/input">
                        <div className="absolute -inset-0.5 bg-gradient-to-b from-[var(--neon-green)]/20 to-transparent rounded-lg blur opacity-0 group-hover/input:opacity-100 transition duration-1000" />
                        <textarea
                            value={config.systemPrompt}
                            onChange={(e) => handleChange('systemPrompt', e.target.value)}
                            placeholder="Define the agent's persona and constraints..."
                            className="relative w-full h-full bg-[#0A0A0A] border border-white/10 rounded-lg p-3 text-xs font-mono text-white/80 placeholder:text-white/20 focus:outline-none focus:border-[var(--neon-green)]/50 focus:ring-1 focus:ring-[var(--neon-green)]/20 resize-none leading-relaxed custom-scrollbar pb-10"
                            spellCheck={false}
                        />
                    </div>
                </div>

            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>
        </div>
    );
}

// Add strict type for prop validation if needed but Typescript handles it.

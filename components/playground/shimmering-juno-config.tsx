import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Cpu, Thermometer, Terminal, Wrench, Save, Trash2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LLMConfig } from '@/lib/types/agent';
import { animate, stagger } from 'animejs';
import { getAgentPresets, saveAgentPreset, deleteAgentPreset, AgentPreset } from '@/app/actions/agent';
import { toast } from 'sonner';

interface ShimmeringJunoConfigProps {
    config: LLMConfig;
    onChange: (updates: Partial<LLMConfig>) => void;
    onMcpConfigure?: () => void;
}

export function ShimmeringJunoConfig({ config, onChange, onMcpConfigure }: ShimmeringJunoConfigProps) {
    const [presets, setPresets] = useState<AgentPreset[]>([]);
    const [isPresetsOpen, setIsPresetsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);
    const presetsRef = useRef<HTMLDivElement>(null);

    const handleChange = (key: keyof LLMConfig, value: any) => {
        onChange({ [key]: value });
    };

    // Load Presets
    useEffect(() => {
        loadPresets();
    }, []);

    const loadPresets = async () => {
        try {
            const data = await getAgentPresets();
            setPresets(data);
        } catch (e) {
            console.error('Failed to load presets', e);
        }
    };

    // AnimeJS for Presets Dropdown
    useEffect(() => {
        if (isPresetsOpen && presetsRef.current) {
            // @ts-ignore
            animate(presetsRef.current.children, {
                opacity: [0, 1],
                translateY: [-10, 0],
                delay: stagger(50),
                duration: 400,
                easing: 'easeOutExpo'
            });
        }
    }, [isPresetsOpen]);

    const handleSavePreset = async () => {
        if (!presetName.trim()) return;
        setIsSaving(true);
        try {
            await saveAgentPreset({
                name: presetName,
                config: config,
                description: `Created on ${new Date().toLocaleDateString()}`
            });
            toast.success('Preset saved');
            setPresetName('');
            setShowSaveInput(false);
            await loadPresets();
        } catch (e) {
            toast.error('Failed to save preset');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadPreset = (preset: AgentPreset) => {
        onChange(preset.config);
        toast.success(`Loaded preset: ${preset.name}`);
        setIsPresetsOpen(false);
    };

    const handleDeletePreset = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await deleteAgentPreset(id);
            toast.success('Preset deleted');
            await loadPresets();
        } catch (e) {
            toast.error('Failed to delete preset');
        }
    };

    return (
        <div className="flex flex-col h-full w-full text-white bg-black/40 backdrop-blur-xl relative overflow-hidden group">
            {/* Shimmering Ambient Background Effect */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,theme(colors.green.500/0.1),transparent_50%)] animate-pulse duration-[4s]" />
                <div className="absolute top-0 right-0 w-full h-full bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_100%)]" />
            </div>

            <div className="relative z-10 flex flex-col gap-6 p-4 h-full overflow-y-auto custom-scrollbar">

                {/* Header & Presets */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20 shadow-[0_0_15px_rgba(0,255,0,0.2)]">
                            <Sparkles className="w-5 h-5 text-[var(--neon-green)] animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-wider text-white/90 uppercase">Juno Intelligence</h2>
                            <p className="text-[10px] text-[var(--neon-green)]/70 font-mono">Auto-Pilot Configuration</p>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors border border-white/5 hover:border-white/10"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>Presets</span>
                            <ChevronDown className={cn("w-3 h-3 transition-transform", isPresetsOpen && "rotate-180")} />
                        </button>

                        {isPresetsOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-50 backdrop-blur-3xl">
                                <div className="space-y-1 mb-2">
                                    {!showSaveInput ? (
                                        <button
                                            onClick={() => setShowSaveInput(true)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[var(--neon-green)] bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/20 rounded-lg transition-colors border border-[var(--neon-green)]/20"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            <span>Save Current Config</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
                                            <input
                                                autoFocus
                                                value={presetName}
                                                onChange={(e) => setPresetName(e.target.value)}
                                                placeholder="Preset Name..."
                                                className="flex-1 bg-transparent text-xs px-2 py-1 outline-none text-white placeholder:text-white/30"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                                            />
                                            <button onClick={handleSavePreset} disabled={isSaving} className="p-1 hover:bg-white/10 rounded-md text-[var(--neon-green)]">
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-white/10 my-2" />

                                <div ref={presetsRef} className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                                    {presets.length === 0 ? (
                                        <p className="text-[10px] text-white/30 text-center py-2">No saved presets</p>
                                    ) : (
                                        presets.map(preset => (
                                            <div key={preset.id} className="group/item flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer" onClick={() => handleLoadPreset(preset)}>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-xs font-medium text-white/80 truncate group-hover/item:text-white transition-colors">{preset.name}</span>
                                                    <span className="text-[9px] text-white/40 truncate">{preset.description || 'Custom Config'}</span>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeletePreset(e, preset.id)}
                                                    className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded-md transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Model Selector */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-white/70">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>Model Architecture</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {['gemini-3-flash-preview', 'gemini-3-pro-preview'].map((model) => (
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
                        <div className="flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5" />
                            <span>System Instructions</span>
                        </div>
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

import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Cpu, Thermometer, Terminal, Wrench, Save, Trash2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LLMConfig } from '@/lib/types/agent';
import anime from 'animejs';
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
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);
    const presetsRef = useRef<HTMLDivElement>(null);

    const handleChange = (key: keyof LLMConfig, value: any) => {
        onChange({ [key]: value });
        // Clear selected preset when config changes manually
        if (selectedPresetId) {
            setSelectedPresetId(null);
            setSelectedPresetName(null);
        }
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
            anime({
                targets: presetsRef.current.children,
                opacity: [0, 1],
                translateY: [-10, 0],
                delay: anime.stagger(50),
                duration: 400,
                easing: 'easeOutExpo'
            });
        }
    }, [isPresetsOpen]);

    const handleSavePreset = async () => {
        if (!presetName.trim()) return;
        setIsSaving(true);

        // Optimistic update - create temporary preset
        const tempPreset: AgentPreset = {
            id: `temp-${Date.now()}`,
            name: presetName,
            config: config,
            description: `Created on ${new Date().toLocaleDateString()}`,
            is_favorite: false,
            updated_at: new Date().toISOString()
        };

        // Update UI immediately
        setPresets(prev => [tempPreset, ...prev]);
        setSelectedPresetId(tempPreset.id);
        setSelectedPresetName(presetName);
        setPresetName('');
        setShowSaveInput(false);
        setIsPresetsOpen(false);

        try {
            const savedPreset = await saveAgentPreset({
                name: tempPreset.name,
                config: config,
                description: tempPreset.description
            });

            // Replace temp preset with real one
            setPresets(prev => prev.map(p => p.id === tempPreset.id ? savedPreset : p));
            setSelectedPresetId(savedPreset.id);
            toast.success('Preset saved');
        } catch (e) {
            // Revert on error
            setPresets(prev => prev.filter(p => p.id !== tempPreset.id));
            setSelectedPresetId(null);
            setSelectedPresetName(null);
            toast.error('Failed to save preset');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLoadPreset = (preset: AgentPreset) => {
        onChange(preset.config);
        setSelectedPresetId(preset.id);
        setSelectedPresetName(preset.name);
        toast.success(`Loaded preset: ${preset.name}`);
        setIsPresetsOpen(false);
    };

    const handleDeletePreset = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        // Optimistic update
        const deletedPreset = presets.find(p => p.id === id);
        setPresets(prev => prev.filter(p => p.id !== id));

        // Clear selection if deleting selected preset
        if (selectedPresetId === id) {
            setSelectedPresetId(null);
            setSelectedPresetName(null);
        }

        try {
            await deleteAgentPreset(id);
            toast.success('Preset deleted');
        } catch (e) {
            // Revert on error
            if (deletedPreset) {
                setPresets(prev => [deletedPreset, ...prev]);
            }
            toast.error('Failed to delete preset');
        }
    };

    return (
        <div className="flex flex-col h-full w-full text-foreground bg-background/95 backdrop-blur-xl relative overflow-hidden group border-l border-border">
            <div className="absolute inset-0 z-0 pointer-events-none bg-[color:var(--metric-surface-1)]" />

            <div className="relative z-10 flex flex-col gap-6 p-4 h-full overflow-y-auto custom-scrollbar">

                {/* Header & Presets */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-white/10 border border-white/20">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-wider text-foreground uppercase">Juno Intelligence</h2>
                            <p className="text-[10px] text-muted-foreground font-mono">Auto-Pilot Configuration</p>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsPresetsOpen(!isPresetsOpen)}
                            className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-md transition-colors border border-border"
                        >
                            <Save className="w-3.5 h-3.5" />
                            <span>{selectedPresetName || 'Presets'}</span>
                            <ChevronDown className={cn("w-3 h-3 transition-transform", isPresetsOpen && "rotate-180")} />
                        </button>

                        {isPresetsOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-popover border border-border rounded-xl shadow-2xl z-50 backdrop-blur-3xl">
                                <div className="space-y-1 mb-2">
                                    {!showSaveInput ? (
                                        <button
                                            onClick={() => setShowSaveInput(true)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/16 rounded-lg transition-colors border border-white/20"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            <span>Save Current Config</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg border border-border">
                                            <input
                                                autoFocus
                                                value={presetName}
                                                onChange={(e) => setPresetName(e.target.value)}
                                                placeholder="Preset Name..."
                                                className="flex-1 bg-transparent text-xs px-2 py-1 outline-none text-foreground placeholder:text-muted-foreground"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                                            />
                                            <button onClick={handleSavePreset} disabled={isSaving} className="p-1 hover:bg-background rounded-md text-white/85" title="Save current config as preset">
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="h-px bg-border my-2" />

                                <div ref={presetsRef} className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                                    {presets.length === 0 ? (
                                        <p className="text-[10px] text-muted-foreground text-center py-2">No saved presets</p>
                                    ) : (
                                        presets.map(preset => (
                                            <div key={preset.id} className="group/item flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer" onClick={() => handleLoadPreset(preset)}>
                                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                    {selectedPresetId === preset.id && (
                                                        <Check className="w-3 h-3 text-white flex-shrink-0" />
                                                    )}
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-xs font-medium text-foreground truncate">{preset.name}</span>
                                                        <span className="text-[9px] text-muted-foreground truncate">{preset.description || 'Custom Config'}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => handleDeletePreset(e, preset.id)}
                                                    className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-white/12 text-white/60 rounded-md transition-all flex-shrink-0"
                                                    title={`Delete preset ${preset.name}`}
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
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
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
                                        ? "bg-white/10 border-white/35 text-foreground shadow-sm"
                                        : "bg-card border-border text-muted-foreground hover:bg-muted hover:border-foreground/20"
                                )}
                            >
                                <span className="relative z-10 font-mono">{model}</span>
                                {config.model === model && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.35)]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Temperature Control */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Thermometer className="w-3.5 h-3.5" />
                            <span>Creativity Index</span>
                        </div>
                        <span className="font-mono text-white/90 bg-white/10 px-1.5 py-0.5 rounded border border-white/20">
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
                            className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-sm transition-all hover:[&::-webkit-slider-thumb]:scale-125"
                        />
                        <div
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-white/45 rounded-full pointer-events-none"
                            style={{ width: `${config.temperature * 100}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                        Lower for consistency, higher for creativity.
                    </p>
                </div>

                {/* Tools Section */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Active Tools</span>
                        </div>
                        <span className="font-mono text-xs text-muted-foreground/50">
                            {config.tools?.length || 0}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-muted/30 rounded-lg border border-border">
                        {!config.tools || config.tools.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground italic px-1">No tools selected</span>
                        ) : (
                            config.tools.map(toolId => (
                                <span key={toolId} className="px-2 py-1 rounded bg-white/10 border border-white/20 text-[10px] font-mono text-white/90">
                                    {toolId}
                                </span>
                            ))
                        )}
                    </div>

                    <button
                        onClick={onMcpConfigure}
                        className="w-full py-2 px-3 bg-card hover:bg-muted border border-border hover:border-foreground/20 rounded-md text-xs text-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Configure Capabilities
                    </button>
                </div>

                {/* System Prompt */}
                <div className="flex-1 flex flex-col min-h-[200px] space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-3.5 h-3.5" />
                            <span>System Instructions</span>
                        </div>
                    </div>
                    <div className="relative flex-1 group/input">
                        <textarea
                            value={config.systemPrompt}
                            onChange={(e) => handleChange('systemPrompt', e.target.value)}
                            placeholder="Define the agent's persona and constraints..."
                            className="relative w-full h-full bg-input/50 border border-border rounded-lg p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-white/35 focus:ring-1 focus:ring-white/20 resize-none leading-relaxed custom-scrollbar pb-10"
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
                    background: rgba(240, 238, 233, 0.1);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(240, 238, 233, 0.2);
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

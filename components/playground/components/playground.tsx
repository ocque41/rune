"use client"

import { Button } from "@/components/ui/button"
import { McpModal } from "./mcp-modal"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { History, MoreHorizontal, Code2, Save, Settings2, PlayCircle, Copy, Check, Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { useAgentStore } from "./store" // Import store
import { cn } from "@/lib/utils"

interface PlaygroundProps {
    onSubmit?: (input: string) => Promise<void>;
    onSave?: () => void;
}

export function Playground({ onSubmit, onSave }: PlaygroundProps) {
    // Store State
    const { config, updateConfig } = useAgentStore();

    // Local UI State
    const [input, setInput] = useState("")
    const [output, setOutput] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);

    // Config mappings (handling array vs number from slider)
    const handleTempChange = (vals: number[]) => updateConfig({ temperature: vals[0] });
    const handleMaxLengthChange = (vals: number[]) => updateConfig({ maxLength: vals[0] });
    const handleTopPChange = (vals: number[]) => updateConfig({ topP: vals[0] });

    const handleSubmit = async () => {
        if (isGenerating) {
            setIsGenerating(false);
            return;
        }
        if (!input.trim()) return;

        setIsGenerating(true);
        // setOutput(""); // Keep previous output? or clear? User likely wants to clear or append.

        try {
            if (onSubmit) {
                await onSubmit(input);
            } else {
                // Mock Generation
                await new Promise(r => setTimeout(r, 1000));
                setOutput("This is a simulated response matching the Cumulus aesthetic. In a real scenario, this would stream from the LLM.");
            }
        } catch (error) {
            console.error("Generation failed:", error);
            setOutput("[Error generating response]");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = () => {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveLocal = () => {
        if (onSave) onSave();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#09090b] text-white overflow-hidden">
            {/* Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#09090b]">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-[var(--neon-green)]/10 text-[var(--neon-green)] ring-1 ring-[var(--neon-green)]/20">
                        <PlayCircle className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-sm leading-none tracking-tight text-white/90">LLM Generation</span>
                        <span className="text-[10px] text-white/40 font-mono mt-0.5">step_01_generate</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Select>
                        <SelectTrigger className="w-[160px] h-8 text-xs bg-white/5 border-white/10 focus:ring-0 shadow-none hover:bg-white/10 transition-colors text-white/70">
                            <SelectValue placeholder="Load a preset..." />
                        </SelectTrigger>
                        <SelectContent className="dark bg-[#1a1a1a] border-white/10">
                            <SelectItem value="preset1">Grammar correction</SelectItem>
                            <SelectItem value="preset2">Summarize for a 2nd grader</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveLocal}
                        className={cn(
                            "ml-1 h-8 px-2 text-xs gap-1.5 transition-all duration-200",
                            saved ? "text-[var(--neon-green)] hover:text-[var(--neon-green)] hover:bg-[var(--neon-green)]/10" : "text-white/60 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                        {saved ? 'Saved' : 'Save'}
                    </Button>

                    <div className="h-4 w-px bg-white/10 mx-2" />

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            disabled={!output}
                            className={cn(
                                "h-7 px-2 text-xs gap-1.5 transition-all duration-200",
                                copied ? "text-[var(--neon-green)] hover:text-[var(--neon-green)] hover:bg-[var(--neon-green)]/10" : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                        <div className="h-3 w-px bg-white/10 mx-1" />

                        <McpModal />

                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-white/60 hover:text-white hover:bg-white/5">
                            <Code2 className="h-3.5 w-3.5" />
                            Code
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/5">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Content Area (Left) */}
                <div className="flex-1 flex flex-col relative bg-[#09090b] p-6 overflow-hidden">

                    {/* Output Area / Empty State */}
                    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-white/40 select-none pb-4 overflow-y-auto w-full custom-scrollbar">
                        {!output && !isGenerating ? (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/5 shadow-inner">
                                    <PlayCircle className="h-8 w-8 opacity-50" />
                                </div>
                                <h3 className="text-sm font-medium text-white/70 mb-1">Ready to Generate</h3>
                                <p className="text-xs text-white/30 font-mono text-center max-w-[200px]">
                                    Configure your model settings and run a prompt to see results.
                                </p>
                            </>
                        ) : (
                            <div className="w-full max-w-none px-10 h-full overflow-y-auto text-sm leading-relaxed font-mono whitespace-pre-wrap text-white/90">
                                {output}
                                {isGenerating && <span className="inline-block w-1.5 h-3 ml-1 bg-[var(--neon-green)] animate-pulse" />}
                            </div>
                        )}
                    </div>

                    {/* Input Area (Bottom) */}
                    <div className="flex-none w-full max-w-4xl mx-auto flex flex-col mb-2">
                        <div className="relative group/input-card rounded-xl border border-white/10 bg-[#0A0A0A] shadow-2xl transition-all focus-within:border-[var(--neon-green)]/30 flex flex-col overflow-hidden">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Write a tagline for an ice cream shop..."
                                className="flex-1 w-full h-[120px] resize-none border-0 p-6 text-base focus-visible:ring-0 bg-transparent placeholder:text-white/20 leading-relaxed font-mono custom-scrollbar text-white"
                            />

                            {/* Bottom Action Bar */}
                            <div className="flex-none p-3 flex items-center justify-between border-t border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleSubmit}
                                        disabled={!input.trim() && !isGenerating}
                                        className="h-7 px-3 text-[10px] uppercase font-semibold tracking-wider text-white/60 hover:text-[var(--neon-green)] hover:bg-[var(--neon-green)]/10 transition-colors disabled:opacity-30"
                                    >
                                        {isGenerating ? 'Stop' : (output ? 'Regenerate' : 'Submit')}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/5 rounded-full">
                                        <History className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono">
                                    <span className={input.length > (config.maxLength || 256) * 4 ? "text-red-400" : ""}>
                                        {input.length} chars
                                    </span>
                                    <div className="h-3 w-px bg-white/10" />
                                    <span className="flex items-center gap-1">
                                        <span className="text-xs">⌘</span>
                                        <span>ENTER</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Configuration */}
                <div className="w-[320px] border-l border-white/10 bg-[#0A0A0A] flex flex-col z-10 transition-all duration-300">
                    <div className="h-10 flex items-center px-4 border-b border-white/10 bg-white/[0.02]">
                        <Settings2 className="h-3.5 w-3.5 mr-2 text-white/50" />
                        <span className="text-[11px] font-semibold text-white/80 uppercase tracking-widest">Configuration</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8 custom-scrollbar">

                        {/* Model */}
                        <div className="space-y-4">
                            <div className="text-xs font-medium flex items-center justify-between text-white/80">
                                <span>Model</span>
                                <span className="text-[10px] bg-[var(--neon-green)]/10 text-[var(--neon-green)] border border-[var(--neon-green)]/20 px-1.5 py-0.5 rounded font-mono">v2.1</span>
                            </div>
                            <Select value={config.model} onValueChange={(val) => updateConfig({ model: val })}>
                                <SelectTrigger className="bg-white/5 border-white/10 h-9 text-xs text-white/90">
                                    <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent className="dark bg-[#1a1a1a] border-white/10">
                                    <SelectItem value="gpt-4">gpt-4</SelectItem>
                                    <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                                    <SelectItem value="claude-3-5-sonnet-20240620">claude-3.5-sonnet</SelectItem>
                                    <SelectItem value="mistral-large-latest">mistral-large</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator className="bg-white/10" />

                        {/* System Instructions */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-white/80">System Instructions</Label>
                            <Textarea
                                value={config.systemPrompt}
                                onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                                className="h-24 resize-none text-[11px] leading-relaxed bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-[var(--neon-green)]/30 min-h-[100px] text-white/80"
                                placeholder="You are a helpful assistant..."
                            />
                        </div>

                        <Separator className="bg-white/10" />

                        {/* Toggles & Sliders */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="stream-mode" className="text-xs font-medium text-white/80">Stream Response</Label>
                                <Switch
                                    id="stream-mode"
                                    checked={true} // todo: add to store if needed
                                    className="scale-75 data-[state=checked]:bg-[var(--neon-green)]"
                                />
                            </div>
                            <div className="flex items-center justify-between space-x-2">
                                <Label htmlFor="json-mode" className="text-xs font-medium text-white/80">JSON Mode</Label>
                                <Switch
                                    id="json-mode"
                                    checked={config.responseFormat === 'json'}
                                    onCheckedChange={(checked) => updateConfig({ responseFormat: checked ? 'json' : 'text' })}
                                    className="scale-75 data-[state=checked]:bg-[var(--neon-green)]"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium text-white/80">Temperature</div>
                                    <span className="text-[10px] font-mono text-white/50 w-8 text-right bg-white/5 rounded px-1">{config.temperature.toFixed(2)}</span>
                                </div>
                                <Slider
                                    value={[config.temperature]}
                                    onValueChange={handleTempChange}
                                    max={1}
                                    step={0.01}
                                    className="py-1 [&>.absolute]:bg-[var(--neon-green)]"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium text-white/80">Max Length</div>
                                    <span className="text-[10px] font-mono text-white/50 w-8 text-right bg-white/5 rounded px-1">{config.maxLength || 256}</span>
                                </div>
                                <Slider
                                    value={[config.maxLength || 256]}
                                    onValueChange={handleMaxLengthChange}
                                    max={4000}
                                    step={1}
                                    className="py-1 [&>.absolute]:bg-[var(--neon-green)]"
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-medium text-white/80">Top P</div>
                                    <span className="text-[10px] font-mono text-white/50 w-8 text-right bg-white/5 rounded px-1">{config.topP || 0.9}</span>
                                </div>
                                <Slider
                                    value={[config.topP || 0.9]}
                                    onValueChange={handleTopPChange}
                                    max={1}
                                    step={0.01}
                                    className="py-1 [&>.absolute]:bg-[var(--neon-green)]"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

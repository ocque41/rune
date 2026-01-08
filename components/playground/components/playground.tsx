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
import { History, MoreHorizontal, Code2, Save, Settings2, PlayCircle, Copy, Check } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { useAgentStore } from "./store"
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

    // Config mappings
    const handleTempChange = (vals: number[]) => updateConfig({ temperature: vals[0] });
    const handleMaxLengthChange = (vals: number[]) => updateConfig({ maxLength: vals[0] });
    const handleTopPChange = (vals: number[]) => updateConfig({ topP: vals[0] });

    // Streaming simulation helper
    const simulateStreaming = useCallback(async (text: string) => {
        setOutput("");
        for (let i = 0; i < text.length; i++) {
            await new Promise(r => setTimeout(r, 15 + Math.random() * 25));
            setOutput(prev => prev + text[i]);
        }
    }, []);

    const handleSubmit = async () => {
        if (isGenerating) {
            setIsGenerating(false);
            return;
        }
        if (!input.trim()) return;

        setIsGenerating(true);
        setOutput("");

        try {
            if (onSubmit) {
                await onSubmit(input);
            } else {
                // Mock streaming generation
                const mockResponse = "This is a simulated response from the LLM. The Shimmering Juno interface provides a premium, glassmorphic experience for AI interactions. Configure your model settings in the sidebar and watch the magic happen.";
                await simulateStreaming(mockResponse);
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

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [input, isGenerating]);

    return (
        <div className="relative group/container h-full w-full">
            {/* Main Glassmorphic Container */}
            <div className={cn(
                "flex flex-col h-full w-full overflow-hidden",
                "bg-background/95 backdrop-blur-xl",
                "border border-border/40 ring-1 ring-white/5",
                "shadow-2xl rounded-xl",
                "transition-all duration-500",
                "hover:shadow-primary/5 hover:border-primary/30"
            )}>
                {/* Header (Top Bar) - h-14, darker contrast */}
                <div className="h-14 border-b border-border/40 flex items-center justify-between px-4 bg-muted/20">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20">
                            <PlayCircle className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm leading-none tracking-tight">LLM Generation</span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-70">step_01_generate</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Preset Selector */}
                        <Select>
                            <SelectTrigger className="w-[160px] h-8 text-xs bg-background/50 border-input/40 focus:ring-0 shadow-none hover:bg-accent/50 transition-colors">
                                <SelectValue placeholder="Load a preset..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="preset1">Grammar correction</SelectItem>
                                <SelectItem value="preset2">Summarize for a 2nd grader</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Save Button with feedback */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSaveLocal}
                            className={cn(
                                "ml-1 h-8 px-2 text-xs gap-1.5 transition-all duration-200",
                                saved ? "text-green-400 hover:text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                        >
                            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                            {saved ? 'Saved' : 'Save'}
                        </Button>

                        <div className="h-4 w-px bg-border/60 mx-2" />

                        <div className="flex items-center gap-1">
                            {/* Copy Button with feedback */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                disabled={!output}
                                className={cn(
                                    "h-7 px-2 text-xs gap-1.5 transition-all duration-200",
                                    copied ? "text-green-400 hover:text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                            >
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <div className="h-3 w-px bg-border/60 mx-1" />

                            {/* MCP Modal */}
                            <McpModal />

                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50">
                                <Code2 className="h-3.5 w-3.5" />
                                Code
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-accent/50">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Main Stage (Left/Center) - with gradient */}
                    <div className="flex-1 flex flex-col relative bg-gradient-to-b from-transparent to-muted/5 p-6 overflow-hidden">

                        {/* Output Area / Empty State */}
                        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-muted-foreground/40 select-none pb-4 overflow-y-auto w-full custom-scrollbar">
                            {!output && !isGenerating ? (
                                <>
                                    <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4 ring-1 ring-white/5 shadow-inner">
                                        <PlayCircle className="h-8 w-8 opacity-50" />
                                    </div>
                                    <h3 className="text-sm font-medium text-foreground/70 mb-1">Ready to Generate</h3>
                                    <p className="text-xs text-muted-foreground/60 font-mono text-center max-w-[200px]">
                                        Configure your model settings and run a prompt to see results.
                                    </p>
                                </>
                            ) : (
                                <div className="w-full max-w-none px-10 h-full overflow-y-auto text-sm leading-relaxed font-mono whitespace-pre-wrap text-foreground/90 custom-scrollbar">
                                    {output}
                                    {isGenerating && <span className="inline-block w-1.5 h-3 ml-1 bg-primary animate-pulse" />}
                                </div>
                            )}
                        </div>

                        {/* Floating Input Card */}
                        <div className="flex-none w-full max-w-5xl mx-auto flex flex-col mb-2">
                            <div className={cn(
                                "relative group/input-card rounded-xl",
                                "border border-border/40 bg-background/60 backdrop-blur-md",
                                "shadow-2xl ring-1 ring-white/5",
                                "transition-all duration-300",
                                "focus-within:ring-primary/20 focus-within:border-primary/30",
                                "flex flex-col overflow-hidden"
                            )}>
                                <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Write a tagline for an ice cream shop..."
                                    className="flex-1 w-full h-[140px] resize-none border-0 p-6 text-base focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/30 leading-relaxed font-mono custom-scrollbar"
                                />

                                {/* Action Bar (Bottom) */}
                                <div className="flex-none p-3 flex items-center justify-between border-t border-white/5 bg-black/5">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSubmit}
                                            disabled={!input.trim() && !isGenerating}
                                            className="h-7 px-3 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
                                        >
                                            {isGenerating ? 'Stop' : (output ? 'Regenerate' : 'Submit')}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full">
                                            <History className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50 font-mono">
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

                    {/* Right Sidebar - Configuration Panel */}
                    <div className="w-[320px] border-l border-border/40 bg-muted/5 flex flex-col">
                        <div className="h-10 flex items-center px-4 border-b border-border/40 bg-muted/10">
                            <Settings2 className="h-3.5 w-3.5 mr-2 text-muted-foreground/70" />
                            <span className="text-[11px] font-semibold text-muted-foreground/90 uppercase tracking-widest">Configuration</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8 custom-scrollbar">

                            {/* Model Selection */}
                            <div className="space-y-4">
                                <div className="text-xs font-medium flex items-center justify-between text-foreground/80">
                                    <span>Model</span>
                                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono">v2.1</span>
                                </div>
                                <Select value={config.model} onValueChange={(val) => updateConfig({ model: val })}>
                                    <SelectTrigger className="bg-background/80 border-input/60 h-9 text-xs">
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="gpt-4">gpt-4</SelectItem>
                                        <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                                        <SelectItem value="claude-3-5-sonnet-20240620">claude-3.5-sonnet</SelectItem>
                                        <SelectItem value="mistral-large-latest">mistral-large</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator className="bg-border/60" />

                            {/* System Instructions */}
                            <div className="space-y-3">
                                <Label className="text-xs font-medium text-foreground/80">System Instructions</Label>
                                <Textarea
                                    value={config.systemPrompt}
                                    onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                                    className="h-24 resize-none text-[11px] leading-relaxed bg-background/50 border-input/40 focus-visible:ring-1 min-h-[100px]"
                                    placeholder="You are a helpful assistant..."
                                />
                            </div>

                            <Separator className="bg-border/60" />

                            {/* Toggles & Sliders */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="stream-mode" className="text-xs font-medium text-foreground/80">Stream Response</Label>
                                    <Switch id="stream-mode" checked={true} className="scale-75 data-[state=checked]:bg-primary" />
                                </div>
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="json-mode" className="text-xs font-medium text-foreground/80">JSON Mode</Label>
                                    <Switch
                                        id="json-mode"
                                        checked={config.responseFormat === 'json'}
                                        onCheckedChange={(checked) => updateConfig({ responseFormat: checked ? 'json' : 'text' })}
                                        className="scale-75 data-[state=checked]:bg-primary"
                                    />
                                </div>

                                {/* Temperature Slider */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-medium text-foreground/80">Temperature</div>
                                        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right bg-muted/30 rounded px-1">{config.temperature.toFixed(2)}</span>
                                    </div>
                                    <Slider
                                        value={[config.temperature]}
                                        onValueChange={handleTempChange}
                                        max={1}
                                        step={0.01}
                                        className="py-1"
                                    />
                                </div>

                                {/* Max Length Slider */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-medium text-foreground/80">Max Length</div>
                                        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right bg-muted/30 rounded px-1">{config.maxLength || 256}</span>
                                    </div>
                                    <Slider
                                        value={[config.maxLength || 256]}
                                        onValueChange={handleMaxLengthChange}
                                        max={4000}
                                        step={1}
                                        className="py-1"
                                    />
                                </div>

                                {/* Top P Slider */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-medium text-foreground/80">Top P</div>
                                        <span className="text-[10px] font-mono text-muted-foreground w-10 text-right bg-muted/30 rounded px-1">{(config.topP || 0.9).toFixed(2)}</span>
                                    </div>
                                    <Slider
                                        value={[config.topP || 0.9]}
                                        onValueChange={handleTopPChange}
                                        max={1}
                                        step={0.01}
                                        className="py-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}


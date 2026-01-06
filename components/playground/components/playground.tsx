"use client"

import { Button } from "@/components/ui/button"
import { McpModal } from "@/components/mcp-modal"
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
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { animate } from "animejs"


export function Playground() {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number, y: number } | null>(null);
    const [dragCurrent, setDragCurrent] = useState<{ x: number, y: number } | null>(null);
    const [connectionPath, setConnectionPath] = useState<string>("");
    const [dragType, setDragType] = useState<'input' | 'output' | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Configuration State
    const [temperature, setTemperature] = useState([0.56])
    const [maxLength, setMaxLength] = useState([256])
    const [topP, setTopP] = useState([0.9])
    const [freqPenalty, setFreqPenalty] = useState([0])
    const [presPenalty, setPresPenalty] = useState([0])

    // New Configuration State
    const [stream, setStream] = useState(true)
    const [jsonMode, setJsonMode] = useState(false)
    const [systemPrompt, setSystemPrompt] = useState("You are a helpful AI assistant.")
    const [input, setInput] = useState("")
    const [output, setOutput] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)

    const handleSubmit = async () => {
        if (isGenerating) {
            setIsGenerating(false);
            return;
        }
        if (!input.trim()) return;

        setIsGenerating(true);
        setOutput("");

        // Simulating a response stream
        const dummyResponse = "Here is a creative tagline for your ice cream shop:\n\n'Scoops of Joy, Cones of Wonder.'\n\nAlternatively:\n- 'Frozen Happiness in Every Bite'\n- 'The Sweetest Chill on Earth'\n\nLet me know if you'd like more options!";

        const chunks = dummyResponse.split("");

        for (let i = 0; i < chunks.length; i++) {
            // Check if still generating (in case stopped)
            // In a real app we'd use an AbortController, here we just rely on state ref if possible or just let it run (simple sim)
            await new Promise(resolve => setTimeout(resolve, 15 + Math.random() * 30)); // Random typing speed
            setOutput(prev => prev + chunks[i]);
        }

        setIsGenerating(false);
    };

    const handleCopy = () => {
        if (!output) return;
        navigator.clipboard.writeText(output);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    const [copied, setCopied] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };
    const [saved, setSaved] = useState(false);


    const pathRef = useRef<SVGPathElement>(null);

    const handleMouseDown = (e: React.MouseEvent, type: 'input' | 'output') => {
        e.preventDefault();
        e.stopPropagation();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;

        setDragStart({ x: startX, y: startY });
        setDragCurrent({ x: e.clientX, y: e.clientY });
        setDragType(type);
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragStart) return;
            setDragCurrent({ x: e.clientX, y: e.clientY });
            updatePath(e.clientX, e.clientY);
        };

        const handleMouseUp = () => {
            if (isDragging) {
                setIsDragging(false);
                setDragStart(null);
                setDragCurrent(null);
                setConnectionPath("");
                setDragType(null);
            }
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragStart, dragType]);

    const updatePath = (currentX: number, currentY: number) => {
        if (!dragStart) return;
        const sx = dragStart.x;
        const sy = dragStart.y;
        const ex = currentX;
        const ey = currentY;

        // Bezier Control Points
        const distance = Math.hypot(ex - sx, ey - sy);
        const curvature = Math.min(distance * 0.5, 150);

        // Adjust curvature direction based on handle type
        // Input (Left Handle): Curve starts Left (-x) and ends approaching from Right (+x) (expecting to connect to an Output)
        // Output (Right Handle): Curve starts Right (+x) and ends approaching from Left (-x) (expecting to connect to an Input)

        let startControlX, endControlX;

        if (dragType === 'input') {
            startControlX = sx - curvature;
            endControlX = ex + curvature;
        } else {
            // output or default
            startControlX = sx + curvature;
            endControlX = ex - curvature;
        }

        const path = `M ${sx} ${sy} C ${startControlX} ${sy}, ${endControlX} ${ey}, ${ex} ${ey}`;
        setConnectionPath(path);
    };

    useEffect(() => {
        if (isDragging && pathRef.current) {
            const pathLength = pathRef.current.getTotalLength();
            pathRef.current.style.strokeDasharray = `${pathLength}`;
            pathRef.current.style.strokeDashoffset = `${pathLength}`;

            animate(pathRef.current, {
                strokeDashoffset: [pathLength, 0],
                duration: 400,
                easing: 'easeOutCubic'
            });
        }
    }, [isDragging]);

    return (
        <div className="relative group">
            {/* Connection Overlay */}
            {isDragging && mounted && createPortal(
                <div className="fixed inset-0 pointer-events-none z-[9999]">
                    <svg className="w-full h-full">
                        <defs>
                            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="oklch(0.704 0.191 22.216)" />
                                <stop offset="100%" stopColor="oklch(0.646 0.222 41.116)" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>
                        <path
                            ref={pathRef}
                            d={connectionPath}
                            fill="none"
                            stroke="url(#connectionGradient)"
                            strokeWidth="4"
                            strokeLinecap="round"
                            filter="url(#glow)"
                            className="opacity-90"
                        />
                        {/* Cursor follower dot */}
                        {dragCurrent && (
                            <circle cx={dragCurrent.x} cy={dragCurrent.y} r="5" fill="white" className="drop-shadow-md" />
                        )}
                    </svg>
                </div>,
                document.body
            )}

            {/* Input Handle */}
            <div
                onMouseDown={(e) => handleMouseDown(e, 'input')}
                className="absolute top-1/2 -left-4 z-50 w-8 h-8 flex items-center justify-center transform -translate-y-1/2 cursor-crosshair transition-transform duration-200 hover:scale-110"
            >
                <div className={`w-4 h-4 rounded-full border-[3px] border-background bg-muted-foreground ring-2 ring-transparent transition-all duration-300 group-hover:bg-primary group-hover:ring-primary/20 shadow-sm ${isDragging ? 'scale-125 bg-primary ring-primary/40' : ''}`} />
            </div>

            <div className="w-[1000px] h-[700px] border border-border/40 rounded-xl bg-background/95 backdrop-blur-xl flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/5 transition-all duration-500 hover:shadow-primary/5 hover:border-primary/30">
                {/* Header */}
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
                        <Select>
                            <SelectTrigger className="w-[160px] h-8 text-xs bg-background/50 border-input/40 focus:ring-0 shadow-none hover:bg-accent/50 transition-colors">
                                <SelectValue placeholder="Load a preset..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="preset1">Grammar correction</SelectItem>
                                <SelectItem value="preset2">Summarize for a 2nd grader</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSave}
                            className={`ml-1 h-8 px-2 text-xs gap-1.5 transition-all duration-200 ${saved ? 'text-green-400 hover:text-green-400 hover:bg-green-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
                        >
                            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                            {saved ? 'Saved' : 'Save'}
                        </Button>

                        <div className="h-4 w-px bg-border/60 mx-2" />

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                disabled={!output}
                                className={`h-7 px-2 text-xs gap-1.5 transition-all duration-200 ${copied ? 'text-green-400 hover:text-green-400 hover:bg-green-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
                            >
                                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <div className="h-3 w-px bg-border/60 mx-1" />

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
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col relative bg-gradient-to-b from-transparent to-muted/5 p-6 overflow-hidden">

                        {/* Placeholder for conversation history or output area - Reduced size to give more room to input */}
                        {/* Output Area / Empty State */}
                        <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-muted-foreground/40 select-none pb-4 overflow-y-auto w-full">
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
                                <div className="w-full max-w-none px-10 h-full overflow-y-auto text-sm leading-relaxed font-mono whitespace-pre-wrap text-foreground/90">
                                    {output}
                                    {isGenerating && <span className="inline-block w-1.5 h-3 ml-1 bg-primary animate-pulse" />}
                                </div>
                            )}
                        </div>

                        {/* Floating Input Card - Restored Centered Layout */}
                        <div className="flex-1 min-h-0 relative w-full max-w-5xl mx-auto flex flex-col mb-2">
                            <div className="flex-1 relative group/input-card rounded-xl border border-border/40 bg-background/60 backdrop-blur-md shadow-2xl ring-1 ring-white/5 transition-all focus-within:ring-primary/20 focus-within:border-primary/30 active-within:shadow-primary/5 flex flex-col overflow-hidden">
                                <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Write a tagline for an ice cream shop..."
                                    className="flex-1 w-full resize-none field-sizing-fixed border-0 p-6 text-base focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/30 leading-relaxed font-mono custom-scrollbar overflow-y-auto min-h-0"
                                />

                                {/* Bottom Action Bar - Now relative flex item, permanently at bottom */}
                                <div className="flex-none p-3 flex items-center justify-between border-t border-white/5 bg-black/5">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSubmit}
                                            disabled={!input.trim() && !isGenerating}
                                            className="h-7 px-2 text-[10px] uppercase font-semibold tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                                        >
                                            {isGenerating ? 'Stop' : (output ? 'Regenerate' : 'Submit')}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full">
                                            <History className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground/50 font-mono">
                                        <span className={input.length > maxLength[0] * 4 ? "text-red-400" : ""}>
                                            {input.length} chars
                                        </span>
                                        <div className="h-3 w-px bg-white/10" />
                                        <span className="flex items-center gap-1">
                                            <span className="text-xs">⌘</span>
                                            <span>ENTER</span>
                                        </span>
                                    </div>

                                    <div className="h-4 w-px bg-white/10 mx-1" />

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setInput("")}
                                        className="h-6 w-6 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors rounded-full ml-1"
                                        title="Clear input"
                                    >
                                        <span className="sr-only">Clear</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Footer Metrics - can be added here if needed */}
                    </div>

                    {/* Right Sidebar - Flow Settings */}
                    <div className="w-[320px] border-l border-border/40 bg-muted/5 flex flex-col">
                        <div className="h-10 flex items-center px-4 border-b border-border/40 bg-muted/10">
                            <Settings2 className="h-3.5 w-3.5 mr-2 text-muted-foreground/70" />
                            <span className="text-[11px] font-semibold text-muted-foreground/90 uppercase tracking-widest">Configuration</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8 custom-scrollbar">

                            <div className="space-y-4">
                                <div className="text-xs font-medium flex items-center justify-between text-foreground/80">
                                    <span>Model</span>
                                    <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded font-mono">v2.1</span>
                                </div>
                                <Select defaultValue="gpt-4">
                                    <SelectTrigger className="bg-background/80 border-input/60 h-9 text-xs">
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text-davinci-003">text-davinci-003</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo">gpt-3.5-turbo</SelectItem>
                                        <SelectItem value="gpt-4">gpt-4</SelectItem>
                                        <SelectItem value="gpt-4-turbo">gpt-4-turbo</SelectItem>
                                        <SelectItem value="claude-3-opus">claude-3-opus</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator className="bg-border/60" />

                            <div className="space-y-3">
                                <Label className="text-xs font-medium text-foreground/80">System Instructions</Label>
                                <Textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    className="h-24 resize-none text-[11px] leading-relaxed bg-background/50 border-input/40 focus-visible:ring-1 min-h-[100px]"
                                    placeholder="You are a helpful assistant..."
                                />
                            </div>

                            <Separator className="bg-border/60" />

                            <div className="space-y-6">
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="stream-mode" className="text-xs font-medium text-foreground/80">Stream Response</Label>
                                    <Switch id="stream-mode" checked={stream} onCheckedChange={setStream} className="scale-75 data-[state=checked]:bg-primary" />
                                </div>
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="json-mode" className="text-xs font-medium text-foreground/80">JSON Mode</Label>
                                    <Switch id="json-mode" checked={jsonMode} onCheckedChange={setJsonMode} className="scale-75 data-[state=checked]:bg-primary" />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-medium text-foreground/80">Temperature</div>
                                        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right bg-muted/30 rounded px-1">{temperature}</span>
                                    </div>
                                    <Slider
                                        value={temperature}
                                        onValueChange={setTemperature}
                                        max={1}
                                        step={0.01}
                                        className="py-1"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-medium text-foreground/80">Max Length</div>
                                        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right bg-muted/30 rounded px-1">{maxLength}</span>
                                    </div>
                                    <Slider
                                        value={maxLength}
                                        onValueChange={setMaxLength}
                                        max={4000}
                                        step={1}
                                        className="py-1"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-medium text-foreground/80">Top P</div>
                                        <span className="text-[10px] font-mono text-muted-foreground w-8 text-right bg-muted/30 rounded px-1">{topP}</span>
                                    </div>
                                    <Slider
                                        value={topP}
                                        onValueChange={setTopP}
                                        max={1}
                                        step={0.01}
                                        className="py-1"
                                    />
                                </div>
                            </div>

                            <Separator className="bg-border/60" />

                            <div className="space-y-2">
                                <div className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest mb-3">Advanced</div>
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-medium text-foreground/80">Frequency Penalty</div>
                                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded px-1">{freqPenalty}</span>
                                        </div>
                                        <Slider
                                            value={freqPenalty}
                                            onValueChange={setFreqPenalty}
                                            max={2}
                                            step={0.01}
                                            className="py-1"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-medium text-foreground/80">Presence Penalty</div>
                                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 rounded px-1">{presPenalty}</span>
                                        </div>
                                        <Slider
                                            value={presPenalty}
                                            onValueChange={setPresPenalty}
                                            max={2}
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

            {/* Output Handle */}
            <div
                onMouseDown={(e) => handleMouseDown(e, 'output')}
                className="absolute top-1/2 -right-4 z-50 w-8 h-8 flex items-center justify-center transform -translate-y-1/2 cursor-crosshair transition-transform duration-200 hover:scale-110"
            >
                <div className={`w-4 h-4 rounded-full border-[3px] border-background bg-muted-foreground ring-2 ring-transparent transition-all duration-300 group-hover:bg-primary group-hover:ring-primary/20 shadow-sm ${isDragging ? 'scale-125 bg-primary ring-primary/40' : ''}`} />
            </div>
        </div>
    )
}

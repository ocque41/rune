"use client"

import * as React from "react"
import { Check, Search, Wrench } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface Tool {
    id: string;
    name: string;
    description?: string;
    source?: string;
}

interface ToolSelectorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableTools: Tool[];
    selectedTools: string[];
    onSelectionChange: (selectedIds: string[]) => void;
}

export function ToolSelector({
    open,
    onOpenChange,
    availableTools,
    selectedTools,
    onSelectionChange
}: ToolSelectorProps) {
    const [searchQuery, setSearchQuery] = React.useState("")

    const filteredTools = availableTools.filter(tool =>
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const toggleTool = (toolId: string) => {
        if (selectedTools.includes(toolId)) {
            onSelectionChange(selectedTools.filter(id => id !== toolId))
        } else {
            onSelectionChange([...selectedTools, toolId])
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-border/60 p-0 overflow-hidden gap-0">
                <DialogHeader className="px-6 py-4 border-b border-white/5">
                    <DialogTitle className="flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-primary" />
                        Select Tools
                    </DialogTitle>
                    <DialogDescription>
                        Enable capabilities for the agent to use.
                    </DialogDescription>
                </DialogHeader>

                <div className="p-4 border-b border-white/5 bg-muted/20">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search available tools..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background/50 border-input/40"
                        />
                    </div>
                </div>

                <ScrollArea className="h-[400px] p-2">
                    <div className="flex flex-col gap-1 p-2">
                        {filteredTools.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground text-sm">
                                No tools found matching "{searchQuery}"
                            </div>
                        ) : (
                            filteredTools.map((tool) => {
                                const isSelected = selectedTools.includes(tool.id);
                                return (
                                    <div
                                        key={tool.id}
                                        onClick={() => toggleTool(tool.id)}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                                            isSelected
                                                ? "bg-primary/10 border-primary/20 shadow-sm"
                                                : "hover:bg-muted/50 hover:border-white/5"
                                        )}
                                    >
                                        <div className={cn(
                                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "border-muted-foreground/30 bg-transparent"
                                        )}>
                                            {isSelected && <Check className="h-3.5 w-3.5" />}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium leading-none text-foreground/90">
                                                    {tool.name}
                                                </span>
                                                {tool.source && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground bg-muted/20 border-white/10">
                                                        {tool.source}
                                                    </Badge>
                                                )}
                                            </div>
                                            {tool.description && (
                                                <p className="text-xs text-muted-foreground/70 line-clamp-2">
                                                    {tool.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-white/5 bg-muted/10 flex justify-between items-center text-xs text-muted-foreground">
                    <span>{selectedTools.length} selected</span>
                    <Badge variant="secondary" className="font-mono text-[10px] opacity-70">
                        Auto-Pilot
                    </Badge>
                </div>
            </DialogContent>
        </Dialog>
    )
}

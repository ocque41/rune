"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { McpModal } from "./mcp-modal"
import { ChatListModal } from "./chat-list-modal"
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
import { History, MoreHorizontal, Code2, Save, Settings2, PlayCircle, Copy, Check, MessageSquare, Plus, Clock, Zap, Trash2, Download, Plug, Loader2, Globe, Terminal } from "lucide-react"
import React, { useState, useEffect, useCallback, useRef } from "react"
import { useAgentStore, ChatMessage, LLMConfig } from "../store"
import { cn } from "@/lib/utils"
// @ts-ignore
import { toast } from "sonner"
import { getAvailableTools, AgentToolDef } from "@/app/actions/tools"
import { getAgentPresets, saveAgentPreset, deleteAgentPreset, AgentPreset } from "@/app/actions/presets"
import { getEffectiveAgentConfig } from "@/app/actions/agent-config"
import { getAutonomyPolicy, updateAutonomyPolicy } from "@/app/actions/autonomy"
import { AutonomyConfig } from "@/lib/autonomy/policy"
import anime from "animejs"
import { ApprovalCard } from "@/components/chat/approval-card"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


interface PlaygroundProps {
    workflowId?: string | null;
    onSubmit?: (input: string) => Promise<void>;
    onSave?: () => void;
}

export function Playground({ workflowId, onSubmit, onSave }: PlaygroundProps) {
    // Store State
    const {
        config,
        updateConfig,
        currentChatId,
        messages,
        isTemporaryChat,
        setCurrentChat,
        setActiveWorkflow,
        setMessages,
        addMessage,
        setIsTemporaryChat,
        clearCurrentChat
    } = useAgentStore();

    // Local UI State
    const [input, setInput] = useState("")
    const [output, setOutput] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showChatModal, setShowChatModal] = useState(false);
    const [autonomousMode, setAutonomousMode] = useState(false);
    const [autonomyPolicy, setAutonomyPolicy] = useState<AutonomyConfig | null>(null);
    const [isAutonomyLoading, setIsAutonomyLoading] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isStreamEnabled, setIsStreamEnabled] = useState(true);

    // Auto-scroll ref
    const [availableTools, setAvailableTools] = useState<AgentToolDef[]>([]);
    const [isLoadingTools, setIsLoadingTools] = useState(false);
    const toolsListRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);

    // Preset State
    const [presets, setPresets] = useState<AgentPreset[]>([]);
    const [showSavePreset, setShowSavePreset] = useState(false);
    const [newPresetName, setNewPresetName] = useState("");
    const [isSavingPreset, setIsSavingPreset] = useState(false);
    const [showCodeModal, setShowCodeModal] = useState(false);
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
    const [selectedPresetName, setSelectedPresetName] = useState<string | null>(null);
    const isLoadingPresetRef = useRef(false);

    // Slider handlers
    const handleTempChange = (vals: number[]) => updateConfig({ temperature: vals[0] });
    const handleMaxTokensChange = (vals: number[]) => updateConfig({ maxTokens: vals[0] });
    const handleTopPChange = (vals: number[]) => updateConfig({ topP: vals[0] });
    const handleFreqPenaltyChange = (vals: number[]) => updateConfig({ frequencyPenalty: vals[0] });
    const handlePresPenaltyChange = (vals: number[]) => updateConfig({ presencePenalty: vals[0] });

    // Switch chats when workflowId changes
    useEffect(() => {
        if (!workflowId) return;
        setActiveWorkflow(workflowId);

        // Load last active chat for this workflow
        const useChatId = useAgentStore.getState().lastActiveChats[workflowId] || null;

        // If we are already on this chat, do nothing. 
        // But if we switched workflow, currentChatId might still be the old one.
        // We must update currentChatId.

        if (useAgentStore.getState().currentChatId !== useChatId) {
            // Avoid loop if setting null
            setCurrentChat(useChatId);
        }
    }, [workflowId, setActiveWorkflow, setCurrentChat]);

    const loadChat = async (chatId: string) => {
        try {
            const res = await fetch(`/api/rune/chats/${chatId}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                // Show the last assistant message as output if exists
                const lastAssistant = data.messages?.filter((m: ChatMessage) => m.role === 'assistant').pop();
                if (lastAssistant) setOutput(lastAssistant.content);
            }
        } catch (e) {
            console.error('Failed to load chat:', e);
        }
    };

    const loadAutonomyPolicy = useCallback(async (workflowId?: string | null) => {
        setIsAutonomyLoading(true);
        try {
            const workflowPolicy = workflowId ? await getAutonomyPolicy(workflowId) : null;
            if (workflowPolicy) {
                setAutonomyPolicy(workflowPolicy);
                setAutonomousMode(workflowPolicy.mode === 'AUTONOMOUS');
                return;
            }

            const userPolicy = await getAutonomyPolicy();
            if (userPolicy) {
                setAutonomyPolicy(userPolicy);
                setAutonomousMode(userPolicy.mode === 'AUTONOMOUS');
            } else {
                setAutonomyPolicy(null);
                setAutonomousMode(false);
            }
        } catch (e) {
            console.error('Failed to load autonomy policy', e);
        } finally {
            setIsAutonomyLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAutonomyPolicy(workflowId);
    }, [workflowId, loadAutonomyPolicy]);

    // Load messages when currentChatId changes
    useEffect(() => {
        if (currentChatId) {
            // Don't reload if we are in the middle of generating (avoids overwriting optimistic state)
            if (!isGenerating) {
                loadChat(currentChatId);
            }
        } else {
            // Clear messages if no chat
            setMessages([]);
            setOutput('');
            // Optional: If we want to show empty state
        }
    }, [currentChatId, isGenerating]);

    // Load tools and presets on mount
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingTools(true);
            try {
                const [{ tools }, loadedPresets, effectiveConfig] = await Promise.all([
                    getAvailableTools(),
                    getAgentPresets(),
                    getEffectiveAgentConfig(workflowId || undefined)
                ]);
                setAvailableTools(tools);
                setPresets(loadedPresets);
                if (effectiveConfig) {
                    updateConfig(effectiveConfig);
                }
            } catch (e) {
                console.error("Failed to load initial data", e);
            } finally {
                setIsLoadingTools(false);
            }
        };
        loadInitialData();
    }, [workflowId, updateConfig]);

    const handleLoadPreset = (presetId: string) => {
        const preset = presets.find(p => p.id === presetId);
        if (preset) {
            isLoadingPresetRef.current = true;
            updateConfig(preset.config);
            setSelectedPresetId(preset.id);
            setSelectedPresetName(preset.name);
            toast.success(`Loaded preset: ${preset.name}`);
        }
    };

    const handleAutonomousToggle = async (enabled: boolean) => {
        setAutonomousMode(enabled);
        setIsAutonomyLoading(true);

        try {
            const basePolicy = autonomyPolicy || (workflowId ? await getAutonomyPolicy(workflowId) : await getAutonomyPolicy()) || {
                mode: 'OFF',
                maxActionsPerHour: 10,
                maxActionsPerDay: 50,
                maxTokensPerHour: 100000,
                maxTokensPerDay: 500000,
                maxParallelJobs: 3,
                toolAllowlist: [],
                toolBlocklist: [],
                triggersEnabled: {
                    webhook: true,
                    schedule: true,
                    runCompletion: true,
                    manualOnly: false
                },
                notifyOnSuccess: false,
                notifyOnFailure: true,
                notifyOnApprovalNeeded: true
            } as AutonomyConfig;

            const nextPolicy = {
                ...basePolicy,
                mode: enabled ? 'AUTONOMOUS' : 'OFF'
            } as AutonomyConfig;

            await updateAutonomyPolicy(nextPolicy, workflowId || undefined);
            setAutonomyPolicy(nextPolicy);
        } catch (e) {
            console.error('Failed to update autonomy policy', e);
            setAutonomousMode(autonomyPolicy?.mode === 'AUTONOMOUS');
            toast.error('Failed to update autonomy mode');
        } finally {
            setIsAutonomyLoading(false);
        }
    };

    const autonomyLabel = autonomyPolicy?.mode === 'CONFIRM'
        ? 'Confirm'
        : autonomousMode
            ? 'Autonomous'
            : 'Off';

    const autonomyBadgeVariant: "default" | "secondary" | "outline" = autonomousMode
        ? 'default'
        : autonomyPolicy?.mode === 'CONFIRM'
            ? 'secondary'
            : 'outline';

    // Track config changes to clear selection
    useEffect(() => {
        if (isLoadingPresetRef.current) {
            isLoadingPresetRef.current = false;
            return;
        }
        // If config changes manually, clear selection
        if (selectedPresetId) {
            setSelectedPresetId(null);
            setSelectedPresetName(null);
        }
    }, [config, selectedPresetId]);

    const handleSavePreset = async () => {
        if (!newPresetName.trim()) return;
        setIsSavingPreset(true);

        // Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const tempPreset: AgentPreset = {
            id: tempId,
            name: newPresetName,
            config: config,
            description: "",
            is_favorite: false,
            updated_at: new Date().toISOString(),
            user_id: "current-user"
        };

        setPresets(prev => [tempPreset, ...prev]);
        setSelectedPresetId(tempId);
        setSelectedPresetName(newPresetName);
        setShowSavePreset(false);
        setNewPresetName("");

        try {
            const savedPreset = await saveAgentPreset(newPresetName, config);

            setPresets(prev => prev.map(p => p.id === tempId ? savedPreset : p));
            if (selectedPresetId === tempId) {
                setSelectedPresetId(savedPreset.id);
            }

            toast.success("Preset saved");
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (e) {
            console.error("Failed to save preset", e);
            toast.error("Failed to save preset");

            // Revert
            setPresets(prev => prev.filter(p => p.id !== tempId));
            if (selectedPresetId === tempId) {
                setSelectedPresetId(null);
                setSelectedPresetName(null);
            }
        } finally {
            setIsSavingPreset(false);
        }
    };

    const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const deletedPreset = presets.find(p => p.id === presetId);
        setPresets(prev => prev.filter(p => p.id !== presetId));

        if (selectedPresetId === presetId) {
            setSelectedPresetId(null);
            setSelectedPresetName(null);
        }

        try {
            await deleteAgentPreset(presetId);
            toast.success("Preset deleted");
        } catch (error) {
            toast.error("Failed to delete preset");
            if (deletedPreset) {
                setPresets(prev => [deletedPreset, ...prev]);
            }
        }
    };

    // Animate tools when loaded
    useEffect(() => {
        if (!isLoadingTools && availableTools.length > 0 && toolsListRef.current) {
            const items = toolsListRef.current.querySelectorAll('.tool-item');
            if (items.length) {
                // @ts-ignore
                anime({
                    targets: items,
                    opacity: [0, 1],
                    translateX: [-10, 0],
                    delay: anime.stagger(30),
                    easing: 'easeOutQuad',
                    duration: 300
                });
            }
        }
    }, [isLoadingTools, availableTools]);

    // Animate chat messages on update
    useEffect(() => {
        if (messages.length > 0 && chatMessagesRef.current) {
            const bubbles = chatMessagesRef.current.querySelectorAll('.chat-message');
            if (bubbles.length) {
                // Animate only the last bubble for new messages
                const lastBubble = bubbles[bubbles.length - 1];
                anime({
                    targets: lastBubble,
                    opacity: [0, 1],
                    translateY: [15, 0],
                    easing: 'easeOutQuad',
                    duration: 250
                });
            }
        }
    }, [messages]);

    const handleNewChat = () => {
        clearCurrentChat();
        setOutput('');
        setInput('');
    };

    const handleChatSelect = (chatId: string) => {
        setCurrentChat(chatId);
    };

    const handleSubmit = async (resumeSessionId?: string) => {
        if (isGenerating && !resumeSessionId) {
            setIsGenerating(false);
            return;
        }
        if (!input.trim() && !resumeSessionId) return;

        setIsGenerating(true);
        if (!resumeSessionId) {
            setOutput("");
            addMessage({ role: 'user', content: input });
        }

        try {
            const response = await fetch('/api/agent/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    input: resumeSessionId ? '' : input,
                    config,
                    workflowId,
                    chatId: currentChatId,
                    isTemporary: isTemporaryChat,
                    autonomousMode,
                    sessionId: resumeSessionId || undefined
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate');
            }

            // Get headers for session status
            const responseChatId = response.headers.get('X-Chat-Id');
            const sessionStatus = response.headers.get('X-Session-Status');
            const responseSessionId = response.headers.get('X-Session-Id');
            const approvalRequired = response.headers.get('X-Approval-Required') === 'true';
            const approvalMessageId = response.headers.get('X-Approval-Message-Id');

            if (responseSessionId) {
                setSessionId(responseSessionId);
            }

            if (responseChatId && !currentChatId) {
                // IMPORTANT: Update store immediately so subsequent requests use this ID
                setCurrentChat(responseChatId);
                // Also update the local reference safely
                if (!isTemporaryChat) {
                    // Update recent chats list optimistically or wait for revalidation
                }
            }

            // Stream the response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('No response stream');
            }

            let fullResponse = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                fullResponse += text;

                if (isStreamEnabled) {
                    setOutput(prev => prev + text);
                }
            }

            if (!isStreamEnabled) {
                setOutput(fullResponse);
            }

            if (approvalRequired || sessionStatus === 'waiting_approval') {
                setActiveSessionId(responseSessionId || resumeSessionId || null);
                if (responseChatId) {
                    await loadChat(responseChatId);
                } else if (currentChatId) {
                    await loadChat(currentChatId);
                }
                setOutput(prev => `${prev}${prev ? '\n' : ''}[Awaiting approval]`);
                if (approvalMessageId) {
                    console.log(`[Playground] Waiting approval on message ${approvalMessageId}`);
                }
                setIsGenerating(false);
                return;
            }

            // Check if we need to auto-continue
            if (sessionStatus === 'paused' && responseSessionId && autonomousMode) {
                setActiveSessionId(responseSessionId);
                setOutput(prev => prev + '\n[Auto-continuing...]\n');
                // Auto-trigger next batch after a small delay
                setTimeout(() => handleSubmit(responseSessionId), 500);
                return; // Don't clear state yet
            }

            // Session complete or not autonomous
            setActiveSessionId(null);
            addMessage({ role: 'assistant', content: fullResponse });
            if (!resumeSessionId) setInput('');

            setIsGenerating(false);
        } catch (error) {
            console.error("Generation failed:", error);
            setOutput(`[Error: ${error instanceof Error ? error.message : 'Failed to generate response'}]`);
            setIsGenerating(false);
            setActiveSessionId(null);
        }
    };

    const handleCopyChat = () => {
        if (messages.length === 0 && !output) return;

        const formattedChat = messages.map(m => {
            const role = m.role === 'user' ? 'User' : 'Agent';
            return `${role}:\n${m.content}`;
        }).join('\n\n');

        // Append current streaming output if exists and not yet in messages
        const finalCopy = output && isGenerating
            ? `${formattedChat}\n\nAgent:\n${output}`
            : formattedChat;

        navigator.clipboard.writeText(finalCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadConversation = () => {
        const data = {
            id: currentChatId,
            config: config,
            messages: messages,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Conversation downloaded");
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
        <TooltipProvider delayDuration={300}>
            <div className="relative h-full w-full">
                {/* Main Container */}
                <div className="flex flex-col h-full w-full overflow-hidden bg-[#000000]">
                    {/* Header (Top Bar) */}
                    {/* Header (Top Bar) */}

                    <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4 bg-[color:var(--metric-surface-1)]">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-white/[0.04] text-white/60">
                                <PlayCircle className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-semibold text-sm leading-none tracking-tight text-white/90">LLM Generation</span>
                                <span className="text-[10px] text-white/30 font-mono mt-0.5">step_01_generate</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Preset Selector */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-[160px] h-8 text-xs bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-colors text-white/70 justify-between"
                                            >
                                                <span>{selectedPresetName || 'Load a preset...'}</span>
                                                <Settings2 className="h-3 w-3 ml-2 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="bg-[color:var(--metric-surface-2)] border-white/[0.08] w-[200px]">
                                            <DropdownMenuLabel className="text-[10px] text-white/40 font-mono">
                                                Saved Presets
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator className="bg-white/[0.08]" />
                                            {presets.length === 0 ? (
                                                <div className="p-2 text-[10px] text-white/30 italic">No saved presets</div>
                                            ) : (
                                                presets.map(p => (
                                                    <DropdownMenuItem
                                                        key={p.id}
                                                        className="text-xs group focus:bg-white/10 cursor-pointer"
                                                        onSelect={() => handleLoadPreset(p.id)}
                                                    >
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                {selectedPresetId === p.id && <Check className="h-3 w-3 text-white flex-shrink-0" />}
                                                                <span className={cn("truncate", selectedPresetId === p.id && "text-white")}>{p.name}</span>
                                                            </div>
                                                            <button
                                                                onClick={(e) => handleDeletePreset(p.id, e)}
                                                                className="opacity-0 group-hover:opacity-100 p-1 text-white/40 transition-all hover:bg-white/12 hover:text-white rounded z-50"
                                                                aria-label="Delete preset"
                                                                title={`Delete preset ${p.name}`}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-[#1A1A1A] border-white/10 text-xs text-white">
                                    Load a saved agent configuration
                                </TooltipContent>
                            </Tooltip>

                            {/* Save Button with feedback */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowSavePreset(true)}
                                        className={cn(
                                            "ml-1 h-8 px-2 text-xs gap-1.5 transition-all duration-200",
                                            saved ? "text-white hover:text-white hover:bg-white/10" : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                                        )}
                                    >
                                        {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                                        <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-[#1A1A1A] border-white/10 text-xs text-white">
                                    Save current configuration as a preset
                                </TooltipContent>
                            </Tooltip>

                            {/* Temporary Chat Toggle */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className={cn(
                                        "flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 border border-white/10 ml-1 transition-opacity",
                                        currentChatId && !isTemporaryChat && "opacity-50 cursor-not-allowed"
                                    )}>
                                        <Clock className={cn("w-3.5 h-3.5", isTemporaryChat ? "text-white/85" : "text-white/40")} />
                                        <span className={cn("text-xs hidden sm:inline", isTemporaryChat ? "text-white/85" : "text-white/50")}>
                                            Temp
                                        </span>
                                        <Switch
                                            checked={isTemporaryChat}
                                            onCheckedChange={setIsTemporaryChat}
                                            disabled={!!currentChatId && !isTemporaryChat}
                                            className="scale-75 -mr-1 data-[state=unchecked]:bg-white/10 data-[state=unchecked]:border-white/20 data-[state=checked]:bg-white/80 border border-transparent transition-all"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-[#1A1A1A] border-white/10 text-xs text-white">
                                    Temporary Chat: History is not saved to user database
                                </TooltipContent>
                            </Tooltip>

                            {/* Autonomous Mode Toggle */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "flex items-center gap-2 px-2.5 py-1.5 rounded-md border ml-1 transition-all",
                                            autonomousMode ? "bg-white/12 border-white/30" : "bg-white/5 border-white/10"
                                        )}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <Zap className={cn("w-3.5 h-3.5", autonomousMode ? "text-white/90" : "text-white/40")} />
                                            <span className={cn("text-xs hidden sm:inline", autonomousMode ? "text-white/90" : "text-white/50")}>
                                                Auto
                                            </span>
                                        </div>
                                        <Badge
                                            variant={autonomyBadgeVariant}
                                            className={cn(
                                                "text-[10px] uppercase tracking-wide",
                                                autonomousMode
                                                    ? "bg-white/20 text-white border-white/35"
                                                    : autonomyPolicy?.mode === 'CONFIRM'
                                                        ? "bg-white/10 text-white/70 border-white/20"
                                                        : "border-white/20 text-white/50"
                                            )}
                                        >
                                            {autonomyLabel}
                                        </Badge>
                                        <Switch
                                            checked={autonomousMode}
                                            onCheckedChange={handleAutonomousToggle}
                                            disabled={isAutonomyLoading}
                                            className="scale-75 -mr-1 data-[state=unchecked]:bg-white/10 data-[state=unchecked]:border-white/20 data-[state=checked]:bg-white/80 border border-transparent transition-all"
                                        />
                                        {activeSessionId && (
                                            <span className="ml-1 text-xs text-white/85 animate-pulse">●</span>
                                        )}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="bg-[#1A1A1A] border-white/10 text-xs text-white">
                                    Autonomous Mode persists to your policy and runs recursively (up to 50 rounds)
                                </TooltipContent>
                            </Tooltip>

                            <div className="h-4 w-px bg-white/[0.08] mx-2" />

                            <div className="flex items-center gap-1">
                                {/* Copy Button */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopyChat}
                                            disabled={messages.length === 0 && !output}
                                            className={cn(
                                                "h-7 px-2 text-xs gap-1.5 transition-all duration-200",
                                                copied ? "text-white hover:text-white hover:bg-white/10" : "text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                                            )}
                                        >
                                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                            {copied ? 'Copied' : 'Copy'}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-[#1A1A1A] border-white/10 text-xs text-white">
                                        Copy full chat history to clipboard
                                    </TooltipContent>
                                </Tooltip>
                                <div className="h-3 w-px bg-white/[0.08] mx-1" />

                                {/* MCP Modal */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div>
                                            <McpModal />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-[#1A1A1A] border-white/10 text-xs text-white">
                                        Manage Model Context Protocol (MCP) tools and connections
                                    </TooltipContent>
                                </Tooltip>

                                {/* Code Button */}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowCodeModal(true)}
                                            className="h-7 px-2 text-xs gap-1.5 text-white/50 hover:text-white/80 hover:bg-white/[0.06]"
                                        >
                                            <Code2 className="h-3.5 w-3.5" />
                                            Code
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="bg-[#1A1A1A] border-white/10 text-xs text-white">
                                        View conversation logs as JSON/Code
                                    </TooltipContent>
                                </Tooltip>

                                {/* More Menu */}
                                <DropdownMenu>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/50 hover:text-white/80 hover:bg-white/[0.06]">
                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="bg-[#1A1A1A] border-white/10 text-xs text-white">
                                            More options
                                        </TooltipContent>
                                    </Tooltip>
                                    <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10 text-white">
                                        <DropdownMenuItem onClick={handleNewChat} className="text-xs hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                            <Trash2 className="mr-2 h-3.5 w-3.5 text-white/50" />
                                            <span>Clear Chat</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDownloadConversation} className="text-xs hover:bg-white/10 focus:bg-white/10 cursor-pointer">
                                            <Download className="mr-2 h-3.5 w-3.5 text-white/50" />
                                            <span>Download JSON</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>


                    <div className="flex-1 flex overflow-hidden">
                        <div className="flex-1 flex flex-col relative bg-[color:var(--metric-surface-0)] p-6 overflow-hidden">

                            {/* Chat Messages Area */}
                            <div className="flex-1 min-h-0 flex flex-col pb-4 overflow-y-auto w-full custom-scrollbar">
                                {messages.length === 0 && !isGenerating ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-white/20 select-none">
                                        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4 shadow-inner">
                                            <PlayCircle className="h-8 w-8 opacity-50" />
                                        </div>
                                        <h3 className="text-sm font-medium text-white/50 mb-1">Ready to Chat</h3>
                                        <p className="text-xs text-white/30 font-mono text-center max-w-[200px]">
                                            Configure your model settings and start a conversation.
                                        </p>
                                    </div>
                                ) : (
                                    <div ref={chatMessagesRef} className="flex flex-col gap-4 px-6 py-4">
                                        {messages.map((msg, idx) => (
                                            <React.Fragment key={idx}>
                                                <div
                                                    className={cn(
                                                        "chat-message flex gap-3 max-w-[85%]",
                                                        msg.role === 'user' ? "self-end flex-row-reverse" : "self-start"
                                                    )}
                                                >
                                                    {/* Message Bubble */}
                                                    <div className={cn(
                                                        "px-4 py-3 rounded-2xl text-sm leading-relaxed select-text",
                                                        msg.role === 'user'
                                                            ? "bg-white/5 text-white/90 border border-white/10 rounded-br-md"
                                                            : "bg-white/[0.08] text-white/90 rounded-bl-md border border-white/[0.06]"
                                                    )}>
                                                        <div
                                                        className={cn(
                                                            "whitespace-pre-wrap text-[13px]",
                                                            msg.role === 'assistant' ? "font-drafting" : "font-mono"
                                                        )}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                    </div>
                                                </div>

                                                {/* Insert Approval Card if this message has pending tool calls */}
                                                {msg.role === 'assistant' && msg.id && msg.toolCalls && (
                                                    <div className="flex gap-3 self-start max-w-[85%] pl-3">
                                                        {/* Check if approval is needed (e.g. status='pending' or just present) */}
                                                        {msg.approval_status && (
                                                            <ApprovalCard
                                                                messageId={msg.id!}
                                                                toolCalls={msg.toolCalls}
                                                                status={msg.approval_status}
                                                                onAction={(decision, resumeSessionId) => {
                                                                    setMessages(messages.map((m) =>
                                                                        m.id === msg.id ? { ...m, approval_status: decision } : m
                                                                    ));
                                                                    // Trigger re-run if approved
                                                                    if (decision === 'approved') {
                                                                        const resumeId = resumeSessionId || activeSessionId || sessionId;
                                                                        if (resumeId) {
                                                                            setSessionId(resumeId);
                                                                            setActiveSessionId(resumeId);
                                                                        }
                                                                        if (resumeId) {
                                                                            handleSubmit(resumeId);
                                                                        } else {
                                                                            toast.info('Approval saved. Send a follow-up message to continue.');
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                        {/* Streaming indicator */}
                                        {isGenerating && output && (
                                            <div className="flex gap-3 self-start max-w-[85%]">
                                                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/[0.08] text-white/90 border border-white/[0.06] select-text">
                                                    <div className="whitespace-pre-wrap text-[13px] font-drafting">
                                                        {output}
                                                        <span className="inline-block w-1.5 h-3 ml-1 bg-white/60 animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Floating Input Card */}
                            <div className="flex-none w-full max-w-5xl mx-auto flex flex-col mb-2">
                                <div className="relative rounded-xl border border-white/[0.08] bg-[color:var(--metric-surface-2)] shadow-2xl transition-all duration-300 focus-within:border-white/[0.15] flex flex-col overflow-hidden">
                                    <Textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Write a tagline for an ice cream shop..."
                                        className="flex-1 w-full h-[140px] resize-none border-0 p-6 text-base focus-visible:ring-0 bg-transparent placeholder:text-white/20 leading-relaxed font-mono custom-scrollbar text-white/90"
                                    />

                                    {/* Action Bar (Bottom) */}
                                    <div className="flex-none p-3 flex items-center justify-between border-t border-white/[0.06] bg-[color:var(--metric-surface-1)]">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSubmit()}
                                                disabled={!input.trim() && !isGenerating}
                                                className="h-7 px-3 text-[10px] uppercase font-semibold tracking-wider text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors disabled:opacity-30"
                                                title={isGenerating ? 'Stop active generation' : 'Submit prompt to the configured model'}
                                            >
                                                {isGenerating ? 'Stop' : 'Submit'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-white/40 hover:text-white/70 hover:bg-white/[0.06] rounded-full"
                                                title="Open chat history manager"
                                            >
                                                <History className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono">
                                            <span className={input.length > (config.maxTokens || 2000) * 4 ? "text-white/90" : ""}>
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
                        <div className="w-[320px] border-l border-white/[0.06] bg-[color:var(--metric-surface-2)] flex flex-col">
                            <div className="h-10 flex items-center px-4 border-b border-white/[0.06] bg-[color:var(--metric-surface-1)]">
                                <Settings2 className="h-3.5 w-3.5 mr-2 text-white/40" />
                                <span className="text-[11px] font-semibold text-white/60 uppercase tracking-widest">Configuration</span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-8 custom-scrollbar">

                                {/* Model Selection */}
                                <div className="space-y-4">
                                    <div className="text-xs font-medium flex items-center justify-between text-white/70">
                                        <span>Model</span>
                                        <span className="text-[10px] bg-white/[0.06] text-white/60 border border-white/[0.12] px-1.5 py-0.5 rounded font-mono">v3.0</span>
                                    </div>
                                    <Select value={config.model} onValueChange={(val) => updateConfig({ model: val })}>
                                        <SelectTrigger className="bg-white/[0.03] border-white/[0.08] h-9 text-xs text-white/80">
                                            <SelectValue placeholder="Select model" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[color:var(--metric-surface-2)] border-white/[0.08]">
                                            <SelectItem value="gemini-3-flash-preview">Gemini 3 Flash (Preview)</SelectItem>
                                            <SelectItem value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Cost & Usage Stats */}
                                    {messages.length > 0 && (
                                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-2">
                                            <div className="flex items-center justify-between text-[11px] text-white/60">
                                                <span>Tokens</span>
                                                <span className="font-mono text-white/80">
                                                    {messages.reduce((acc, m) => acc + (m.usageMetadata?.totalTokenCount || 0), 0).toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-white/60">
                                                <span>Est. Cost</span>
                                                <span className="font-mono text-white/85">
                                                    ${(messages.reduce((acc, m) => {
                                                        const input = m.usageMetadata?.promptTokenCount || 0;
                                                        const output = m.usageMetadata?.candidatesTokenCount || 0;
                                                        // Simple calc for display (Pro pricing approx)
                                                        // $1.25/1M input, $5.00/1M output
                                                        return acc + (input / 1e6 * 1.25) + (output / 1e6 * 5.00);
                                                    }, 0)).toFixed(4)}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Separator className="bg-border/60" />

                                {/* System Instructions */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-medium text-white/70">System Instructions</Label>
                                    <Textarea
                                        value={config.systemPrompt}
                                        onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
                                        className="h-24 resize-none text-[11px] leading-relaxed bg-white/[0.03] border-white/[0.08] focus-visible:ring-1 focus-visible:ring-white/[0.12] min-h-[100px] text-white/80"
                                        placeholder="You are a helpful assistant..."
                                    />
                                </div>

                                <Separator className="bg-border/60" />

                                {/* Chat Actions - History & New */}
                                <div className="space-y-2 mb-6">
                                    <button
                                        onClick={() => setShowChatModal(true)}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-xs transition-colors border border-white/10"
                                        title="Browse, resume, or delete previous chats for this workflow"
                                    >
                                        <History className="w-4 h-4" />
                                        <span>Chat History</span>
                                        {currentChatId && !isTemporaryChat && (
                                            <span className="ml-auto text-[10px] text-white/70">saved</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={handleNewChat}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80 text-xs transition-colors border border-white/10"
                                        title="Start a fresh chat context while keeping current settings"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>New Chat</span>
                                    </button>
                                </div>

                                <Separator className="bg-border/60" />

                                {/* Active Tools (Dynamic) */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-medium text-white/70">Agent Capabilities</Label>
                                        {isLoadingTools && <span className="text-[10px] text-white/30 animate-pulse">Loading...</span>}
                                    </div>

                                    <div className="space-y-4" ref={toolsListRef}>
                                        {availableTools.length === 0 && !isLoadingTools && (
                                            <p className="text-[10px] text-white/30 italic px-1">No tools available.</p>
                                        )}

                                        {/* System Tools Group */}
                                        {availableTools.some(t => t.type === 'system') && (
                                            <div className="space-y-1.5">
                                                <div className="text-[10px] uppercase tracking-wider text-white/30 font-semibold px-1">System</div>
                                                {availableTools.filter(t => t.type === 'system').map(tool => (
                                                    <ToolItem
                                                        key={tool.id}
                                                        tool={tool}
                                                        active={config.tools?.includes(tool.id) || false}
                                                        onToggle={() => {
                                                            const current = config.tools || [];
                                                            const next = current.includes(tool.id)
                                                                ? current.filter(t => t !== tool.id)
                                                                : [...current, tool.id];
                                                            updateConfig({ tools: next });
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* MCP Tools Group */}
                                        {availableTools.some(t => t.type === 'mcp') && (
                                            <div className="space-y-1.5">
                                                <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold px-1">MCP Extensions</div>
                                                {availableTools.filter(t => t.type === 'mcp').map(tool => (
                                                    <ToolItem
                                                        key={tool.id}
                                                        tool={tool}
                                                        active={config.tools?.includes(tool.id) || false}
                                                        onToggle={() => {
                                                            const current = config.tools || [];
                                                            const next = current.includes(tool.id)
                                                                ? current.filter(t => t !== tool.id)
                                                                : [...current, tool.id];
                                                            updateConfig({ tools: next });
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Separator className="bg-border/60" />

                                {/* Toggles & Sliders */}
                                <div className="space-y-6">
                                    {/* Stream Response */}
                                    <div className="flex items-center justify-between space-x-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Label htmlFor="stream-mode" className="text-xs font-medium text-white/70 cursor-help border-b border-dotted border-white/20">Stream Response</Label>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="bg-[#1A1A1A] border-white/10 text-xs text-white max-w-[200px]">
                                                If enabled, the agent's response will be displayed character-by-character as it is generated.
                                            </TooltipContent>
                                        </Tooltip>
                                        <Switch
                                            id="stream-mode"
                                            checked={isStreamEnabled}
                                            onCheckedChange={setIsStreamEnabled}
                                            className="scale-75 data-[state=checked]:bg-white/80 data-[state=unchecked]:bg-white/10"
                                        />
                                    </div>

                                    {/* JSON Mode */}
                                    <div className="flex items-center justify-between space-x-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Label htmlFor="json-mode" className="text-xs font-medium text-white/70 cursor-help border-b border-dotted border-white/20">JSON Mode</Label>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="bg-[#1A1A1A] border-white/10 text-xs text-white max-w-[200px]">
                                                Forces the model to output valid JSON. Useful for structured data tasks.
                                            </TooltipContent>
                                        </Tooltip>
                                        <Switch
                                            id="json-mode"
                                            checked={config.outputMode === 'json'}
                                            onCheckedChange={(checked) => updateConfig({ outputMode: checked ? 'json' : 'text' })}
                                            className="scale-75 data-[state=checked]:bg-white/80 data-[state=unchecked]:bg-white/10"
                                        />
                                    </div>

                                    {/* Temperature Slider */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-xs font-medium text-white/70 cursor-help border-b border-dotted border-white/20">Temperature</div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="bg-[#1A1A1A] border-white/10 text-xs text-white max-w-[200px]">
                                                    Controls randomness. Higher values (e.g., 0.8) make output more random, lower values (e.g., 0.2) more focused and deterministic.
                                                </TooltipContent>
                                            </Tooltip>
                                            <span className="text-[10px] font-mono text-white/50 w-10 text-right bg-white/[0.06] rounded px-1">{config.temperature.toFixed(2)}</span>
                                        </div>
                                        <Slider
                                            value={[config.temperature]}
                                            onValueChange={handleTempChange}
                                            max={1}
                                            step={0.01}
                                            className="py-1 [&>.relative>.bg-primary]:bg-white/80 [&>.relative>.bg-secondary]:bg-white/20"
                                        />
                                    </div>

                                    {/* Max Length Slider */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-xs font-medium text-white/70 cursor-help border-b border-dotted border-white/20">Max Tokens</div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="bg-[#1A1A1A] border-white/10 text-xs text-white max-w-[200px]">
                                                    The maximum number of tokens to generate. One token is roughly 4 characters.
                                                </TooltipContent>
                                            </Tooltip>
                                            <span className="text-[10px] font-mono text-white/50 w-10 text-right bg-white/[0.06] rounded px-1">{config.maxTokens || 2000}</span>
                                        </div>
                                        <Slider
                                            value={[config.maxTokens || 2000]}
                                            onValueChange={handleMaxTokensChange}
                                            max={4000}
                                            step={1}
                                            className="py-1 [&>.relative>.bg-primary]:bg-white/80 [&>.relative>.bg-secondary]:bg-white/20"
                                        />
                                    </div>

                                    {/* Top P Slider */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="text-xs font-medium text-white/70 cursor-help border-b border-dotted border-white/20">Top P</div>
                                                </TooltipTrigger>
                                                <TooltipContent side="left" className="bg-[#1A1A1A] border-white/10 text-xs text-white max-w-[200px]">
                                                    Controls diversity via nucleus sampling. 0.9 means consider the top 90% probability mass.
                                                </TooltipContent>
                                            </Tooltip>
                                            <span className="text-[10px] font-mono text-white/50 w-10 text-right bg-white/[0.06] rounded px-1">{(config.topP || 0.9).toFixed(2)}</span>
                                        </div>
                                        <Slider
                                            value={[config.topP || 0.9]}
                                            onValueChange={handleTopPChange}
                                            max={1}
                                            step={0.01}
                                            className="py-1 [&>.relative>.bg-primary]:bg-white/80 [&>.relative>.bg-secondary]:bg-white/20"
                                        />
                                    </div>
                                </div>

                                <Separator className="bg-border/60" />

                                {/* Advanced Section */}
                                <div className="space-y-4">
                                    <div className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1 flex items-center gap-2">
                                        Advanced Settings
                                    </div>
                                    <div className="space-y-5 pl-1">
                                        {/* Frequency Penalty */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="text-xs font-medium text-white/70 cursor-help border-b border-dotted border-white/20">Frequency Penalty</div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="bg-[#1A1A1A] border-white/10 text-xs text-white max-w-[200px]">
                                                        Penalizes new tokens based on their existing frequency in the text so far. Reduces repetition.
                                                    </TooltipContent>
                                                </Tooltip>
                                                <span className="text-[10px] font-mono text-white/50 w-10 text-right bg-white/[0.06] rounded px-1">{(config.frequencyPenalty || 0).toFixed(2)}</span>
                                            </div>
                                            <Slider
                                                value={[config.frequencyPenalty || 0]}
                                                onValueChange={handleFreqPenaltyChange}
                                                max={2}
                                                step={0.01}
                                                className="py-1 [&>.relative>.bg-primary]:bg-white/80 [&>.relative>.bg-secondary]:bg-white/20"
                                            />
                                        </div>

                                        {/* Presence Penalty */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="text-xs font-medium text-white/70 cursor-help border-b border-dotted border-white/20">Presence Penalty</div>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="bg-[#1A1A1A] border-white/10 text-xs text-white max-w-[200px]">
                                                        Penalizes new tokens based on whether they appear in the text so far. Encourages talking about new topics.
                                                    </TooltipContent>
                                                </Tooltip>
                                                <span className="text-[10px] font-mono text-white/50 w-10 text-right bg-white/[0.06] rounded px-1">{(config.presencePenalty || 0).toFixed(2)}</span>
                                            </div>
                                            <Slider
                                                value={[config.presencePenalty || 0]}
                                                onValueChange={handlePresPenaltyChange}
                                                max={2}
                                                step={0.01}
                                                className="py-1 [&>.relative>.bg-primary]:bg-white/80 [&>.relative>.bg-secondary]:bg-white/20"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >


                {/* Save Preset Dialog */}
                < Dialog open={showSavePreset} onOpenChange={setShowSavePreset} >
                    <DialogContent className="sm:max-w-[425px] bg-[color:var(--metric-surface-2)] border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle className="text-sm font-semibold">Save Agent Preset</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name" className="text-white/70 text-xs">Preset Name</Label>
                                <Input
                                    id="name"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    className="col-span-3 bg-white/5 border-white/10 text-white text-xs h-8"
                                    placeholder="e.g., Coding Assistant (Strict)"
                                    autoFocus
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" size="sm" onClick={() => setShowSavePreset(false)} className="text-xs h-8">
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSavePreset}
                                disabled={!newPresetName.trim() || isSavingPreset}
                                className="bg-white/90 text-black hover:bg-white text-xs h-8"
                            >
                                {isSavingPreset ? 'Saving...' : 'Save Preset'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog >

                {/* Chat List Modal */}
                < ChatListModal
                    isOpen={showChatModal}
                    onClose={() => setShowChatModal(false)
                    }
                    workflowId={workflowId}
                    onChatSelect={handleChatSelect}
                    onNewChat={handleNewChat}
                />
            </div >
        </TooltipProvider>
    )
}

function ToolItem({ tool, active, onToggle }: { tool: AgentToolDef, active: boolean, onToggle: () => void }) {
    const isMcp = tool.type === 'mcp';

    return (
        <div
            className="tool-item opacity-0" // Start hidden for animation
            onClick={onToggle}
            title={active ? `Disable ${tool.label}` : `Enable ${tool.label}`}
        >
            <div className={cn(
                "flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer transition-all group relative select-none",
                active
                    ? "bg-white/[0.08] border-white/[0.2] text-white"
                    : "bg-transparent border-white/[0.06] text-white/50 hover:bg-white/[0.03]"
            )}>
                <div className="flex flex-col min-w-0 flex-1 mr-2">
                    <div className="flex items-center gap-1.5">
                        <span className={cn("font-medium truncate", isMcp && "text-white/80")}>
                            {tool.label}
                        </span>
                        {isMcp && tool.serverName && (
                            <span className="text-[9px] px-1 rounded bg-white/10 text-white/40 uppercase tracking-wider">
                                {tool.serverName}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] opacity-70 truncate" title={tool.description}>
                        {tool.description}
                    </span>
                </div>
                <div className={cn(
                    "h-3.5 w-3.5 rounded border flex items-center justify-center transition-colors flex-none",
                    active ? "bg-white/90 text-black border-white" : "border-white/20 group-hover:border-white/40"
                )}>
                    {active && <Check className="h-2.5 w-2.5" />}
                </div>
            </div>
        </div>
    );
}

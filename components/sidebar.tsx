'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { DragEvent } from 'react';
import { MessageSquare, Mail, Database, Globe, Clock, Code, PauseCircle, Split, Repeat, Lock, GitMerge, Workflow, Info, ChevronDown, UserCheck, Sparkles, Box } from 'lucide-react';
import { useEnterAnimation, animateHover, animateHoverExit } from '@/lib/animation-utils';
import { animate, stagger, remove } from 'animejs';

export const Sidebar = () => {
    const [showSecrets, setShowSecrets] = useState(false);
    const [secrets, setSecrets] = useState<string[]>([]);
    const [secretsLoading, setSecretsLoading] = useState(true);
    const [secretsError, setSecretsError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Staggered animation for list items
    useEffect(() => {
        if (containerRef.current) {
            animate(containerRef.current.querySelectorAll('.sidebar-item'), {
                opacity: [0, 1],
                translateX: [-20, 0],
                delay: stagger(50),
                easing: 'easeOutExpo'
            });
        }
    }, []);

    // Fetch available secrets on mount
    useEffect(() => {
        const fetchSecrets = async () => {
            try {
                const response = await fetch('/api/secrets/list');
                const data = await response.json();

                if (data.success) {
                    setSecrets(data.keys);
                } else {
                    setSecretsError(data.error || 'Failed to load secrets');
                }
            } catch (error) {
                console.error('Error fetching secrets:', error);
                setSecretsError('Failed to connect to secrets API');
            } finally {
                setSecretsLoading(false);
            }
        };

        fetchSecrets();
    }, []);

    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/reactflow', nodeType);
            event.dataTransfer.setData('application/reactflow/label', label);
            event.dataTransfer.effectAllowed = 'move';
        }
    };

    const steps = [
        { type: 'step', label: 'Send Email', icon: Mail, description: 'Send an email via SMTP or API' },
        { type: 'step', label: 'HTTP Request', icon: Globe, description: 'Make a generic API call' },
        { type: 'step', label: 'Database Query', icon: Database, description: 'Execute a SQL query' },
        { type: 'step', label: 'Run Script', icon: Code, description: 'Execute custom JavaScript' },
        { type: 'step', label: 'Slack Message', icon: MessageSquare, description: 'Post to a Slack channel' },
        { type: 'step', label: 'Stream', icon: MessageSquare, description: 'Stream updates to the UI' },
    ];

    const controlFlow = [
        { type: 'webhook', label: 'Webhook', icon: Globe, description: 'Start on HTTP request' },
        { type: 'schedule', label: 'Schedule', icon: Clock, description: 'Trigger on a timer' },
        { type: 'step', label: 'Sleep', icon: Clock, description: 'Pause workflow for a duration' },
        { type: 'step', label: 'Wait', icon: PauseCircle, description: 'Pause until an event occurs' },
        { type: 'approval', label: 'Approval', icon: UserCheck, description: 'Wait for human review' },
        { type: 'if', label: 'If / Else', icon: Split, description: 'Branch based on condition' },
        { type: 'loop', label: 'Loop', icon: Repeat, description: 'Iterate over a list' },
        { type: 'parallel', label: 'Parallel', icon: GitMerge, description: 'Run branches concurrently' },
        { type: 'subWorkflow', label: 'Sub-Workflow', icon: Workflow, description: 'Run another workflow' },
        { type: 'ai', label: 'AI Gen', icon: Sparkles, description: 'Generate text with AI' },
        { type: 'transform', label: 'Transform', icon: Code, description: 'Map/Filter data' },
    ];

    return (
        <aside className="h-full w-72 border-r flex flex-col relative backdrop-blur-md z-20" style={{
            backgroundColor: 'rgba(20, 20, 25, 0.8)', // Semi-transparent dark
            borderColor: 'rgba(255, 255, 255, 0.1)'
        }} ref={containerRef}>
            {/* ... (Header remains) ... */}

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.1) transparent'
            }}>
                {/* ... (rest of Sidebar content) ... */}
            </div>
            {/* ... */}
        </aside>
    );
};

// Preview Component with Animations
const SidebarItemPreview = ({ label, description, type, icon: Icon }: { label: string, description: string, type: string, icon: any }) => {
    const previewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!previewRef.current) return;

        // Reset any existing animations
        remove(previewRef.current.querySelectorAll('.anim-target'));

        // Animation logic based on type
        if (type === 'step') {
            // Sequence animation
            animate(previewRef.current.querySelectorAll('.dot'), {
                translateX: [0, 40],
                opacity: [0, 1, 0],
                delay: stagger(200),
                duration: 1500,
                loop: true,
                easing: 'easeInOutQuad'
            });
        } else if (type === 'if') {
            // Split animation
            const dotMain = previewRef.current.querySelector('.dot-main');
            if (dotMain) {
                animate(dotMain, {
                    translateX: [0, 20],
                    opacity: [0, 1],
                    duration: 1000,
                    loop: true,
                    easing: 'linear'
                });
            }
            const dotUp = previewRef.current.querySelector('.dot-up');
            if (dotUp) {
                animate(dotUp, {
                    translateX: [20, 40],
                    translateY: [0, -15],
                    opacity: [0, 1, 0],
                    delay: 1000,
                    duration: 1000,
                    loop: true,
                    easing: 'easeOutQuad'
                });
            }
            const dotDown = previewRef.current.querySelector('.dot-down');
            if (dotDown) {
                animate(dotDown, {
                    translateX: [20, 40],
                    translateY: [0, 15],
                    opacity: [0, 1, 0],
                    delay: 1000,
                    duration: 1000,
                    loop: true,
                    easing: 'easeOutQuad'
                });
            }
        } else if (type === 'loop') {
            // Rotation animation
            const loopIcon = previewRef.current.querySelector('.loop-icon');
            if (loopIcon) {
                animate(loopIcon, {
                    rotate: 360,
                    duration: 2000,
                    loop: true,
                    easing: 'linear'
                });
            }
        } else if (type === 'ai') {
            // Sparkle animation
            animate(previewRef.current.querySelectorAll('.sparkle'), {
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
                delay: stagger(300),
                duration: 1500,
                loop: true,
                easing: 'easeInOutSine'
            });
        } else {
            // General Pulse
            const iconLarge = previewRef.current.querySelector('.icon-large');
            if (iconLarge) {
                animate(iconLarge, {
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 1, 0.5],
                    duration: 2000,
                    loop: true,
                    easing: 'easeInOutSine'
                });
            }
        }

    }, [type]);

    return (
        <div
            ref={previewRef}
            className="absolute left-[calc(100%+10px)] top-0 w-64 bg-[#0f172a]/95 backdrop-blur-xl border border-blue-500/30 rounded-xl p-4 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 pointer-events-none"
        >
            <div className="flex items-center gap-3 mb-3 border-b border-white/10 pb-3">
                <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
                    <Icon size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-white text-sm">{label}</h4>
                    <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider">Component</span>
                </div>
            </div>

            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                {description}
            </p>

            {/* Animation Canvas */}
            <div className="h-24 w-full rounded-lg bg-black/40 border border-white/5 relative overflow-hidden flex items-center justify-center">

                {type === 'step' && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded border border-white/20 bg-white/5 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-white/10" />
                        </div>
                        <div className="flex gap-1 relative w-12 h-2">
                            <div className="dot absolute w-2 h-2 rounded-full bg-blue-500 left-0 top-0" />
                            <div className="dot absolute w-2 h-2 rounded-full bg-blue-500 left-0 top-0" />
                            <div className="dot absolute w-2 h-2 rounded-full bg-blue-500 left-0 top-0" />
                        </div>
                        <div className="w-8 h-8 rounded border border-blue-500/30 bg-blue-500/10 flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-blue-500/50" />
                        </div>
                    </div>
                )}

                {type === 'if' && (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="dot-main absolute w-2 h-2 rounded-full bg-purple-500 left-[30%]" />
                        {/* Paths would ideally be SVGs, keeping it simple for now */}
                        <div className="dot-up absolute w-2 h-2 rounded-full bg-green-500 left-[50%]" />
                        <div className="dot-down absolute w-2 h-2 rounded-full bg-red-500 left-[50%]" />

                        <Split size={32} className="text-white/10 absolute" />
                    </div>
                )}

                {type === 'loop' && (
                    <div className="loop-icon text-blue-500/50">
                        <Repeat size={40} />
                    </div>
                )}

                {type === 'ai' && (
                    <div className="relative">
                        <Sparkles size={40} className="text-indigo-500/20" />
                        <div className="sparkle absolute top-0 -left-4 text-indigo-400"><Sparkles size={12} /></div>
                        <div className="sparkle absolute -bottom-2 right-6 text-purple-400"><Sparkles size={16} /></div>
                        <div className="sparkle absolute top-4 right-8 text-blue-400"><Sparkles size={10} /></div>
                    </div>
                )}

                {!['step', 'if', 'loop', 'ai'].includes(type) && (
                    <div className="icon-large text-white/10">
                        <Icon size={48} />
                    </div>
                )}

                <div className="absolute bottom-2 right-2 flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="w-1 h-1 rounded-full bg-white/40" />
                </div>
            </div>
        </div>
    );
};

// Sub-component for individual items to handle their own hover state
const SidebarItem = ({ item, onDragStart }: { item: any, onDragStart: any }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = () => {
        setIsHovered(true);
        if (ref.current) {
            animate(ref.current, {
                scale: 1.05,
                backgroundColor: 'rgba(59, 130, 246, 0.15)',
                borderColor: 'rgba(59, 130, 246, 0.4)',
                duration: 300,
                easing: 'easeOutQuad'
            });
            // Icon animation
            const iconWrapper = ref.current.querySelector('.icon-wrapper');
            if (iconWrapper) {
                animate(iconWrapper, {
                    rotate: '10deg',
                    scale: 1.1,
                    duration: 400
                });
            }
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (ref.current) {
            animate(ref.current, {
                scale: 1,
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderColor: 'rgba(255, 255, 255, 0.05)',
                duration: 300,
                easing: 'easeOutQuad'
            });
            const iconWrapper = ref.current.querySelector('.icon-wrapper');
            if (iconWrapper) {
                animate(iconWrapper, {
                    rotate: '0deg',
                    scale: 1,
                    duration: 400
                });
            }
        }
    };

    return (
        <div
            ref={ref}
            className="sidebar-item relative flex flex-col items-center justify-center p-3 rounded-xl border border-white/5 bg-white/[0.03] cursor-grab active:cursor-grabbing transition-colors"
            draggable
            onDragStart={(e) => onDragStart(e, item.type, item.label)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="icon-wrapper mb-2 p-2 rounded-full bg-black/20 text-white/70 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors">
                <item.icon size={18} />
            </div>
            <span className="text-[11px] font-medium text-white/80 text-center leading-tight">
                {item.label}
            </span>

            {/* Fancy Animated Preview */}
            {isHovered && (
                <SidebarItemPreview
                    label={item.label}
                    description={item.description}
                    type={item.type}
                    icon={item.icon}
                />
            )}
        </div>
    );
};


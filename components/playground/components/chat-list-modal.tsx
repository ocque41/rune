'use client';

import React, { useEffect, useState } from 'react';
import { useAgentStore, Chat } from '../store';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ChatListModalProps {
    isOpen: boolean;
    onClose: () => void;
    workflowId?: string | null;
    onChatSelect: (chatId: string) => void;
    onNewChat: () => void;
}

export function ChatListModal({
    isOpen,
    onClose,
    workflowId,
    onChatSelect,
    onNewChat
}: ChatListModalProps) {
    const { chats, setChats, setIsLoadingChats, isLoadingChats } = useAgentStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [editingChatId, setEditingChatId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchChats();
        }
    }, [isOpen, workflowId]);

    const fetchChats = async () => {
        setIsLoadingChats(true);
        try {
            const params = new URLSearchParams();
            if (workflowId) params.set('workflow_id', workflowId);
            params.set('include_temporary', 'false');

            const res = await fetch(`/api/rune/chats?${params}`);
            if (res.ok) {
                const data = await res.json();
                setChats(data.chats || []);
            }
        } catch (e) {
            console.error('Failed to fetch chats:', e);
        } finally {
            setIsLoadingChats(false);
        }
    };

    const handleDelete = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this chat?')) return;

        try {
            const res = await fetch(`/api/rune/chats/${chatId}`, { method: 'DELETE' });
            if (res.ok) {
                setChats(chats.filter(c => c.id !== chatId));
            }
        } catch (e) {
            console.error('Failed to delete chat:', e);
        }
    };

    const startEditing = (chatId: string, currentTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingChatId(chatId);
        setEditTitle(currentTitle);
    };

    const saveRename = async (chatId: string, e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!editTitle.trim()) return;

        // Optimistic update
        const oldChats = [...chats];
        setChats(chats.map(c => c.id === chatId ? { ...c, title: editTitle } : c));
        setEditingChatId(null);

        try {
            const res = await fetch(`/api/rune/chats/${chatId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editTitle })
            });

            if (!res.ok) throw new Error("Failed to update");
        } catch (e) {
            console.error('Failed to rename chat:', e);
            setChats(oldChats); // Rollback
        }
    };

    if (!isOpen) return null;

    const filteredChats = searchQuery
        ? chats.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
        : chats;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-[#0a0a0b] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Chat History</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-white/10 transition-colors"
                    >
                        <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search & New Chat */}
                <div className="p-4 border-b border-white/10 flex gap-2">
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-blue-500/50"
                    />
                    <button
                        onClick={() => { onNewChat(); onClose(); }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        New Chat
                    </button>
                </div>

                {/* Chat List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {isLoadingChats ? (
                        <div className="flex items-center justify-center py-12 text-white/50">
                            <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Loading...
                        </div>
                    ) : filteredChats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-white/50">
                            <svg className="w-12 h-12 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p>No chats yet</p>
                            <p className="text-sm">Start a conversation with the Agent</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredChats.map((chat) => (
                                <div
                                    key={chat.id}
                                    onClick={() => { if (editingChatId !== chat.id) { onChatSelect(chat.id); onClose(); } }}
                                    className="group flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer transition-colors"
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        {editingChatId === chat.id ? (
                                            <form onSubmit={(e) => saveRename(chat.id, e)} onClick={e => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                    onBlur={() => saveRename(chat.id)}
                                                    className="w-full bg-black/50 border border-blue-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                                />
                                            </form>
                                        ) : (
                                            <>
                                                <h3 className="text-sm font-medium text-white truncate" onDoubleClick={(e) => startEditing(chat.id, chat.title, e)}>
                                                    {chat.title}
                                                </h3>
                                                <p className="text-xs text-white/40 mt-1">
                                                    {chat.messageCount || 0} messages · {safeDateDistance(chat.updatedAt)}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => startEditing(chat.id, chat.title, e)}
                                            className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white"
                                            title="Rename"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(chat.id, e)}
                                            className="p-1.5 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                                            title="Delete"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function safeDateDistance(dateStr: string | undefined | null) {
    if (!dateStr) return 'Unknown time';
    try {
        const date = new Date(dateStr);
        // Check for invalid date
        if (isNaN(date.getTime())) return 'Unknown time';
        return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
        return 'Unknown time';
    }
}

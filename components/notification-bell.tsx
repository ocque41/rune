'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
    id: string;
    title?: string;
    message: string;
    type: 'agent' | 'system' | 'workflow' | 'run';
    link?: string;
    is_read: boolean;
    created_at: string;
}

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications on mount and periodically
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (e) {
            console.error('Failed to fetch notifications:', e);
        }
    };

    const markAsRead = async (notificationId?: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(notificationId ? { notificationId } : { markAllRead: true })
            });

            if (notificationId) {
                setNotifications(prev => prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } else {
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                setUnreadCount(0);
            }
        } catch (e) {
            console.error('Failed to mark as read:', e);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        if (notification.link) {
            window.location.href = notification.link;
        }
    };

    const typeIcons: Record<string, string> = {
        agent: '🤖',
        system: '⚙️',
        workflow: '⚡',
        run: '▶️'
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-lg transition-colors",
                    isOpen ? "bg-white/10" : "hover:bg-white/5"
                )}
                title={isOpen ? "Close notifications panel" : "Open notifications panel"}
            >
                <Bell className="w-5 h-5 text-white/70" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-black bg-white rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 max-h-[400px] overflow-hidden bg-[#0a0a0b] border border-white/10 rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                        <h3 className="text-sm font-semibold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAsRead()}
                                className="text-xs text-white/70 hover:text-white transition-colors"
                                title="Mark all notifications as read"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[340px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-white/40">
                                <Bell className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">No notifications</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={cn(
                                            "flex items-start gap-3 p-4 cursor-pointer transition-colors",
                                            notification.is_read ? "bg-transparent" : "bg-white/6",
                                            "hover:bg-white/5"
                                        )}
                                        title={notification.link ? "Open related context" : "Mark notification as read"}
                                    >
                                        {/* Icon */}
                                        <span className="text-lg">
                                            {typeIcons[notification.type] || '💬'}
                                        </span>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            {notification.title && (
                                                <h4 className="text-sm font-medium text-white truncate">
                                                    {notification.title}
                                                </h4>
                                            )}
                                            <p className={cn(
                                                "text-xs mt-0.5 line-clamp-2",
                                                notification.is_read ? "text-white/50" : "text-white/70"
                                            )}>
                                                {notification.message}
                                            </p>
                                            <p className="text-[10px] text-white/30 mt-1">
                                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                            </p>
                                        </div>

                                        {/* Unread indicator */}
                                        {!notification.is_read && (
                                            <span className="w-2 h-2 rounded-full bg-white/75 flex-shrink-0 mt-1.5" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

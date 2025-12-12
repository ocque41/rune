'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react';

interface TreeNode {
    name: string;
    href?: string;
    children?: TreeNode[];
}

const docsTree: TreeNode[] = [
    { name: 'Quick Start', href: '/docs/quickstart' },
    { name: 'Nodes', href: '/docs/nodes' },
    { name: 'Troubleshooting', href: '/docs/troubleshooting' },
    {
        name: 'Guides',
        children: [
            { name: 'HTTP Request', href: '/docs/guides/http-request' },
            { name: 'Send Email', href: '/docs/guides/send-email' },
        ],
    },
    {
        name: 'Templates',
        children: [
            { name: 'Email Notifications', href: '/docs/templates/email-notifications' },
            { name: 'API Integration', href: '/docs/templates/api-integration' },
            { name: 'Slack Alerts', href: '/docs/templates/slack-alerts' },
        ],
    },
];

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = node.children && node.children.length > 0;
    const isActive = node.href === pathname;

    const paddingLeft = depth * 16 + 8;

    if (hasChildren) {
        return (
            <div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors hover:bg-[var(--accent-bg)]"
                    style={{ paddingLeft }}
                >
                    <ChevronRight
                        className="w-3.5 h-3.5 transition-transform"
                        style={{
                            color: 'var(--foreground-subtitle)',
                            transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        }}
                    />
                    {isOpen ? (
                        <FolderOpen className="w-4 h-4" style={{ color: 'var(--foreground-subtitle)' }} />
                    ) : (
                        <Folder className="w-4 h-4" style={{ color: 'var(--foreground-subtitle)' }} />
                    )}
                    <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--foreground-body)', letterSpacing: '-0.02em' }}
                    >
                        {node.name}
                    </span>
                </button>
                {isOpen && (
                    <div className="relative">
                        {/* Tree connector line */}
                        <div
                            className="absolute left-0 top-0 bottom-2 w-px"
                            style={{
                                left: paddingLeft + 14,
                                backgroundColor: 'var(--border-color)',
                            }}
                        />
                        {node.children!.map((child, idx) => (
                            <div key={child.name} className="relative">
                                {/* Horizontal connector */}
                                <div
                                    className="absolute h-px w-3"
                                    style={{
                                        left: paddingLeft + 14,
                                        top: '50%',
                                        backgroundColor: 'var(--border-color)',
                                    }}
                                />
                                <TreeItem node={child} depth={depth + 1} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Link
            href={node.href!}
            className="flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors"
            style={{
                paddingLeft: paddingLeft + 18,
                backgroundColor: isActive ? 'var(--accent-bg)' : 'transparent',
            }}
        >
            <FileText
                className="w-4 h-4"
                style={{ color: isActive ? 'var(--foreground-body)' : 'var(--foreground-subtitle)' }}
            />
            <span
                className="text-sm"
                style={{
                    color: isActive ? 'var(--foreground-body)' : 'var(--foreground-subtitle)',
                    letterSpacing: '-0.02em',
                    fontWeight: isActive ? 500 : 400,
                }}
            >
                {node.name}
            </span>
        </Link>
    );
}

export default function DocsSidebar() {
    return (
        <aside
            className="w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-6 pr-4"
            style={{ borderRight: '1px solid var(--border-color)' }}
        >
            <div className="mb-4 px-2">
                <Link
                    href="/docs"
                    className="text-lg font-bold"
                    style={{ color: 'var(--foreground-title)', letterSpacing: '-0.03em' }}
                >
                    Documentation
                </Link>
            </div>
            <nav>
                {docsTree.map((node) => (
                    <TreeItem key={node.name} node={node} />
                ))}
            </nav>
        </aside>
    );
}

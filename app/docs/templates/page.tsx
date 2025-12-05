'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Mail, Webhook, Database, MessageSquare, Clock, Zap } from 'lucide-react';

const templates = [
    {
        id: 'email-notifications',
        title: 'Email Notifications',
        description: 'Send automated email alerts when specific events occur',
        icon: Mail,
        difficulty: 'Beginner',
        nodes: 3,
        category: 'Communication',
        href: '/docs/templates/email-notifications'
    },
    {
        id: 'api-integration',
        title: 'API Integration',
        description: 'Fetch data from external APIs and process the results',
        icon: Webhook,
        difficulty: 'Intermediate',
        nodes: 4,
        category: 'Integration',
        href: '/docs/templates/api-integration'
    },
    {
        id: 'database-sync',
        title: 'Database Sync',
        description: 'Keep multiple databases synchronized automatically',
        icon: Database,
        difficulty: 'Advanced',
        nodes: 6,
        category: 'Data',
        href: '/docs/templates/database-sync'
    },
    {
        id: 'slack-alerts',
        title: 'Slack Alerts',
        description: 'Send notifications to Slack channels based on conditions',
        icon: MessageSquare,
        difficulty: 'Beginner',
        nodes: 3,
        category: 'Communication',
        href: '/docs/templates/slack-alerts'
    },
    {
        id: 'scheduled-reports',
        title: 'Scheduled Reports',
        description: 'Generate and send reports on a regular schedule',
        icon: Clock,
        difficulty: 'Intermediate',
        nodes: 5,
        category: 'Reporting',
        href: '/docs/templates/scheduled-reports'
    },
    {
        id: 'data-pipeline',
        title: 'Data Pipeline',
        description: 'Extract, transform, and load data between systems',
        icon: Zap,
        difficulty: 'Advanced',
        nodes: 7,
        category: 'Data',
        href: '/docs/templates/data-pipeline'
    }
];

const categories = ['All', 'Communication', 'Integration', 'Data', 'Reporting'];
const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

export default function TemplatesPage() {
    const [selectedCategory, setSelectedCategory] = React.useState('All');
    const [selectedDifficulty, setSelectedDifficulty] = React.useState('All');

    const filteredTemplates = templates.filter(template => {
        const categoryMatch = selectedCategory === 'All' || template.category === selectedCategory;
        const difficultyMatch = selectedDifficulty === 'All' || template.difficulty === selectedDifficulty;
        return categoryMatch && difficultyMatch;
    });

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
            {/* Header */}
            <header className="border-b sticky top-0 z-10" style={{
                backgroundColor: 'var(--header-background)',
                borderColor: 'var(--border-color)'
            }}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/docs" className="flex items-center gap-2 transition-colors hover:opacity-100" style={{
                        color: 'var(--foreground-subtitle)',
                        opacity: 0.8,
                        letterSpacing: '-0.02em'
                    }}>
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Docs</span>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full" style={{
                            backgroundColor: 'var(--foreground-title)',
                            opacity: 0.8
                        }}></div>
                        <span className="text-lg font-bold" style={{
                            color: 'var(--foreground-title)',
                            letterSpacing: '-0.05em'
                        }}>CUMULUS</span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-16">
                {/* Hero */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold mb-4" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.05em'
                    }}>
                        Workflow Templates
                    </h1>
                    <p className="text-xl max-w-3xl" style={{
                        color: 'var(--foreground-body)',
                        letterSpacing: '-0.02em'
                    }}>
                        Start with pre-built workflows and customize them to fit your needs. All templates are production-ready and fully documented.
                    </p>
                </div>

                {/* Filters */}
                <div className="mb-8 flex flex-wrap gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--foreground-subtitle)' }}>
                            Category
                        </label>
                        <div className="flex gap-2">
                            {categories.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setSelectedCategory(category)}
                                    className="px-4 py-2 text-sm font-medium transition-all rounded-lg"
                                    style={{
                                        backgroundColor: selectedCategory === category ? 'var(--foreground-title)' : 'var(--accent-bg)',
                                        color: selectedCategory === category ? 'var(--background)' : 'var(--foreground-body)',
                                        letterSpacing: '-0.01em'
                                    }}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--foreground-subtitle)' }}>
                            Difficulty
                        </label>
                        <div className="flex gap-2">
                            {difficulties.map(difficulty => (
                                <button
                                    key={difficulty}
                                    onClick={() => setSelectedDifficulty(difficulty)}
                                    className="px-4 py-2 text-sm font-medium transition-all rounded-lg"
                                    style={{
                                        backgroundColor: selectedDifficulty === difficulty ? 'var(--foreground-title)' : 'var(--accent-bg)',
                                        color: selectedDifficulty === difficulty ? 'var(--background)' : 'var(--foreground-body)',
                                        letterSpacing: '-0.01em'
                                    }}
                                >
                                    {difficulty}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(template => {
                        const Icon = template.icon;
                        return (
                            <Link
                                key={template.id}
                                href={template.href}
                                className="group rounded-2xl p-6 border transition-all hover:shadow-lg"
                                style={{
                                    backgroundColor: 'var(--node-background)',
                                    borderColor: 'var(--border-color)'
                                }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                                        backgroundColor: 'var(--accent-bg)'
                                    }}>
                                        <Icon className="w-6 h-6" style={{ color: 'var(--foreground-subtitle)' }} />
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        {template.difficulty}
                                    </span>
                                </div>

                                <h3 className="text-xl font-semibold mb-2 group-hover:opacity-80 transition-opacity" style={{
                                    color: 'var(--foreground-title)',
                                    letterSpacing: '-0.03em'
                                }}>
                                    {template.title}
                                </h3>

                                <p className="text-sm mb-4" style={{
                                    color: 'var(--foreground-subtitle)',
                                    letterSpacing: '-0.01em'
                                }}>
                                    {template.description}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t" style={{
                                    borderColor: 'var(--border-color)'
                                }}>
                                    <span className="text-xs" style={{ color: 'var(--foreground-subtitle)' }}>
                                        {template.nodes} nodes
                                    </span>
                                    <span className="text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>
                                        View Template →
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {filteredTemplates.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-lg" style={{ color: 'var(--foreground-subtitle)' }}>
                            No templates match your filters. Try adjusting your selection.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}

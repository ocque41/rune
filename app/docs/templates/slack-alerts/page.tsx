'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, MessageSquare, AlertCircle } from 'lucide-react';

export default function SlackAlertsTemplate() {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
            <header className="border-b sticky top-0 z-10" style={{
                backgroundColor: 'var(--header-background)',
                borderColor: 'var(--border-color)'
            }}>
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/docs/templates" className="flex items-center gap-2 transition-colors hover:opacity-100" style={{
                        color: 'var(--foreground-subtitle)',
                        opacity: 0.8
                    }}>
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">All Templates</span>
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-16">
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <MessageSquare className="w-8 h-8" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold" style={{
                                color: 'var(--foreground-title)',
                                letterSpacing: '-0.05em'
                            }}>
                                Slack Alerts
                            </h1>
                            <p className="text-sm mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                Beginner • 3 nodes • Communication
                            </p>
                        </div>
                    </div>
                    <p className="text-xl" style={{
                        color: 'var(--foreground-body)',
                        letterSpacing: '-0.02em'
                    }}>
                        Send real-time notifications to Slack channels when important events occur. Keep your team informed instantly.
                    </p>
                </div>

                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        What You'll Build
                    </h2>
                    <div className="rounded-2xl p-8 border space-y-4" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        {[
                            { num: 1, title: 'Event Trigger', desc: 'Receives events from your application or system' },
                            { num: 2, title: 'Severity Check', desc: 'Determines if the event requires immediate notification' },
                            { num: 3, title: 'Slack Message', desc: 'Sends a formatted message to your Slack channel' }
                        ].map(step => (
                            <div key={step.num} className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
                                    backgroundColor: 'var(--foreground-title)',
                                    color: 'var(--background)'
                                }}>
                                    {step.num}
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground-body)' }}>
                                        {step.title}
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Common Use Cases
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            'Error and exception alerts',
                            'Deployment notifications',
                            'Sales and revenue updates',
                            'System health monitoring',
                            'Customer support tickets',
                            'Build and test results'
                        ].map((useCase, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl" style={{
                                backgroundColor: 'var(--accent-bg)'
                            }}>
                                <Check className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--foreground-subtitle)' }} />
                                <span style={{ color: 'var(--foreground-body)' }}>{useCase}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Configuration Guide
                    </h2>
                    <div className="rounded-2xl p-6 border" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                            <MessageSquare className="w-5 h-5" />
                            Slack Message Node
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div>
                                <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Channel:</span>
                                <code className="ml-2 px-2 py-1 rounded" style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    color: 'var(--foreground-subtitle)'
                                }}>
                                    #alerts
                                </code>
                            </div>
                            <div>
                                <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Message:</span>
                                <code className="ml-2 px-2 py-1 rounded" style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    color: 'var(--foreground-subtitle)'
                                }}>
                                    {'🚨 Error detected: {{event.error.message}}'}
                                </code>
                            </div>
                            <div>
                                <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Webhook URL:</span>
                                <code className="ml-2 px-2 py-1 rounded" style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    color: 'var(--foreground-subtitle)'
                                }}>
                                    {'{{SLACK_WEBHOOK_URL}}'}
                                </code>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl p-6 mt-6" style={{
                        backgroundColor: 'var(--accent-bg)'
                    }}>
                        <h4 className="font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                            <AlertCircle className="w-5 h-5" />
                            Setup Required
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                            You'll need to create a Slack incoming webhook in your Slack workspace settings and save it as a secret named <code className="px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>SLACK_WEBHOOK_URL</code>.
                        </p>
                    </div>
                </section>

                <section className="mb-12">
                    <div className="rounded-2xl p-8 text-center border" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <h2 className="text-2xl font-bold mb-4" style={{
                            color: 'var(--foreground-title)',
                            letterSpacing: '-0.04em'
                        }}>
                            Ready to Use This Template?
                        </h2>
                        <button
                            onClick={handleCopy}
                            className="inline-flex items-center gap-2 px-6 py-3 font-semibold transition-all rounded-lg"
                            style={{
                                backgroundColor: 'var(--foreground-title)',
                                color: 'var(--background)',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}
                        >
                            {copied ? <><Check className="w-5 h-5" />Copied!</> : <><Copy className="w-5 h-5" />Copy Template</>}
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, Mail, Clock, FileText } from 'lucide-react';

export default function EmailNotificationsTemplate() {
    const [copied, setCopied] = React.useState(false);

    const workflowJson = {
        nodes: [
            {
                id: '1',
                type: 'trigger',
                position: { x: 100, y: 100 },
                data: { label: 'Webhook Trigger', type: 'trigger' }
            },
            {
                id: '2',
                type: 'step',
                position: { x: 100, y: 200 },
                data: {
                    label: 'Check Condition',
                    type: 'conditional',
                    condition: 'event.type === "user_signup"'
                }
            },
            {
                id: '3',
                type: 'step',
                position: { x: 100, y: 300 },
                data: {
                    label: 'Send Welcome Email',
                    type: 'send-email',
                    to: '{{event.user.email}}',
                    subject: 'Welcome to Cumulus!',
                    body: 'Hi {{event.user.name}}, welcome aboard!'
                }
            }
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3', sourceHandle: 'true' }
        ]
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(JSON.stringify(workflowJson, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
            {/* Header */}
            <header className="border-b sticky top-0 z-10" style={{
                backgroundColor: 'var(--header-background)',
                borderColor: 'var(--border-color)'
            }}>
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/docs/templates" className="flex items-center gap-2 transition-colors hover:opacity-100" style={{
                        color: 'var(--foreground-subtitle)',
                        opacity: 0.8,
                        letterSpacing: '-0.02em'
                    }}>
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">All Templates</span>
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

            <main className="max-w-5xl mx-auto px-6 py-16">
                {/* Hero */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Mail className="w-8 h-8" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold" style={{
                                color: 'var(--foreground-title)',
                                letterSpacing: '-0.05em'
                            }}>
                                Email Notifications
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
                        Automatically send email notifications when specific events occur in your system. Perfect for welcome emails, alerts, and status updates.
                    </p>
                </div>

                {/* What You'll Build */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        What You'll Build
                    </h2>
                    <div className="rounded-2xl p-8 border" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
                                    backgroundColor: 'var(--foreground-title)',
                                    color: 'var(--background)'
                                }}>
                                    1
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground-body)' }}>
                                        Webhook Trigger
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Receives incoming events from your application
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
                                    backgroundColor: 'var(--foreground-title)',
                                    color: 'var(--background)'
                                }}>
                                    2
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground-body)' }}>
                                        Conditional Check
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Verifies the event is a user signup
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{
                                    backgroundColor: 'var(--foreground-title)',
                                    color: 'var(--background)'
                                }}>
                                    3
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground-body)' }}>
                                        Send Welcome Email
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Sends a personalized welcome email to the new user
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Use Cases */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Common Use Cases
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            'Welcome emails for new users',
                            'Order confirmation emails',
                            'Password reset notifications',
                            'System alerts and warnings',
                            'Daily/weekly digest emails',
                            'Event reminders'
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

                {/* Configuration */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Configuration Guide
                    </h2>
                    <div className="space-y-6">
                        <div className="rounded-2xl p-6 border" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                                <Mail className="w-5 h-5" />
                                Email Node Configuration
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>To:</span>
                                    <code className="ml-2 px-2 py-1 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        {'{{event.user.email}}'}
                                    </code>
                                </div>
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Subject:</span>
                                    <code className="ml-2 px-2 py-1 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        Welcome to Cumulus!
                                    </code>
                                </div>
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Body:</span>
                                    <code className="ml-2 px-2 py-1 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        {'Hi {{event.user.name}}, welcome aboard!'}
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl p-6" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <h4 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                💡 Pro Tip
                            </h4>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                Use <code className="px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>{'{{variable}}'}</code> syntax to insert dynamic data from previous nodes or the trigger event.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Copy Template */}
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
                        <p className="mb-6" style={{ color: 'var(--foreground-subtitle)' }}>
                            Click the button below to copy the workflow configuration, then paste it into the editor.
                        </p>
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
                            {copied ? (
                                <>
                                    <Check className="w-5 h-5" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-5 h-5" />
                                    Copy Template
                                </>
                            )}
                        </button>
                    </div>
                </section>

                {/* Next Steps */}
                <section>
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Next Steps
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link href="/docs/guides/send-email" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <FileText className="w-8 h-8 mb-3" style={{ color: 'var(--foreground-subtitle)' }} />
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                Email Node Guide
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                Learn all email node features
                            </p>
                        </Link>

                        <Link href="/docs/templates" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <Mail className="w-8 h-8 mb-3" style={{ color: 'var(--foreground-subtitle)' }} />
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                More Templates
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                Explore other workflow templates
                            </p>
                        </Link>

                        <Link href="/" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <Clock className="w-8 h-8 mb-3" style={{ color: 'var(--foreground-subtitle)' }} />
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                Start Building
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                Open the workflow editor
                            </p>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}

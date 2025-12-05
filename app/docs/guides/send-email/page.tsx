'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, User, FileText, Settings } from 'lucide-react';

export default function SendEmailGuide() {
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
            <header className="border-b sticky top-0 z-10" style={{
                backgroundColor: 'var(--header-background)',
                borderColor: 'var(--border-color)'
            }}>
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/docs" className="flex items-center gap-2 transition-colors hover:opacity-100" style={{
                        color: 'var(--foreground-subtitle)',
                        opacity: 0.8
                    }}>
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to Docs</span>
                    </Link>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-16">
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Mail className="w-8 h-8" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h1 className="text-4xl font-bold" style={{
                            color: 'var(--foreground-title)',
                            letterSpacing: '-0.05em'
                        }}>
                            Send Email Node
                        </h1>
                    </div>
                    <p className="text-xl" style={{
                        color: 'var(--foreground-body)',
                        letterSpacing: '-0.02em'
                    }}>
                        Send automated emails with dynamic content. Perfect for notifications, welcome messages, and alerts.
                    </p>
                </div>

                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Configuration Options
                    </h2>

                    <div className="space-y-6">
                        <div className="rounded-2xl p-6 border" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                                <User className="w-5 h-5" />
                                Recipients
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>To</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Primary recipient email address(es). Supports multiple addresses separated by commas.
                                    </p>
                                    <code className="block mt-2 px-3 py-2 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        {'{{user.email}}, admin@example.com'}
                                    </code>
                                </div>
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>CC / BCC</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Optional carbon copy and blind carbon copy addresses.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-6 border" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                                <FileText className="w-5 h-5" />
                                Content
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Subject</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Email subject line. Can include dynamic variables.
                                    </p>
                                    <code className="block mt-2 px-3 py-2 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        Welcome to Cumulus, {'{{userName}}'}!
                                    </code>
                                </div>
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Body</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Main email content. Supports both plain text and HTML.
                                    </p>
                                    <code className="block mt-2 px-3 py-2 rounded whitespace-pre-wrap" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)',
                                        fontSize: '0.85rem'
                                    }}>
                                        {`Hi {{userName}},

Welcome to Cumulus! We're excited to have you.

Your account is now active and ready to use.

Best regards,
The Cumulus Team`}
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-6 border" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                                <Settings className="w-5 h-5" />
                                Advanced Options
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>From Name</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Display name that appears in the recipient's inbox.
                                    </p>
                                    <code className="block mt-2 px-3 py-2 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        Cumulus Automation
                                    </code>
                                </div>
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Reply-To</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Email address for replies (optional, defaults to sender).
                                    </p>
                                </div>
                            </div>
                        </div>
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
                            { title: 'Welcome Emails', desc: 'Greet new users when they sign up' },
                            { title: 'Order Confirmations', desc: 'Confirm purchases and orders' },
                            { title: 'Password Resets', desc: 'Send secure password reset links' },
                            { title: 'Notifications', desc: 'Alert users of important events' },
                            { title: 'Reminders', desc: 'Send scheduled reminders' },
                            { title: 'Reports', desc: 'Deliver automated reports' }
                        ].map((useCase, i) => (
                            <div key={i} className="p-4 rounded-xl" style={{
                                backgroundColor: 'var(--accent-bg)'
                            }}>
                                <h3 className="font-semibold mb-1" style={{ color: 'var(--foreground-body)' }}>
                                    {useCase.title}
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                    {useCase.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Dynamic Content with Variables
                    </h2>
                    <div className="rounded-2xl p-6 border" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <p className="mb-4" style={{ color: 'var(--foreground-subtitle)' }}>
                            Use variables to personalize emails with data from previous nodes or the trigger:
                        </p>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <code className="px-2 py-1 rounded flex-shrink-0" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--foreground-subtitle)' }}>
                                    {'{{userName}}'}
                                </code>
                                <span style={{ color: 'var(--foreground-subtitle)' }}>Insert user's name</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <code className="px-2 py-1 rounded flex-shrink-0" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--foreground-subtitle)' }}>
                                    {'{{orderNumber}}'}
                                </code>
                                <span style={{ color: 'var(--foreground-subtitle)' }}>Include order reference</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <code className="px-2 py-1 rounded flex-shrink-0" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--foreground-subtitle)' }}>
                                    {'{{resetLink}}'}
                                </code>
                                <span style={{ color: 'var(--foreground-subtitle)' }}>Add dynamic links</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Related Resources
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Link href="/docs/templates/email-notifications" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                Email Notifications Template
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                Complete workflow example
                            </p>
                        </Link>

                        <Link href="/docs" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                Getting Started
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                Learn the basics
                            </p>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Zap, Lock, Workflow, BookOpen, ArrowRight } from 'lucide-react';

export default function DocsPage() {
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
            {/* Header */}
            <header className="border-b sticky top-0 z-10" style={{
                backgroundColor: 'var(--header-background)',
                borderColor: 'var(--border-color)'
            }}>
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 transition-colors hover:opacity-100" style={{
                        color: 'var(--foreground-subtitle)',
                        opacity: 0.8,
                        letterSpacing: '-0.02em'
                    }}>
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">Back to App</span>
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

            <main className="max-w-6xl mx-auto px-6 py-16">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{
                        backgroundColor: 'var(--accent-bg)'
                    }}>
                        <BookOpen className="w-8 h-8" style={{ color: 'var(--foreground-subtitle)' }} />
                    </div>
                    <h1 className="text-5xl font-bold mb-4" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.05em'
                    }}>
                        Welcome to Cumulus Automation
                    </h1>
                    <p className="text-xl max-w-2xl mx-auto" style={{
                        color: 'var(--foreground-body)',
                        letterSpacing: '-0.02em'
                    }}>
                        Build powerful automation workflows visually. No coding required.
                    </p>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                    {/* Quick Start */}
                    <Link href="/docs/quickstart" className="group rounded-2xl p-8 border transition-all hover:shadow-lg" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-blue-500/20" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Zap className="w-6 h-6 transition-colors group-hover:text-blue-500" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{
                            color: 'var(--foreground-body)',
                            letterSpacing: '-0.03em'
                        }}>Quick Start Guide</h3>
                        <p className="mb-4 text-sm" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em'
                        }}>
                            Learn the basics and create your first workflow in 5 minutes.
                        </p>
                        <span className="font-medium inline-flex items-center gap-1 text-sm transition-opacity group-hover:opacity-100 opacity-80" style={{ color: 'var(--foreground-body)' }}>
                            Read Guide <ArrowRight className="w-4 h-4" />
                        </span>
                    </Link>

                    {/* Nodes Reference */}
                    <Link href="/docs/nodes" className="group rounded-2xl p-8 border transition-all hover:shadow-lg" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-purple-500/20" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Workflow className="w-6 h-6 transition-colors group-hover:text-purple-500" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{
                            color: 'var(--foreground-body)',
                            letterSpacing: '-0.03em'
                        }}>Node Reference</h3>
                        <p className="mb-4 text-sm" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em'
                        }}>
                            Detailed documentation for all available node types and their configurations.
                        </p>
                        <span className="font-medium inline-flex items-center gap-1 text-sm transition-opacity group-hover:opacity-100 opacity-80" style={{ color: 'var(--foreground-body)' }}>
                            Explore Nodes <ArrowRight className="w-4 h-4" />
                        </span>
                    </Link>

                    {/* Troubleshooting */}
                    <Link href="/docs/troubleshooting" className="group rounded-2xl p-8 border transition-all hover:shadow-lg" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-amber-500/20" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Lock className="w-6 h-6 transition-colors group-hover:text-amber-500" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{
                            color: 'var(--foreground-body)',
                            letterSpacing: '-0.03em'
                        }}>Troubleshooting</h3>
                        <p className="mb-4 text-sm" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em'
                        }}>
                            Common issues, error messages, and how to resolve them.
                        </p>
                        <span className="font-medium inline-flex items-center gap-1 text-sm transition-opacity group-hover:opacity-100 opacity-80" style={{ color: 'var(--foreground-body)' }}>
                            Get Help <ArrowRight className="w-4 h-4" />
                        </span>
                    </Link>

                    {/* Secrets (Keeping inline or separate? I'll keep it simple for now, maybe just a card since I kept the section below anyway) */}
                    <a href="#secrets" className="group rounded-2xl p-8 border transition-all hover:shadow-lg" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Lock className="w-6 h-6" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{
                            color: 'var(--foreground-body)',
                            letterSpacing: '-0.03em'
                        }}>Secrets Management</h3>
                        <p className="mb-4 text-sm" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em'
                        }}>
                            How to safely use API keys and credentials.
                        </p>
                        <span className="font-medium inline-flex items-center gap-1 text-sm transition-opacity group-hover:opacity-100 opacity-80" style={{ color: 'var(--foreground-body)' }}>
                            Learn More <ArrowRight className="w-4 h-4" />
                        </span>
                    </a>
                </div>

                {/* Secrets Section */}
                <section id="secrets" className="mb-16 scroll-mt-20">
                    <div className="rounded-2xl p-10 border" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{
                                backgroundColor: 'var(--accent-bg)'
                            }}>
                                <Lock className="w-6 h-6" style={{ color: 'var(--foreground-subtitle)' }} />
                            </div>
                            <h2 className="text-3xl font-bold" style={{
                                color: 'var(--foreground-title)',
                                letterSpacing: '-0.05em'
                            }}>Using Secrets Safely</h2>
                        </div>

                        <p className="mb-6 text-lg" style={{
                            color: 'var(--foreground-body)',
                            letterSpacing: '-0.02em'
                        }}>
                            Need to use API keys or passwords in your workflows? We've got you covered with secure secret management.
                        </p>

                        <div className="rounded-xl p-6 mb-6" style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-3 text-lg" style={{
                                color: 'var(--foreground-body)',
                                letterSpacing: '-0.03em'
                            }}>How to Reference Secrets</h3>
                            <p className="mb-4" style={{
                                color: 'var(--foreground-subtitle)',
                                letterSpacing: '-0.02em'
                            }}>
                                In any configuration field, you can reference a secret by wrapping its name in double curly braces:
                            </p>
                            <div className="rounded-lg p-4 font-mono text-sm" style={{
                                backgroundColor: 'var(--background)',
                                color: 'var(--foreground-body)'
                            }}>
                                <div className="mb-2"><span style={{ color: 'var(--foreground-subtitle)', opacity: 0.7 }}># Example:</span></div>
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>API Key:</span> {'{{MY_API_KEY}}'}</div>
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>Password:</span> {'{{DATABASE_PASSWORD}}'}</div>
                            </div>
                        </div>

                        <div className="rounded-xl p-6" style={{
                            backgroundColor: 'var(--foreground-title)',
                            color: 'var(--background)'
                        }}>
                            <h3 className="font-semibold mb-2 flex items-center gap-2" style={{
                                color: 'var(--background)',
                                opacity: 0.9
                            }}>
                                <Lock className="w-5 h-5" />
                                Security Guarantee
                            </h3>
                            <p style={{ opacity: 0.9 }}>
                                Your secrets are never stored in the workflow code or database. They're retrieved securely at runtime from encrypted storage.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Nodes Overview */}


                {/* Footer CTA */}
                <div className="text-center rounded-2xl p-12" style={{
                    backgroundColor: 'var(--foreground-title)'
                }}>
                    <h2 className="text-3xl font-bold mb-4" style={{
                        color: 'var(--background)',
                        letterSpacing: '-0.05em'
                    }}>Ready to Build?</h2>
                    <p className="mb-6 text-lg" style={{
                        color: 'var(--background)',
                        opacity: 0.8,
                        letterSpacing: '-0.02em'
                    }}>
                        Start creating your first automation workflow now.
                    </p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 font-semibold transition-all"
                        style={{
                            backgroundColor: 'var(--background)',
                            color: 'var(--foreground-title)',
                            borderRadius: '24px',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                        }}
                    >
                        Open Builder <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </main>
        </div>
    );
}

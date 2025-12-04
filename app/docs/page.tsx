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

                {/* Quick Start Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <div className="rounded-2xl p-8 border transition-all" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--foreground-subtitle)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Zap className="w-6 h-6" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{
                            color: 'var(--foreground-body)',
                            letterSpacing: '-0.03em'
                        }}>Quick Start</h3>
                        <p className="mb-4 text-sm" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em'
                        }}>
                            Learn the basics and create your first workflow in minutes.
                        </p>
                        <Link href="#getting-started" className="font-medium inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-100" style={{
                            color: 'var(--foreground-body)',
                            opacity: 0.9,
                            letterSpacing: '-0.01em'
                        }}>
                            Get Started <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="rounded-2xl p-8 border transition-all" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--foreground-subtitle)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Lock className="w-6 h-6" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{
                            color: 'var(--foreground-body)',
                            letterSpacing: '-0.03em'
                        }}>Secrets & Security</h3>
                        <p className="mb-4 text-sm" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em'
                        }}>
                            Understand how we keep your API keys and credentials safe.
                        </p>
                        <Link href="#secrets" className="font-medium inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-100" style={{
                            color: 'var(--foreground-body)',
                            opacity: 0.9,
                            letterSpacing: '-0.01em'
                        }}>
                            Learn More <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="rounded-2xl p-8 border transition-all" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--foreground-subtitle)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border-color)';
                        }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <Workflow className="w-6 h-6" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2" style={{
                            color: 'var(--foreground-body)',
                            letterSpacing: '-0.03em'
                        }}>Workflow Nodes</h3>
                        <p className="mb-4 text-sm" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em'
                        }}>
                            Explore all available nodes and what they can do.
                        </p>
                        <Link href="#nodes" className="font-medium inline-flex items-center gap-1 text-sm transition-opacity hover:opacity-100" style={{
                            color: 'var(--foreground-body)',
                            opacity: 0.9,
                            letterSpacing: '-0.01em'
                        }}>
                            Explore Nodes <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Getting Started Section */}
                <section id="getting-started" className="mb-16 scroll-mt-20">
                    <div className="rounded-2xl p-10 border" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <h2 className="text-3xl font-bold mb-6" style={{
                            color: 'var(--foreground-title)',
                            letterSpacing: '-0.05em'
                        }}>Getting Started</h2>

                        <div className="space-y-8">
                            <div className="flex gap-6">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{
                                        backgroundColor: 'var(--foreground-title)',
                                        color: 'var(--background)'
                                    }}>
                                        1
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2" style={{
                                        color: 'var(--foreground-body)',
                                        letterSpacing: '-0.03em'
                                    }}>Open the Workflow Builder</h3>
                                    <p style={{
                                        color: 'var(--foreground-subtitle)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        Click the "Back to App" button above to return to the main canvas. You'll see a blank workspace ready for your automation.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{
                                        backgroundColor: 'var(--foreground-title)',
                                        color: 'var(--background)'
                                    }}>
                                        2
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2" style={{
                                        color: 'var(--foreground-body)',
                                        letterSpacing: '-0.03em'
                                    }}>Drag Nodes onto the Canvas</h3>
                                    <p className="mb-3" style={{
                                        color: 'var(--foreground-subtitle)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        On the left sidebar, you'll find different types of nodes you can use:
                                    </p>
                                    <ul className="space-y-2">
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>•</span>
                                            <span style={{ color: 'var(--foreground-subtitle)', letterSpacing: '-0.02em' }}>
                                                <strong style={{ color: 'var(--foreground-body)' }}>HTTP Request:</strong> Make API calls to external services
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>•</span>
                                            <span style={{ color: 'var(--foreground-subtitle)', letterSpacing: '-0.02em' }}>
                                                <strong style={{ color: 'var(--foreground-body)' }}>Send Email:</strong> Send automated emails
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>•</span>
                                            <span style={{ color: 'var(--foreground-subtitle)', letterSpacing: '-0.02em' }}>
                                                <strong style={{ color: 'var(--foreground-body)' }}>Database Query:</strong> Read or write to databases
                                            </span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>•</span>
                                            <span style={{ color: 'var(--foreground-subtitle)', letterSpacing: '-0.02em' }}>
                                                <strong style={{ color: 'var(--foreground-body)' }}>Conditional:</strong> Add if/else logic to your workflow
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{
                                        backgroundColor: 'var(--foreground-title)',
                                        color: 'var(--background)'
                                    }}>
                                        3
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2" style={{
                                        color: 'var(--foreground-body)',
                                        letterSpacing: '-0.03em'
                                    }}>Configure Each Node</h3>
                                    <p style={{
                                        color: 'var(--foreground-subtitle)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        Click on any node to open its configuration panel. Fill in the required fields like URLs, email addresses, or SQL queries.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{
                                        backgroundColor: 'var(--foreground-title)',
                                        color: 'var(--background)'
                                    }}>
                                        4
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2" style={{
                                        color: 'var(--foreground-body)',
                                        letterSpacing: '-0.03em'
                                    }}>Connect the Nodes</h3>
                                    <p style={{
                                        color: 'var(--foreground-subtitle)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        Drag from the output handle (right side) of one node to the input handle (left side) of another to create connections. This defines the flow of your automation.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-6">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{
                                        backgroundColor: 'var(--foreground-title)',
                                        color: 'var(--background)'
                                    }}>
                                        5
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2" style={{
                                        color: 'var(--foreground-body)',
                                        letterSpacing: '-0.03em'
                                    }}>Save and Deploy</h3>
                                    <p style={{
                                        color: 'var(--foreground-subtitle)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        Click "Save Workflow" to generate the code, then "Deploy" to make your automation live.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

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
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
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
                <section id="nodes" className="mb-16 scroll-mt-20">
                    <div className="rounded-2xl p-10 border" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <h2 className="text-3xl font-bold mb-6" style={{
                            color: 'var(--foreground-title)',
                            letterSpacing: '-0.05em'
                        }}>Available Workflow Nodes</h2>
                        <p className="mb-8" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em'
                        }}>
                            Each node type serves a specific purpose in your automation. Click on any node type below to learn more about its capabilities.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { title: 'HTTP Request', desc: 'Make GET, POST, PUT, or DELETE requests to any API endpoint.' },
                                { title: 'Send Email', desc: 'Send automated emails with custom content and attachments.' },
                                { title: 'Database Query', desc: 'Execute SQL queries to read or write data to your database.' },
                                { title: 'Conditional', desc: 'Add if/else logic to branch your workflow based on conditions.' },
                                { title: 'Run Script', desc: 'Execute custom JavaScript code for advanced transformations.' },
                                { title: 'Slack Message', desc: 'Send notifications to Slack channels or direct messages.' }
                            ].map((node) => (
                                <div key={node.title} className="border rounded-xl p-6 transition-all" style={{
                                    borderColor: 'var(--border-color)'
                                }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--foreground-subtitle)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'var(--border-color)';
                                    }}>
                                    <h3 className="font-semibold mb-2" style={{
                                        color: 'var(--foreground-body)',
                                        letterSpacing: '-0.02em'
                                    }}>{node.title}</h3>
                                    <p className="text-sm" style={{
                                        color: 'var(--foreground-subtitle)',
                                        letterSpacing: '-0.01em'
                                    }}>
                                        {node.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

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

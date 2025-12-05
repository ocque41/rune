'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Webhook, Lock, Globe, Code } from 'lucide-react';

export default function HttpRequestGuide() {
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
                            <Webhook className="w-8 h-8" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <h1 className="text-4xl font-bold" style={{
                            color: 'var(--foreground-title)',
                            letterSpacing: '-0.05em'
                        }}>
                            HTTP Request Node
                        </h1>
                    </div>
                    <p className="text-xl" style={{
                        color: 'var(--foreground-body)',
                        letterSpacing: '-0.02em'
                    }}>
                        Make HTTP requests to external APIs and services. Supports GET, POST, PUT, DELETE, and PATCH methods with full header and authentication control.
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
                                <Globe className="w-5 h-5" />
                                URL & Method
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>URL</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        The endpoint to call. Supports dynamic values using <code className="px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--accent-bg)' }}>{'{{variable}}'}</code> syntax.
                                    </p>
                                    <code className="block mt-2 px-3 py-2 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        https://api.example.com/users/{'{{userId}}'}
                                    </code>
                                </div>
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Method</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Choose from: GET, POST, PUT, DELETE, PATCH
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-6 border" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                                <Lock className="w-5 h-5" />
                                Headers & Authentication
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Headers</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Add custom headers as JSON. Perfect for API keys and content types.
                                    </p>
                                    <code className="block mt-2 px-3 py-2 rounded font-mono" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)',
                                        fontSize: '0.85rem'
                                    }}>
                                        {`{
  "Authorization": "Bearer {{API_KEY}}",
  "Content-Type": "application/json"
}`}
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-6 border" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                                <Code className="w-5 h-5" />
                                Request Body
                            </h3>
                            <div className="space-y-3 text-sm">
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Body (POST/PUT/PATCH)</span>
                                    <p className="mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Send data in the request body. Supports JSON format with dynamic variables.
                                    </p>
                                    <code className="block mt-2 px-3 py-2 rounded font-mono" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)',
                                        fontSize: '0.85rem'
                                    }}>
                                        {`{
  "name": "{{userName}}",
  "email": "{{userEmail}}",
  "status": "active"
}`}
                                    </code>
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
                        Common Examples
                    </h2>

                    <div className="space-y-6">
                        <div className="rounded-xl p-6" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                Example 1: Fetch User Data
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>Method:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>GET</code></div>
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>URL:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>https://api.example.com/users/123</code></div>
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>Headers:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>{'{"Authorization": "Bearer {{API_KEY}}"}'}</code></div>
                            </div>
                        </div>

                        <div className="rounded-xl p-6" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                Example 2: Create a New Record
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>Method:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>POST</code></div>
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>URL:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>https://api.example.com/records</code></div>
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>Body:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>{'{"title": "New Record", "status": "active"}'}</code></div>
                            </div>
                        </div>

                        <div className="rounded-xl p-6" style={{
                            backgroundColor: 'var(--accent-bg)'
                        }}>
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                Example 3: Update Existing Data
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>Method:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>PUT</code></div>
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>URL:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>https://api.example.com/records/456</code></div>
                                <div><span style={{ color: 'var(--foreground-subtitle)' }}>Body:</span> <code className="ml-1 px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--background)' }}>{'{"status": "completed"}'}</code></div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6" style={{
                        color: 'var(--foreground-title)',
                        letterSpacing: '-0.04em'
                    }}>
                        Using the Response
                    </h2>
                    <div className="rounded-2xl p-6 border" style={{
                        backgroundColor: 'var(--node-background)',
                        borderColor: 'var(--border-color)'
                    }}>
                        <p className="mb-4" style={{ color: 'var(--foreground-subtitle)' }}>
                            The response from the HTTP request is automatically available to subsequent nodes. Access response data using:
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                                <span style={{ color: 'var(--foreground-subtitle)' }}>•</span>
                                <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--foreground-subtitle)' }}>{'{{httpResponse.data}}'}</code>
                                <span style={{ color: 'var(--foreground-subtitle)' }}>- The response body</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span style={{ color: 'var(--foreground-subtitle)' }}>•</span>
                                <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--foreground-subtitle)' }}>{'{{httpResponse.status}}'}</code>
                                <span style={{ color: 'var(--foreground-subtitle)' }}>- HTTP status code</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span style={{ color: 'var(--foreground-subtitle)' }}>•</span>
                                <code className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--foreground-subtitle)' }}>{'{{httpResponse.headers}}'}</code>
                                <span style={{ color: 'var(--foreground-subtitle)' }}>- Response headers</span>
                            </li>
                        </ul>
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
                        <Link href="/docs/templates/api-integration" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                API Integration Template
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                Complete workflow example
                            </p>
                        </Link>

                        <Link href="/docs#secrets" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                Secrets Management
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                How to secure API keys
                            </p>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}

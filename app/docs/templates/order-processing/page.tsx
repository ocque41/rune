'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, ShoppingBag, CreditCard, Database, Mail, MessageSquare, Briefcase } from 'lucide-react';

export default function OrderProcessingTemplate() {
    const [copied, setCopied] = React.useState(false);

    const workflowJson = {
        nodes: [
            {
                id: '1',
                type: 'trigger',
                position: { x: 100, y: 100 },
                data: { label: 'Order Created', type: 'webhook' }
            },
            {
                id: '2',
                type: 'step',
                position: { x: 100, y: 200 },
                data: {
                    label: 'Validate Order',
                    type: 'conditional',
                    condition: 'event.total > 0 && event.items.length > 0'
                }
            },
            {
                id: '3',
                type: 'step',
                position: { x: 100, y: 300 },
                data: {
                    label: 'Process Payment',
                    type: 'api-call',
                    url: 'https://api.stripe.com/v1/charges',
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer {{secrets.STRIPE_KEY}}' },
                    body: '{ "amount": {{event.total}}, "currency": "usd", "source": "{{event.token}}" }'
                }
            },
            {
                id: '4',
                type: 'step',
                position: { x: 100, y: 400 },
                data: {
                    label: 'Update Inventory',
                    type: 'database',
                    operation: 'update',
                    table: 'inventory',
                    query: 'UPDATE products SET stock = stock - 1 WHERE id = {{event.product_id}}'
                }
            },
            {
                id: '5',
                type: 'step',
                position: { x: 300, y: 500 },
                data: {
                    label: 'Send Confirmation',
                    type: 'send-email',
                    to: '{{event.customer_email}}',
                    subject: 'Order Confirmation #{{event.order_id}}',
                    body: 'Thank you for your order! Your payment of ${{event.total}} has been processed.'
                }
            },
            {
                id: '6',
                type: 'step',
                position: { x: -100, y: 500 },
                data: {
                    label: 'Notify Shipping',
                    type: 'slack',
                    channel: '#shipping',
                    message: 'New order #{{event.order_id}} ready for fulfillment.'
                }
            }
        ],
        edges: [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3', sourceHandle: 'true' },
            { id: 'e3-4', source: '3', target: '4' },
            { id: 'e4-5', source: '4', target: '5' },
            { id: 'e4-6', source: '4', target: '6' }
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
                            <ShoppingBag className="w-8 h-8" style={{ color: 'var(--foreground-subtitle)' }} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold" style={{
                                color: 'var(--foreground-title)',
                                letterSpacing: '-0.05em'
                            }}>
                                Order Processing
                            </h1>
                            <p className="text-sm mt-1" style={{ color: 'var(--foreground-subtitle)' }}>
                                Advanced • 6 nodes • E-commerce
                            </p>
                        </div>
                    </div>
                    <p className="text-xl" style={{
                        color: 'var(--foreground-body)',
                        letterSpacing: '-0.02em'
                    }}>
                        End-to-end order fulfillment workflow. Handle payments, inventory updates, emails, and team notifications in one seamless process.
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
                                        Order Trigger & Validation
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Receive webhook from your store and validate order details
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
                                        Payment & Inventory
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Process payment via API and update database inventory
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
                                        Multi-Channel Notification
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                        Send customer confirmation email and notify shipping team via Slack
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
                            'E-commerce order fulfillment',
                            'Subscription renewal processing',
                            'Ticket booking systems',
                            'Digital product delivery',
                            'Marketplace transaction handling'
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
                                <CreditCard className="w-5 h-5" />
                                Payment API Configuration
                            </h3>
                            <div className="space-y-3 text-sm">
                                <p className="text-sm mb-2" style={{ color: 'var(--foreground-subtitle)' }}>
                                    Securely handle payments using the API node.
                                </p>
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Headers:</span>
                                    <code className="ml-2 px-2 py-1 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        Authorization: Bearer {'{{secrets.STRIPE_KEY}}'}
                                    </code>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl p-6 border" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground-body)' }}>
                                <Database className="w-5 h-5" />
                                Inventory Update
                            </h3>
                            <div className="space-y-3 text-sm">
                                <p className="text-sm mb-2" style={{ color: 'var(--foreground-subtitle)' }}>
                                    Keep your stock levels accurate automatically.
                                </p>
                                <div>
                                    <span className="font-medium" style={{ color: 'var(--foreground-body)' }}>Query:</span>
                                    <code className="ml-2 px-2 py-1 rounded" style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        color: 'var(--foreground-subtitle)'
                                    }}>
                                        UPDATE products SET stock = stock - 1 ...
                                    </code>
                                </div>
                            </div>
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
                        <Link href="/docs/guides/http-request" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <CreditCard className="w-8 h-8 mb-3" style={{ color: 'var(--foreground-subtitle)' }} />
                            <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground-body)' }}>
                                API Integration Guide
                            </h3>
                            <p className="text-sm" style={{ color: 'var(--foreground-subtitle)' }}>
                                Learn how to connect to external services
                            </p>
                        </Link>

                        <Link href="/docs/templates" className="p-6 rounded-xl border transition-all hover:shadow-md" style={{
                            backgroundColor: 'var(--node-background)',
                            borderColor: 'var(--border-color)'
                        }}>
                            <Briefcase className="w-8 h-8 mb-3" style={{ color: 'var(--foreground-subtitle)' }} />
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
                            <MessageSquare className="w-8 h-8 mb-3" style={{ color: 'var(--foreground-subtitle)' }} />
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

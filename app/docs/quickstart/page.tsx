import Link from 'next/link';
import { ArrowLeft, Rocket } from 'lucide-react';

export default function QuickStartPage() {
    return (
        <div className="min-h-screen bg-[var(--background)]">
            <header className="border-b sticky top-0 z-10 bg-[var(--header-background)] border-[var(--border-color)]">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/docs" className="flex items-center gap-2 text-[var(--foreground-subtitle)] hover:opacity-100 transition-opacity">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Docs</span>
                    </Link>
                    <h1 className="font-bold text-[var(--foreground-title)]">Quick Start Guide</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="prose prose-invert max-w-none">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-white/12 flex items-center justify-center">
                            <Rocket className="w-6 h-6 text-white/85" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[var(--foreground-title)] m-0">Building Your First Workflow</h1>
                            <p className="text-[var(--foreground-subtitle)] text-lg mt-2">Go from zero to automation in 5 minutes.</p>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <section>
                            <h2 className="text-2xl font-bold text-[var(--foreground-title)] mb-4">1. Create a Workflow</h2>
                            <p className="text-[var(--foreground-body)] mb-4">
                                When you open the app, you are greeted with a blank canvas. This is your workspace.
                                You can drag nodes from the sidebar onto this canvas.
                            </p>
                            <div className="bg-[var(--node-background)] border border-[var(--border-color)] p-4 rounded-lg">
                                <ul className="list-disc list-inside space-y-2 text-[var(--foreground-body)]">
                                    <li>Locate the <strong>Start Workflow</strong> node (it's there by default).</li>
                                    <li>Find the <strong>HTTP Request</strong> node in the sidebar.</li>
                                    <li>Drag and drop it onto the canvas.</li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--foreground-title)] mb-4">2. Connect Nodes</h2>
                            <p className="text-[var(--foreground-body)] mb-4">
                                Workflows rely on connections to define the order of execution.
                            </p>
                            <div className="bg-[var(--node-background)] border border-[var(--border-color)] p-4 rounded-lg">
                                <p className="text-[var(--foreground-body)]">
                                    Click and drag from the small circle (handle) on the right side of the <strong>Start Workflow</strong> node.
                                    Connect it to the left handle of your <strong>HTTP Request</strong> node.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--foreground-title)] mb-4">3. Configure the Step</h2>
                            <p className="text-[var(--foreground-body)] mb-4">
                                Now, let's make the HTTP request do something.
                            </p>
                            <div className="bg-[var(--node-background)] border border-[var(--border-color)] p-4 rounded-lg space-y-4">
                                <p className="text-[var(--foreground-body)]">Click on the <strong>HTTP Request</strong> node to open its settings.</p>
                                <ul className="list-disc list-inside space-y-1 text-[var(--foreground-body)]">
                                    <li><strong>Method:</strong> GET</li>
                                    <li><strong>URL:</strong> <code>https://api.github.com/zen</code></li>
                                </ul>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-[var(--foreground-title)] mb-4">4. Save and Run</h2>
                            <p className="text-[var(--foreground-body)] mb-4">
                                Click the <strong>Save Cloud</strong> button in the top right to save your work. Then, verify your logic by running the workflow.
                            </p>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

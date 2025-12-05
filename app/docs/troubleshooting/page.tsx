import Link from 'next/link';
import { ArrowLeft, AlertTriangle, HelpCircle } from 'lucide-react';

export default function TroubleshootingPage() {
    return (
        <div className="min-h-screen bg-[var(--background)]">
            <header className="border-b sticky top-0 z-10 bg-[var(--header-background)] border-[var(--border-color)]">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/docs" className="flex items-center gap-2 text-[var(--foreground-subtitle)] hover:opacity-100 transition-opacity">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Docs</span>
                    </Link>
                    <h1 className="font-bold text-[var(--foreground-title)]">Troubleshooting</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <h1 className="text-4xl font-bold text-[var(--foreground-title)] mb-8">Common Issues & Fixes</h1>

                <div className="space-y-8">
                    <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-red-500" />
                            <h2 className="text-xl font-bold text-[var(--foreground-title)]">Workflow Fails to Save</h2>
                        </div>
                        <p className="text-[var(--foreground-body)] mb-3">
                            Currently, saving relies on a Supabase connection or local file system write access in development.
                        </p>
                        <ul className="list-disc list-inside text-sm text-[var(--foreground-body)] space-y-1">
                            <li>Check if your <strong>network connection</strong> is active.</li>
                            <li>Ensure you have the correct <strong>permissions</strong> if you are in a team environment.</li>
                            <li>Check the browser console for specific 500 or 403 errors.</li>
                        </ul>
                    </div>

                    <div className="border border-[var(--border-color)] rounded-xl p-6 bg-[var(--node-background)]">
                        <div className="flex items-center gap-3 mb-4">
                            <HelpCircle className="text-[var(--foreground-subtitle)]" />
                            <h2 className="text-xl font-bold text-[var(--foreground-title)]">"Secret Not Found" Error</h2>
                        </div>
                        <p className="text-[var(--foreground-body)] mb-3">
                            This happens when a workflow tries to access a <code>{`{{SECRET_NAME}}`}</code> that hasn't been defined in the environment.
                        </p>
                        <div className="bg-[var(--background)] p-3 rounded border border-[var(--border-color)] text-sm">
                            <strong>Fix:</strong> Add the secret to your project's `.env` file (e.g. `WORKFLOW_SECRET_MY_API_KEY=value`) and restart the dev server.
                        </div>
                    </div>

                    <div className="border border-[var(--border-color)] rounded-xl p-6 bg-[var(--node-background)]">
                        <div className="flex items-center gap-3 mb-4">
                            <HelpCircle className="text-[var(--foreground-subtitle)]" />
                            <h2 className="text-xl font-bold text-[var(--foreground-title)]">Loop Node Not Iterating</h2>
                        </div>
                        <p className="text-[var(--foreground-body)] mb-3">
                            If your loop runs once or fails immediately, the input array might be malformed.
                        </p>
                        <div className="bg-[var(--background)] p-3 rounded border border-[var(--border-color)] text-sm">
                            <strong>Fix:</strong> Ensure the variable passed to the "Items" field is actually an Array. Use a <strong>Run Script</strong> node before the loop to debug/log the data type.
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

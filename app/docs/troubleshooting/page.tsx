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
                    <div className="border border-white/20 bg-white/8 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-white/75" />
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
                            This happens when a workflow tries to access a <code>{`{{SECRET_NAME}}`}</code> that has not been added to Rune Secrets.
                        </p>
                        <div className="bg-[var(--background)] p-3 rounded border border-[var(--border-color)] text-sm">
                            <strong>Fix:</strong> Add or replace the key in the Secrets drawer. Local development can also use <code>WORKFLOW_SECRET_MY_API_KEY</code> with <code>SECRETS_PROVIDER=env</code>.
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

                    <div className="border border-white/20 bg-white/8 rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="text-white/75" />
                            <h2 className="text-xl font-bold text-[var(--foreground-title)]">Push to main Did Not Create a Vercel Deployment</h2>
                        </div>
                        <p className="text-[var(--foreground-body)] mb-3">
                            Use this runbook when a Git push lands in GitHub but Vercel shows no new deployment entry.
                        </p>

                        <p className="text-sm font-semibold text-[var(--foreground-title)] mb-2">Triage Steps</p>
                        <ol className="list-decimal list-inside text-sm text-[var(--foreground-body)] space-y-1 mb-4">
                            <li>Anchor the incident with commit SHA + timestamp.</li>
                            <li>Check Vercel Deployments for that SHA.</li>
                            <li>Check Vercel Activity Log in the same time window.</li>
                            <li>Map the log signal to fix:
                                <ul className="list-disc list-inside mt-1 ml-5 space-y-1">
                                    <li><code>project-git-create-deployments-toggled</code> -&gt; re-enable auto deployments for <code>main</code>.</li>
                                    <li><code>deployment-creation-blocked</code> -&gt; fix team access / commit author access.</li>
                                    <li>Webhook or OAuth errors -&gt; reconnect Git integration / reauthorize GitHub app.</li>
                                    <li>No related events -&gt; disconnect/reconnect project Git integration and retest.</li>
                                </ul>
                            </li>
                        </ol>

                        <p className="text-sm font-semibold text-[var(--foreground-title)] mb-2">Recovery + Verification</p>
                        <ol className="list-decimal list-inside text-sm text-[var(--foreground-body)] space-y-1 mb-4">
                            <li>Create one manual deployment from the target SHA to restore service.</li>
                            <li>Push an empty commit (regression test) and confirm auto deployment appears in 1-2 minutes.</li>
                            <li>If regression fails, reconnect Git integration and reauthorize GitHub app, then test again.</li>
                        </ol>

                        <p className="text-sm font-semibold text-[var(--foreground-title)] mb-2">Monthly Audit Checklist</p>
                        <ul className="list-disc list-inside text-sm text-[var(--foreground-body)] space-y-1">
                            <li>Project Git integration is connected to the expected repository.</li>
                            <li>Production branch is <code>main</code> and auto deployments are enabled.</li>
                            <li>Ignored Build Step is empty/disabled unless intentionally configured.</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}

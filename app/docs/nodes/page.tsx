import Link from 'next/link';
import { ArrowLeft, Database, Globe, Mail, MessageSquare, Split, Code, Clock } from 'lucide-react';

const NODE_TYPES = [
    {
        title: "HTTP Request",
        icon: Globe,
        description: "Make requests to external APIs.",
        fields: ["Method (GET, POST, etc.)", "URL", "Headers (JSON)", "Body (JSON)"],
        useCase: "Fetching data from a third-party API or triggering a webhook."
    },
    {
        title: "Send Email",
        icon: Mail,
        description: "Send automated emails via configured SMTP or API.",
        fields: ["Recipient", "Subject", "Body", "Sender Name"],
        useCase: "Sending welcome emails, reports, or alerts."
    },
    {
        title: "Database Query",
        icon: Database,
        description: "Execute SQL or NoSQL queries.",
        fields: ["Database Type", "Connection String", "Query/Operation"],
        useCase: "Reading user data, updating records, or logging events."
    },
    {
        title: "Slack Message",
        icon: MessageSquare,
        description: "Post messages to Slack channels.",
        fields: ["Webhook URL", "Message Text", "Channel (optional)"],
        useCase: "Notifying the team about new sales or errors."
    },
    {
        title: "Conditional (If/Else)",
        icon: Split,
        description: "Branch your workflow based on logic.",
        fields: ["Condition Expression (JS)"],
        useCase: "Checking if a user is premium before sending an email."
    },
    {
        title: "Run Script",
        icon: Code,
        description: "Execute arbitrary JavaScript code.",
        fields: ["Code"],
        useCase: "Data transformation, complex math, or custom logic."
    },
    {
        title: "Schedule / Cron",
        icon: Clock,
        description: "Trigger workflows on a timer.",
        fields: ["Cron Expression"],
        useCase: "Running nightly reports or hourly syncs."
    }
];

export default function NodesPage() {
    return (
        <div className="min-h-screen bg-[var(--background)]">
            <header className="border-b sticky top-0 z-10 bg-[var(--header-background)] border-[var(--border-color)]">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/docs" className="flex items-center gap-2 text-[var(--foreground-subtitle)] hover:opacity-100 transition-opacity">
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Docs</span>
                    </Link>
                    <h1 className="font-bold text-[var(--foreground-title)]">Node Reference</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-[var(--foreground-title)] mb-4">Workflow Nodes</h1>
                    <p className="text-[var(--foreground-subtitle)] text-lg">
                        A complete guide to the building blocks available in the builder.
                    </p>
                </div>

                <div className="grid gap-8">
                    {NODE_TYPES.map((node, i) => (
                        <div key={i} className="border border-[var(--border-color)] rounded-xl p-6 bg-[var(--node-background)]">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 rounded-lg bg-[var(--accent-bg)] text-[var(--foreground-subtitle)]">
                                    <node.icon size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--foreground-title)]">{node.title}</h2>
                                    <p className="text-[var(--foreground-subtitle)] mt-1">{node.description}</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6 mt-6">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-subtitle)] mb-3">Configuration</h3>
                                    <ul className="space-y-2">
                                        {node.fields.map(field => (
                                            <li key={field} className="flex items-center gap-2 text-sm text-[var(--foreground-body)]">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-subtitle)]" />
                                                {field}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--foreground-subtitle)] mb-3">Common Use Case</h3>
                                    <p className="text-sm text-[var(--foreground-body)] bg-[var(--background)] p-3 rounded border border-[var(--border-color)]">
                                        {node.useCase}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}

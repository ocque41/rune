import { validateApprovalToken, markTokenUsed } from '@/lib/autonomy/approvals';
import { approveJob } from '@/app/actions/autonomy';
import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
    referrer: 'no-referrer',
};

// Next.js 15: params is async
export default async function ApprovalPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const { valid, jobId, action, alreadyUsed } = await validateApprovalToken(token);
    let error: string | null = null;
    let success = false;
    let successMessage = "";

    if (!valid) {
        error = alreadyUsed ? "This approval link has already been used." : "Invalid or expired approval link.";
    } else if (jobId && action) {
        try {
            // We pass the decision based on the token's embedded action
            const decision = action === 'reject' ? 'rejected' : 'approved';
            await approveJob(jobId, decision);

            successMessage = decision === 'rejected'
                ? "The autonomous job has been rejected."
                : "The autonomous job has been approved and queued for execution.";

            await markTokenUsed(token);
            success = true;
        } catch (e: any) {
            error = e.message;
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 font-sans">
            <div className="max-w-md w-full bg-card border border-border rounded-xl p-8 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300">
                {success ? (
                    <>
                        <div className={`w-16 h-16 ${action === 'reject' ? 'bg-destructive/10' : 'bg-primary/10'} rounded-full flex items-center justify-center mx-auto mb-6 border ${action === 'reject' ? 'border-destructive/20' : 'border-primary/20'}`}>
                            {action === 'reject' ? <XCircle size={32} className="text-destructive" /> : <CheckCircle size={32} className="text-primary" />}
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">Job {action === 'reject' ? 'Rejected' : 'Approved'}</h1>
                        <p className="text-muted-foreground mb-8 text-sm">
                            {successMessage}
                        </p>
                        <Link
                            href="/"
                            className="inline-flex w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg items-center justify-center hover:opacity-90 transition-all shadow-sm"
                        >
                            Open Dashboard
                        </Link>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-destructive/20">
                            <XCircle size={32} className="text-destructive" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-2">Request Failed</h1>
                        <p className="text-muted-foreground mb-8 text-sm">
                            {error}
                        </p>
                        <Link
                            href="/"
                            className="inline-flex w-full py-3 bg-secondary text-secondary-foreground font-medium rounded-lg items-center justify-center hover:bg-secondary/80 transition-all border border-input"
                        >
                            Return Home
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}

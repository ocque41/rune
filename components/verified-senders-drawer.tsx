'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, ShieldCheck, Mail, Loader2, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Sender = {
    id: string;
    email: string;
    status: 'pending' | 'verified' | 'connected';
};

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSenderVerified: () => void; // Callback to refresh parent
};

export function VerifiedSendersDrawer({ isOpen, onClose, onSenderVerified }: Props) {
    const [senders, setSenders] = useState<Sender[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'add' | 'verify'>('list');

    // SMTP Form states
    const [smtpConfig, setSmtpConfig] = useState({
        host: '',
        port: '587',
        user: '',
        pass: '',
        secure: false
    });
    const [addTab, setAddTab] = useState<'verify' | 'connect'>('verify');

    // Form states
    const [newEmail, setNewEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (isOpen) fetchSenders();
    }, [isOpen]);

    const fetchSenders = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/email/list');
            if (!res.ok) throw new Error('Failed to load senders');
            const data = await res.json();
            setSenders(data.senders || []);
        } catch (e) {
            toast.error('Could not load verified senders');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, email: string) => {
        if (!confirm(`Are you sure you want to remove ${email}?`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/settings/email/delete', {
                method: 'DELETE',
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error('Failed to delete sender');

            toast.success('Sender removed');
            await fetchSenders();
            onSenderVerified(); // Refresh parent list
        } catch (e: any) {
            toast.error(e.message);
            setLoading(false);
        }
    };

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleConnectSMTP = async () => {
        if (!newEmail || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) return;
        setProcessing(true);
        try {
            const res = await fetch('/api/settings/email/connect-smtp', {
                method: 'POST',
                body: JSON.stringify({
                    email: newEmail,
                    ...smtpConfig,
                    port: parseInt(smtpConfig.port)
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('SMTP Connected successfully!');
            await fetchSenders();
            onSenderVerified();
            setView('list');
            setNewEmail('');
            setSmtpConfig({ host: '', port: '587', user: '', pass: '', secure: false });
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleSendVerification = async () => {
        if (!newEmail) return;
        setProcessing(true);
        setPreviewUrl(null);
        try {
            const res = await fetch('/api/settings/email/send-verification', {
                method: 'POST',
                body: JSON.stringify({ email: newEmail }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Verification code sent to ' + newEmail);
            if (data.debug?.preview) {
                setPreviewUrl(data.debug.preview);
                // Also open in new tab automatically for convenience? Maybe not, popups might block.
                // window.open(data.debug.preview, '_blank');
            }
            setView('verify');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleVerify = async () => {
        if (!verificationCode) return;
        setProcessing(true);
        try {
            const res = await fetch('/api/settings/email/verify', {
                method: 'POST',
                body: JSON.stringify({ email: newEmail, code: verificationCode }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            toast.success('Sender verified successfully!');
            await fetchSenders();
            onSenderVerified(); // Notify parent
            setView('list');
            setNewEmail('');
            setVerificationCode('');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-[400px] bg-[#1a1a1a] border-l border-white/10 shadow-2xl p-6 overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Verified Senders</h2>
                        <p className="text-sm text-white/50">Manage allowed "From" addresses</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {view === 'list' && (
                    <div className="space-y-4">
                        <button
                            onClick={() => setView('add')}
                            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-white/20 rounded-lg text-sm text-white/60 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all"
                        >
                            <Plus size={16} />
                            Add New Sender
                        </button>

                        {loading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-white/30" /></div>
                        ) : (
                            <div className="space-y-2">
                                {senders.length === 0 && (
                                    <p className="text-center text-xs text-white/30 py-4">No verified senders yet.</p>
                                )}
                                {senders.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-500/10 rounded-md text-blue-400">
                                                <Mail size={16} />
                                            </div>
                                            <div>
                                                <div className="text-sm text-white/90">{s.email}</div>
                                                <div className={`text-[10px] font-medium uppercase tracking-wider ${s.status === 'verified' ? 'text-green-400' :
                                                        s.status === 'connected' ? 'text-blue-400' : 'text-yellow-400'
                                                    }`}>
                                                    {s.status === 'connected' ? 'SMTP Connected' : s.status}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(s.status === 'verified' || s.status === 'connected') && <ShieldCheck size={16} className={s.status === 'connected' ? "text-blue-400" : "text-green-400"} />}
                                            <button
                                                onClick={() => handleDelete(s.id, s.email)}
                                                className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete sender"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {view === 'add' && (
                    <div className="space-y-6">
                        <div className="flex bg-white/5 p-1 rounded-lg">
                            <button
                                onClick={() => setAddTab('verify')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${addTab === 'verify' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Verify Domain (Code)
                            </button>
                            <button
                                onClick={() => setAddTab('connect')}
                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${addTab === 'connect' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Connect SMTP (Full Access)
                            </button>
                        </div>

                        {addTab === 'verify' ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60">
                                    Best for domains you own (e.g. <code>@company.com</code>).
                                    Sends using system default.
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-white/60">Email Address</label>
                                    <input
                                        type="email"
                                        placeholder="name@company.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={newEmail}
                                        onChange={e => setNewEmail(e.target.value)}
                                    />
                                    <p className="text-[10px] text-white/40">We will send a verification code to this address.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setView('list')}
                                        className="flex-1 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSendVerification}
                                        disabled={processing || !newEmail}
                                        className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                    >
                                        {processing && <Loader2 size={14} className="animate-spin" />}
                                        Send Code
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60">
                                    Best for Gmail, Outlook, etc. Requires <strong>App Password</strong>.
                                    Sends *actually* from your account.
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-white/60">Email Address (Username)</label>
                                    <input type="email" placeholder="you@gmail.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-medium text-white/60">Host</label>
                                        <input type="text" placeholder="smtp.gmail.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={smtpConfig.host} onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-white/60">Port</label>
                                        <input type="text" placeholder="587" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={smtpConfig.port} onChange={e => setSmtpConfig({ ...smtpConfig, port: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-white/60">Password (App Password)</label>
                                    <input type="password" placeholder="xxxx xxxx xxxx xxxx" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500" value={smtpConfig.pass} onChange={e => setSmtpConfig({ ...smtpConfig, pass: e.target.value })} />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => setView('list')} className="flex-1 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg">Cancel</button>
                                    <button onClick={handleConnectSMTP} disabled={processing || !newEmail || !smtpConfig.pass} className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2">
                                        {processing && <Loader2 size={14} className="animate-spin" />}
                                        Connect & Save
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {view === 'verify' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200">
                            Code sent to <strong>{newEmail}</strong>. Please check your inbox (and spam).
                            {previewUrl && (
                                <div className="mt-3 pt-3 border-t border-blue-500/20">
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white underline hover:text-blue-100 flex items-center gap-1 font-semibold"
                                    >
                                        View Email (Ethereal) &rarr;
                                    </a>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-white/60">Verification Code</label>
                            <input
                                type="text"
                                placeholder="123456"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                                value={verificationCode}
                                onChange={e => setVerificationCode(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setView('add')}
                                className="flex-1 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleVerify}
                                disabled={processing || !verificationCode}
                                className="flex-1 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {processing && <Loader2 size={14} className="animate-spin" />}
                                Verify & Add
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

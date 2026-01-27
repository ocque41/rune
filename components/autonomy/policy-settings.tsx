'use client';

import React, { useState, useEffect } from 'react';
import { updateAutonomyPolicy, getAutonomyPolicy } from '@/app/actions/autonomy';
import { toast } from 'sonner';
import { Loader2, Save, Shield, AlertTriangle, Zap } from 'lucide-react';
import { AutonomyConfig } from '@/lib/autonomy/policy';

export const PolicySettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Default config
    const [config, setConfig] = useState<AutonomyConfig>({
        mode: 'OFF',
        maxActionsPerHour: 10,
        maxActionsPerDay: 50,
        maxTokensPerHour: 100000,
        maxTokensPerDay: 500000,
        maxParallelJobs: 3,
        toolAllowlist: [],
        toolBlocklist: [],
        triggersEnabled: {
            webhook: true,
            schedule: true,
            runCompletion: true,
            manualOnly: false
        },
        notifyOnSuccess: false,
        notifyOnFailure: true,
        notifyOnApprovalNeeded: true
    });

    useEffect(() => {
        loadPolicy();
    }, []);

    const loadPolicy = async () => {
        try {
            const policy = await getAutonomyPolicy();
            if (policy) {
                setConfig(policy);
            }
        } catch (e) {
            toast.error('Failed to load policy settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateAutonomyPolicy(config);
            toast.success('Policy settings updated');
        } catch (e) {
            toast.error('Failed to update policy');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full text-white/50"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Autonomy Policy</h2>
                    <p className="text-white/50">Configure how the autonomous agent behaves and its safety limits.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--neon-green)] text-black rounded-md hover:opacity-90 transition-all font-medium disabled:opacity-50"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                </button>
            </div>

            {/* Mode Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ModeCard
                    key="OFF"
                    active={config.mode === 'OFF'}
                    onClick={() => setConfig({ ...config, mode: 'OFF' })}
                    title="OFF"
                    description="The agent will not take any actions automatically. Events are ignored or logged only."
                    icon={Shield}
                />
                <ModeCard
                    active={config.mode === 'CONFIRM'}
                    onClick={() => setConfig({ ...config, mode: 'CONFIRM' })}
                    title="Human-in-the-Loop"
                    description="The agent plans actions but requires your explicit approval before executing."
                    icon={AlertTriangle}
                    color="text-yellow-400"
                />
                <ModeCard
                    active={config.mode === 'AUTONOMOUS'}
                    onClick={() => setConfig({ ...config, mode: 'AUTONOMOUS' })}
                    title="Fully Autonomous"
                    description="The agent executes actions automatically within the defined security budgets."
                    icon={Zap}
                    color="text-[var(--neon-green)]"
                />
            </div>

            {/* Budgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Action Limits</h3>

                    <InputGroup label="Max Actions Per Hour">
                        <input
                            type="number"
                            value={config.maxActionsPerHour}
                            onChange={(e) => setConfig({ ...config, maxActionsPerHour: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--neon-green)]"
                        />
                    </InputGroup>

                    <InputGroup label="Max Actions Per Day">
                        <input
                            type="number"
                            value={config.maxActionsPerDay}
                            onChange={(e) => setConfig({ ...config, maxActionsPerDay: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--neon-green)]"
                        />
                    </InputGroup>

                    <InputGroup label="Max Parallel Jobs">
                        <input
                            type="number"
                            value={config.maxParallelJobs}
                            onChange={(e) => setConfig({ ...config, maxParallelJobs: parseInt(e.target.value) })}
                            className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white focus:outline-none focus:border-[var(--neon-green)]"
                        />
                    </InputGroup>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Trigger Sources</h3>

                    <div className="space-y-2">
                        <Checkbox
                            label="Enable Webhooks"
                            checked={config.triggersEnabled.webhook}
                            onChange={(c) => setConfig({ ...config, triggersEnabled: { ...config.triggersEnabled, webhook: c } })}
                        />
                        <Checkbox
                            label="Enable Schedules"
                            checked={config.triggersEnabled.schedule}
                            onChange={(c) => setConfig({ ...config, triggersEnabled: { ...config.triggersEnabled, schedule: c } })}
                        />
                        <Checkbox
                            label="Enable Workflow Completion"
                            checked={config.triggersEnabled.runCompletion}
                            onChange={(c) => setConfig({ ...config, triggersEnabled: { ...config.triggersEnabled, runCompletion: c } })}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Components

const ModeCard = ({ active, onClick, title, description, icon: Icon, color = 'text-white' }: { active: boolean; onClick: () => void; title: string; description: string; icon: any; color?: string }) => (
    <div
        onClick={onClick}
        className={`p-4 rounded-lg border cursor-pointer transition-all ${active
            ? 'bg-white/10 border-[var(--neon-green)]/50 shadow-[0_0_15px_rgba(34,255,100,0.1)]'
            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
            }`}
    >
        <div className="flex items-center gap-2 mb-2">
            <Icon className={color} size={20} />
            <h3 className={`font-bold ${active ? 'text-white' : 'text-white/70'}`}>{title}</h3>
        </div>
        <p className="text-sm text-white/50">{description}</p>
    </div>
);

const InputGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="space-y-1">
        <label className="text-xs text-white/50 uppercase tracking-wider font-medium">{label}</label>
        {children}
    </div>
);

const Checkbox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
    <div
        onClick={() => onChange(!checked)}
        className="flex items-center gap-3 p-3 bg-white/5 rounded-md cursor-pointer hover:bg-white/10 transition-colors"
    >
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${checked ? 'bg-[var(--neon-green)] border-transparent' : 'border-white/20'}`}>
            {checked && <div className="w-2.5 h-2.5 bg-black rounded-sm" />}
        </div>
        <span className="text-sm text-white">{label}</span>
    </div>
);

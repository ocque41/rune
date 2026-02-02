'use client';

import React, { useState, useEffect, useRef } from 'react';
import { updateAutonomyPolicy, getAutonomyPolicy } from '@/app/actions/autonomy';
import { toast } from 'sonner';
import { Loader2, Save, Shield, AlertTriangle, Zap, Bell, Power } from 'lucide-react';
import { AutonomyConfig } from '@/lib/autonomy/policy';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import anime from 'animejs';

export const PolicySettings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const modeGridRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (!modeGridRef.current) return;
        const activeCard = modeGridRef.current.querySelector(`[data-mode="${config.mode}"]`);
        if (!activeCard) return;
        anime({
            targets: activeCard,
            scale: [0.98, 1],
            opacity: [0.9, 1],
            easing: 'easeOutQuad',
            duration: 220
        });
    }, [config.mode]);

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

    const handleKillSwitch = async () => {
        setSaving(true);
        try {
            const nextConfig = { ...config, mode: 'OFF' } as AutonomyConfig;
            await updateAutonomyPolicy(nextConfig);
            setConfig(nextConfig);
            toast.success('Autonomy disabled');
        } catch (e) {
            toast.error('Failed to disable autonomy');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full text-white/50"><Loader2 className="animate-spin" /></div>;
    }

    const modeBadgeVariant: 'default' | 'secondary' | 'outline' = config.mode === 'AUTONOMOUS'
        ? 'default'
        : config.mode === 'CONFIRM'
            ? 'secondary'
            : 'outline';

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <Card className="border-white/10 bg-gradient-to-br from-background/80 via-background to-background/60 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <CardTitle className="text-2xl">Autonomy Policy</CardTitle>
                        <CardDescription>Configure how the autonomous agent behaves and its safety limits.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge variant={modeBadgeVariant} className={cn(
                            "uppercase tracking-wide",
                            config.mode === 'AUTONOMOUS' && "bg-amber-500/20 text-amber-300 border-amber-500/40",
                            config.mode === 'CONFIRM' && "bg-white/10 text-white/70 border-white/20",
                            config.mode === 'OFF' && "border-white/20 text-white/50"
                        )}>
                            {config.mode === 'AUTONOMOUS' ? 'Autonomous' : config.mode === 'CONFIRM' ? 'Confirm' : 'Off'}
                        </Badge>
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Save Changes
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-destructive">
                            <Power size={16} />
                            <CardTitle className="text-base">Emergency Kill Switch</CardTitle>
                        </div>
                        <CardDescription>Immediately disable all autonomy execution until re-enabled.</CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="destructive" disabled={saving || config.mode === 'OFF'} className="gap-2">
                                <Power size={16} />
                                Disable Autonomy
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Disable autonomous execution?</DialogTitle>
                                <DialogDescription>
                                    This will set autonomy to OFF and stop processing new events. You can re-enable it anytime.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" disabled={saving}>Cancel</Button>
                                </DialogClose>
                                <Button variant="destructive" onClick={handleKillSwitch} disabled={saving}>
                                    Disable Now
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
            </Card>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Autonomy Mode</h3>
                        <p className="text-sm text-muted-foreground">Choose how aggressively the agent executes without human approval.</p>
                    </div>
                </div>
                <div ref={modeGridRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <ModeCard
                        dataMode="OFF"
                        active={config.mode === 'OFF'}
                        onClick={() => setConfig({ ...config, mode: 'OFF' })}
                        title="Off"
                        description="No autonomous actions. Events are logged only."
                        icon={Shield}
                    />
                    <ModeCard
                        dataMode="CONFIRM"
                        active={config.mode === 'CONFIRM'}
                        onClick={() => setConfig({ ...config, mode: 'CONFIRM' })}
                        title="Human-in-the-loop"
                        description="Plans are generated, but require your approval to run."
                        icon={AlertTriangle}
                        accent="text-amber-400"
                    />
                    <ModeCard
                        dataMode="AUTONOMOUS"
                        active={config.mode === 'AUTONOMOUS'}
                        onClick={() => setConfig({ ...config, mode: 'AUTONOMOUS' })}
                        title="Fully Autonomous"
                        description="Executes automatically within your defined budgets."
                        icon={Zap}
                        accent="text-primary"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-white/10 bg-card/60">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg">Action Budgets</CardTitle>
                        <CardDescription>Define the maximum execution volume over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatInput
                            label="Max Actions / Hour"
                            value={config.maxActionsPerHour}
                            onChange={(value) => setConfig({ ...config, maxActionsPerHour: value })}
                        />
                        <StatInput
                            label="Max Actions / Day"
                            value={config.maxActionsPerDay}
                            onChange={(value) => setConfig({ ...config, maxActionsPerDay: value })}
                        />
                        <StatInput
                            label="Max Tokens / Hour"
                            value={config.maxTokensPerHour}
                            onChange={(value) => setConfig({ ...config, maxTokensPerHour: value })}
                        />
                        <StatInput
                            label="Max Tokens / Day"
                            value={config.maxTokensPerDay}
                            onChange={(value) => setConfig({ ...config, maxTokensPerDay: value })}
                        />
                        <StatInput
                            label="Parallel Jobs"
                            value={config.maxParallelJobs}
                            onChange={(value) => setConfig({ ...config, maxParallelJobs: value })}
                        />
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <Card className="border-white/10 bg-card/60">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Trigger Sources</CardTitle>
                            <CardDescription>Control which event sources can initiate autonomy.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ToggleRow
                                label="Enable webhooks"
                                checked={config.triggersEnabled.webhook}
                                onChange={(checked) => setConfig({ ...config, triggersEnabled: { ...config.triggersEnabled, webhook: checked } })}
                            />
                            <ToggleRow
                                label="Enable schedules"
                                checked={config.triggersEnabled.schedule}
                                onChange={(checked) => setConfig({ ...config, triggersEnabled: { ...config.triggersEnabled, schedule: checked } })}
                            />
                            <ToggleRow
                                label="Enable workflow completion"
                                checked={config.triggersEnabled.runCompletion}
                                onChange={(checked) => setConfig({ ...config, triggersEnabled: { ...config.triggersEnabled, runCompletion: checked } })}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-card/60">
                        <CardHeader className="pb-4 flex-row items-center gap-2">
                            <Bell className="h-4 w-4 text-muted-foreground" />
                            <div>
                                <CardTitle className="text-lg">Notifications</CardTitle>
                                <CardDescription>Get notified on key autonomy outcomes.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ToggleRow
                                label="Notify on success"
                                checked={config.notifyOnSuccess}
                                onChange={(checked) => setConfig({ ...config, notifyOnSuccess: checked })}
                            />
                            <ToggleRow
                                label="Notify on failure"
                                checked={config.notifyOnFailure}
                                onChange={(checked) => setConfig({ ...config, notifyOnFailure: checked })}
                            />
                            <ToggleRow
                                label="Notify when approval needed"
                                checked={config.notifyOnApprovalNeeded}
                                onChange={(checked) => setConfig({ ...config, notifyOnApprovalNeeded: checked })}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const ModeCard = ({
    active,
    onClick,
    title,
    description,
    icon: Icon,
    accent = 'text-foreground',
    dataMode
}: {
    active: boolean;
    onClick: () => void;
    title: string;
    description: string;
    icon: any;
    accent?: string;
    dataMode: string;
}) => (
    <Card
        data-mode={dataMode}
        onClick={onClick}
        className={cn(
            'cursor-pointer border transition-all h-full',
            active
                ? 'border-primary/40 bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.15)]'
                : 'border-border/60 bg-card/60 hover:bg-muted/30 hover:border-foreground/20'
        )}
    >
        <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
                <Icon className={accent} size={20} />
                <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            {active ? (
                <Badge className="bg-primary/20 text-primary border-primary/30">Selected</Badge>
            ) : (
                <Badge variant="outline" className="border-white/10 text-white/60">Select</Badge>
            )}
        </CardContent>
    </Card>
);

const StatInput = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
    <div className="space-y-2">
        <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
        <Input
            type="number"
            value={value}
            onChange={(e) => onChange(parseInt(e.target.value || '0'))}
            className="bg-muted/40 border-white/10 focus-visible:ring-primary/40"
        />
    </div>
);

const ToggleRow = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) => (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-muted/20 px-4 py-3">
        <span className="text-sm text-foreground">{label}</span>
        <Switch checked={checked} onCheckedChange={onChange} />
    </div>
);

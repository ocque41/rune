'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { StepNodeData } from './nodes/step-node'; // Assuming StepNodeData is exported from step-node

interface ApiConnectorWizardProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    initialHttpRequest: StepNodeData['httpRequest'];
    onSave: (httpRequest: StepNodeData['httpRequest']) => void;
    embedded?: boolean;
    onCancel?: () => void;
}

const ApiConnectorWizard: React.FC<ApiConnectorWizardProps> = ({
    isOpen = false,
    onOpenChange,
    initialHttpRequest,
    onSave,
    embedded = false,
    onCancel,
}) => {
    // Helper for safe parsing
    const safeParseHeaders = (jsonString: string | undefined): Array<{ key: string; value: string }> => {
        if (!jsonString) return [{ key: '', value: '' }];
        try {
            const parsed = JSON.parse(jsonString);
            if (Array.isArray(parsed)) {
                return parsed.map((h: any) => {
                    // Handle ["key", "value"] format
                    if (Array.isArray(h) && h.length >= 2) {
                        return { key: String(h[0]), value: String(h[1]) };
                    }
                    // Handle { key: "key", value: "value" } format (just in case)
                    if (typeof h === 'object' && h !== null && 'key' in h && 'value' in h) {
                        return { key: String(h.key), value: String(h.value) };
                    }
                    return { key: '', value: '' };
                });
            }
            return [{ key: '', value: '' }];
        } catch (e) {
            console.warn('Failed to parse headers JSON:', e);
            return [{ key: '', value: '' }];
        }
    };

    const [currentStep, setCurrentStep] = useState(1);
    const [method, setMethod] = useState(initialHttpRequest?.method || 'GET');
    const [url, setUrl] = useState(initialHttpRequest?.url || '');
    const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
        safeParseHeaders(initialHttpRequest?.headers)
    );
    const [body, setBody] = useState(initialHttpRequest?.body || '');

    useEffect(() => {
        setMethod(initialHttpRequest?.method || 'GET');
        setUrl(initialHttpRequest?.url || '');
        setHeaders(safeParseHeaders(initialHttpRequest?.headers));
        setBody(initialHttpRequest?.body || '');
        setCurrentStep(1); // Reset step when new initial data comes in
    }, [initialHttpRequest]);

    const handleAddHeader = () => {
        setHeaders([...headers, { key: '', value: '' }]);
    };

    const handleRemoveHeader = (index: number) => {
        const newHeaders = [...headers];
        newHeaders.splice(index, 1);
        setHeaders(newHeaders);
    };

    const handleHeaderChange = (index: number, field: 'key' | 'value', value: string) => {
        const newHeaders = [...headers];
        newHeaders[index] = { ...newHeaders[index], [field]: value };
        setHeaders(newHeaders);
    };

    const handleSave = () => {
        const cleanedHeaders = headers.filter(h => h.key.trim() !== '' && h.value.trim() !== '');

        const finalHttpRequest: StepNodeData['httpRequest'] = {
            method,
            url,
            headers: JSON.stringify(cleanedHeaders.map(h => [h.key, h.value])), // Store as stringified array of arrays
            body: body.trim() === '' ? undefined : body,
        };
        onSave(finalHttpRequest);
        if (onOpenChange) {
            onOpenChange(false);
        }
        toast.success('API Request configured!');
    };

    const handleCancel = () => {
        if (embedded) {
            onCancel?.();
            return;
        }
        onOpenChange?.(false);
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1: // Basic Info
                return (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="method">Method</Label>
                            <select
                                id="method"
                                className="w-full rounded-md bg-[#222222] border-none px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={method}
                                onChange={(e) => setMethod(e.target.value as any)}
                            >
                                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="url">URL</Label>
                            <Input
                                id="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://api.example.com/data"
                            />
                        </div>
                    </div>
                );
            case 2: // Headers
                return (
                    <div className="space-y-4">
                        <Label>Headers</Label>
                        {headers.map((header, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    placeholder="Key"
                                    value={header.key}
                                    onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                                />
                                <Input
                                    placeholder="Value"
                                    value={header.value}
                                    onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRemoveHeader(index)}
                                    disabled={headers.length === 1 && headers[0].key === ''}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" onClick={handleAddHeader}>Add Header</Button>
                    </div>
                );
            case 3: // Body
                return (
                    <div className="space-y-4">
                        <Label htmlFor="body">Body (JSON or Plain Text)</Label>
                        <textarea
                            id="body"
                            className="w-full rounded-md bg-[#222222] border-none px-3 py-2 text-sm font-mono text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white/30 min-h-[150px]"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder='{"key": "value"}'
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    const stepsTitles = ['Basic Info', 'Headers', 'Body'];

    const content = (
        <>
            {!embedded ? (
                <DialogHeader>
                    <DialogTitle>API Connector Wizard</DialogTitle>
                    <DialogDescription>Configure your HTTP Request step.</DialogDescription>
                </DialogHeader>
            ) : (
                <div>
                    <h3 className="text-base font-semibold text-[color:var(--title)]">API Connector Wizard</h3>
                    <p className="mt-1 text-sm text-[color:var(--subtitle)]">Guided setup for HTTP request steps.</p>
                </div>
            )}
            <div className={`flex flex-col md:flex-row gap-4 ${embedded ? '' : 'p-4'}`}>
                {/* Step Navigation */}
                <div className="md:w-1/4">
                    <ul className="space-y-2">
                        {stepsTitles.map((title, index) => (
                            <li key={title}>
                                <Button
                                    variant={currentStep === index + 1 ? 'default' : 'ghost'}
                                    onClick={() => setCurrentStep(index + 1)}
                                    className="w-full justify-start"
                                >
                                    Step {index + 1}: {title}
                                </Button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Step Content */}
                <div className="md:w-3/4">
                    {renderStep()}
                </div>
            </div>
            <DialogFooter className={`flex-col sm:flex-row sm:justify-between ${embedded ? '' : 'px-4 pb-4'}`}>
                <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    disabled={currentStep === 1}
                >
                    Previous
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                        {embedded ? 'Close Wizard' : 'Cancel'}
                    </Button>
                    {currentStep < stepsTitles.length && (
                        <Button onClick={() => setCurrentStep(currentStep + 1)}>
                            Next
                        </Button>
                    )}
                    {currentStep === stepsTitles.length && (
                        <Button onClick={handleSave} disabled={!url || (method !== 'GET' && !body)}>
                            Save Configuration
                        </Button>
                    )}
                </div>
            </DialogFooter>
        </>
    );

    if (embedded) {
        return <div className="space-y-4 rounded-lg border border-[color:var(--border-color)] bg-[color:var(--node-background)] p-4">{content}</div>;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl bg-background border-border">
                {content}
            </DialogContent>
        </Dialog>
    );
};

export default ApiConnectorWizard;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/components/ui/drawer';
import { toast } from 'sonner';
import { Trash2, Edit } from 'lucide-react';

interface Secret {
    name: string;
}

interface SecretsManagerDrawerProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const SecretsManagerDrawer: React.FC<SecretsManagerDrawerProps> = ({ isOpen, onOpenChange }) => {
    const [secrets, setSecrets] = useState<Secret[]>([]);
    const [newSecretName, setNewSecretName] = useState('');
    const [newSecretValue, setNewSecretValue] = useState('');
    const [editingSecret, setEditingSecret] = useState<Secret | null>(null);
    const [editingSecretValue, setEditingSecretValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const fetchSecrets = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/rune/secrets');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch secrets');
            }
            const data = await response.json();
            setSecrets(data.secretKeys.map((name: string) => ({ name })));
        } catch (error: any) {
            toast.error(error.message);
            console.error('Fetch secrets error:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchSecrets();
        }
    }, [isOpen, fetchSecrets]);

    const handleCreateSecret = async () => {
        if (!newSecretName || !newSecretValue) {
            toast.error('Secret name and value cannot be empty.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/rune/secrets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSecretName, value: newSecretValue }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create secret');
            }
            toast.success('Secret created successfully!');
            setNewSecretName('');
            setNewSecretValue('');
            fetchSecrets();
        } catch (error: any) {
            toast.error(error.message);
            console.error('Create secret error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSecret = async () => {
        if (!editingSecret || !editingSecretValue) {
            toast.error('Secret value cannot be empty.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch('/api/rune/secrets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editingSecret.name, value: editingSecretValue }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update secret');
            }
            toast.success('Secret updated successfully!');
            setEditingSecret(null);
            setEditingSecretValue('');
            fetchSecrets();
        } catch (error: any) {
            toast.error(error.message);
            console.error('Update secret error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteSecret = async (name: string) => {
        if (!confirm(`Are you sure you want to delete secret '${name}'?`)) return;
        setIsLoading(true);
        try {
            const response = await fetch('/api/rune/secrets', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete secret');
            }
            toast.success('Secret deleted successfully!');
            fetchSecrets();
        } catch (error: any) {
            toast.error(error.message);
            console.error('Delete secret error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const startEditingSecret = (secret: Secret) => {
        setEditingSecret(secret);
        setEditingSecretValue(''); // Value is never exposed, so start empty
    };

    return (
        <Drawer open={isOpen} onOpenChange={onOpenChange}>
            <DrawerContent className="h-[90vh] flex flex-col">
                <DrawerHeader>
                    <DrawerTitle>Manage Secrets</DrawerTitle>
                    <DrawerDescription>Securely store and manage your workflow secrets.</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 overflow-auto flex-1">
                    <h3 className="text-lg font-semibold mb-4">Add New Secret</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                        <div>
                            <Label htmlFor="new-secret-name">Secret Name</Label>
                            <Input
                                id="new-secret-name"
                                value={newSecretName}
                                onChange={(e) => setNewSecretName(e.target.value)}
                                placeholder="MY_API_KEY"
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <Label htmlFor="new-secret-value">Secret Value</Label>
                            <Input
                                id="new-secret-value"
                                type="password"
                                value={newSecretValue}
                                onChange={(e) => setNewSecretValue(e.target.value)}
                                placeholder="Paste the secret value"
                                disabled={isLoading}
                                autoComplete="off"
                            />
                        </div>
                    </div>
                    <Button onClick={handleCreateSecret} disabled={isLoading || !newSecretName || !newSecretValue}>
                        {isLoading ? 'Creating...' : 'Create Secret'}
                    </Button>

                    <h3 className="text-lg font-semibold mt-8 mb-4">Existing Secrets</h3>
                    {secrets.length === 0 && !isLoading ? (
                        <p className="text-muted-foreground">No secrets found. Create one above!</p>
                    ) : (
                        <div className="space-y-4">
                            {secrets.map((secret) => (
                                <div key={secret.name} className="flex items-center justify-between p-3 border rounded-md">
                                    <span className="font-mono text-sm">{secret.name}</span>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => startEditingSecret(secret)}
                                            disabled={isLoading}
                                            aria-label={`Edit secret ${secret.name}`}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDeleteSecret(secret.name)}
                                            disabled={isLoading}
                                            aria-label={`Delete secret ${secret.name}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <DrawerFooter>
                    <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>

            {/* Edit Secret Drawer/Modal */}
            {editingSecret && (
                <Drawer open={!!editingSecret} onOpenChange={(open) => !open && setEditingSecret(null)}>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Edit Secret: {editingSecret.name}</DrawerTitle>
                            <DrawerDescription>Update the value for this secret.</DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4">
                            <div className="mb-4">
                                <Label htmlFor="edit-secret-value">Secret Value</Label>
                                <Input
                                    id="edit-secret-value"
                                    type="password"
                                    value={editingSecretValue}
                                    onChange={(e) => setEditingSecretValue(e.target.value)}
                                    placeholder="Paste replacement value"
                                    disabled={isLoading}
                                    autoComplete="off"
                                />
                            </div>
                            <Button onClick={handleUpdateSecret} disabled={isLoading || !editingSecretValue}>
                                {isLoading ? 'Updating...' : 'Update Secret'}
                            </Button>
                        </div>
                        <DrawerFooter>
                            <DrawerClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            )}
        </Drawer>
    );
};

export default SecretsManagerDrawer;

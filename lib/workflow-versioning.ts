import { createClient } from '@/lib/supabase/client';

export function generateVersionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function createWorkflowVersion(workflowId: string, versionId: string, code: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('workflow_versions')
    .insert({
      id: versionId,
      workflow_id: workflowId,
      code: code,
      created_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error creating workflow version:', error);
    throw error;
  }
}

export async function saveWorkflowVersion(workflowId: string, versionId: string, code: string): Promise<void> {
  return createWorkflowVersion(workflowId, versionId, code);
}

export async function updateWorkflowMetadata(workflowId: string, versionId: string, isActive: boolean): Promise<void> {
  const supabase = createClient();
  const updates: any = {
    updated_at: new Date().toISOString()
  };
  
  if (isActive) {
    updates.active_version_id = versionId;
  }

  const { error } = await supabase
    .from('workflows')
    .update(updates)
    .eq('id', workflowId);

  if (error) {
    console.error('Error updating workflow metadata:', error);
    throw error;
  }
}

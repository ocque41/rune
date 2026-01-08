-- Enable RLS on all tables
ALTER TABLE rune_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_agent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_mcp_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_agent_tool_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_user_templates ENABLE ROW LEVEL SECURITY;

-- Helper macro not possible in pure SQL file easily, repeating policies.

-- 1. rune_workflows
CREATE POLICY "workflows_select_policy" ON rune_workflows FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "workflows_insert_policy" ON rune_workflows FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "workflows_update_policy" ON rune_workflows FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "workflows_delete_policy" ON rune_workflows FOR DELETE USING (auth.uid() = user_id);

-- 2. rune_workflow_versions (Child of rune_workflows)
-- Users can view versions of their workflows
CREATE POLICY "workflow_versions_select_policy" ON rune_workflow_versions FOR SELECT USING (
    EXISTS (SELECT 1 FROM rune_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid())
);
-- Insert/Update typically handled by system, but allow if user owns parent
CREATE POLICY "workflow_versions_insert_policy" ON rune_workflow_versions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rune_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid())
);
-- Versions should be immutable? Update strictly restricted? 
-- Admin can bypass. Users probably shouldn't update versions. But let's allow if they own it for now.
CREATE POLICY "workflow_versions_update_policy" ON rune_workflow_versions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM rune_workflows w WHERE w.id = workflow_id AND w.user_id = auth.uid())
);

-- 3. rune_workflow_runs (Direct Ownership)
CREATE POLICY "runs_select_policy" ON rune_workflow_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "runs_insert_policy" ON rune_workflow_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "runs_update_policy" ON rune_workflow_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "runs_delete_policy" ON rune_workflow_runs FOR DELETE USING (auth.uid() = user_id);

-- 4. rune_run_steps (Direct Ownership)
CREATE POLICY "run_steps_select_policy" ON rune_run_steps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "run_steps_insert_policy" ON rune_run_steps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "run_steps_update_policy" ON rune_run_steps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "run_steps_delete_policy" ON rune_run_steps FOR DELETE USING (auth.uid() = user_id);

-- 5. rune_agent_profiles (Direct Ownership)
CREATE POLICY "agent_profiles_select_policy" ON rune_agent_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_profiles_insert_policy" ON rune_agent_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_profiles_update_policy" ON rune_agent_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_profiles_delete_policy" ON rune_agent_profiles FOR DELETE USING (auth.uid() = user_id);

-- 6. rune_mcp_servers (Direct Ownership)
CREATE POLICY "mcp_servers_select_policy" ON rune_mcp_servers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mcp_servers_insert_policy" ON rune_mcp_servers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mcp_servers_update_policy" ON rune_mcp_servers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mcp_servers_delete_policy" ON rune_mcp_servers FOR DELETE USING (auth.uid() = user_id);

-- 7. rune_mcp_tools (Child of rune_mcp_servers)
CREATE POLICY "mcp_tools_select_policy" ON rune_mcp_tools FOR SELECT USING (
    EXISTS (SELECT 1 FROM rune_mcp_servers s WHERE s.id = server_id AND s.user_id = auth.uid())
);
CREATE POLICY "mcp_tools_insert_policy" ON rune_mcp_tools FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM rune_mcp_servers s WHERE s.id = server_id AND s.user_id = auth.uid())
);
CREATE POLICY "mcp_tools_update_policy" ON rune_mcp_tools FOR UPDATE USING (
    EXISTS (SELECT 1 FROM rune_mcp_servers s WHERE s.id = server_id AND s.user_id = auth.uid())
);
CREATE POLICY "mcp_tools_delete_policy" ON rune_mcp_tools FOR DELETE USING (
    EXISTS (SELECT 1 FROM rune_mcp_servers s WHERE s.id = server_id AND s.user_id = auth.uid())
);

-- 8. rune_agent_tool_bindings (Child of rune_agent_profiles)
CREATE POLICY "agent_tool_bindings_select_policy" ON rune_agent_tool_bindings FOR SELECT USING (
    EXISTS (SELECT 1 FROM rune_agent_profiles p WHERE p.id = agent_profile_id AND p.user_id = auth.uid())
);
CREATE POLICY "agent_tool_bindings_all_policy" ON rune_agent_tool_bindings FOR ALL USING (
    EXISTS (SELECT 1 FROM rune_agent_profiles p WHERE p.id = agent_profile_id AND p.user_id = auth.uid())
);

-- 9. rune_idempotency_keys (Direct Ownership)
CREATE POLICY "idempotency_keys_all_policy" ON rune_idempotency_keys FOR ALL USING (auth.uid() = user_id);

-- 10. rune_conversations (Direct Ownership)
CREATE POLICY "conversations_all_policy" ON rune_conversations FOR ALL USING (auth.uid() = user_id);

-- 11. rune_conversation_messages (Child of rune_conversations)
CREATE POLICY "messages_all_policy" ON rune_conversation_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM rune_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
);

-- 12. rune_artifacts (Direct Ownership)
CREATE POLICY "artifacts_all_policy" ON rune_artifacts FOR ALL USING (auth.uid() = user_id);

-- 13. rune_user_templates (Direct Ownership)
CREATE POLICY "user_templates_all_policy" ON rune_user_templates FOR ALL USING (auth.uid() = user_id);

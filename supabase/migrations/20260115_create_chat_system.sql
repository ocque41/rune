-- Agent Chat System Tables
-- Migration: 20260115_create_chat_system.sql

-- Chats: One chat per workflow session
CREATE TABLE IF NOT EXISTS rune_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES rune_workflows(id) ON DELETE SET NULL,
    title TEXT DEFAULT 'New Chat',
    is_temporary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS rune_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES rune_chats(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT,
    tool_calls JSONB,
    tool_call_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Pending messages for proactive agent
CREATE TABLE IF NOT EXISTS rune_pending_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chat_id UUID REFERENCES rune_chats(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES rune_workflows(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification preferences
CREATE TABLE IF NOT EXISTS rune_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    email_address TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON rune_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_workflow_id ON rune_chats(workflow_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON rune_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_pending_messages_user_id ON rune_pending_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_messages_scheduled ON rune_pending_messages(scheduled_for) WHERE sent_at IS NULL;

-- RLS Policies
ALTER TABLE rune_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_pending_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own chats" ON rune_chats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own messages via chat" ON rune_chat_messages
    FOR ALL USING (chat_id IN (SELECT id FROM rune_chats WHERE user_id = auth.uid()));

CREATE POLICY "Users own pending messages" ON rune_pending_messages
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own notification prefs" ON rune_notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Add agent_config to workflows
ALTER TABLE rune_workflows ADD COLUMN IF NOT EXISTS 
    agent_config JSONB DEFAULT '{"systemPrompt": null, "tools": [], "model": "gpt-4-turbo", "temperature": 0.7}'::jsonb;

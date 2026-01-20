-- Migration: Fix RLS policies for Chat Deletion
-- Date: 2026-01-20
-- Purpose: Ensure users can delete their own chats and cascade delete works reliably

-- 1. rune_chats Policies
DROP POLICY IF EXISTS "Users own chats" ON rune_chats;
DROP POLICY IF EXISTS "Users can delete own chats" ON rune_chats; -- Remove any specific delete policies

-- Re-create the main policy for chats
-- Note: 'FOR ALL' covers SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "Users own chats" ON rune_chats
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- 2. rune_chat_messages Policies
DROP POLICY IF EXISTS "Users own messages via chat" ON rune_chat_messages;

-- Re-create the main policy for messages
CREATE POLICY "Users own messages via chat" ON rune_chat_messages
    FOR ALL
    USING (
        exists (
            select 1 from rune_chats 
            where id = rune_chat_messages.chat_id 
            and user_id = auth.uid()
        )
    )
    WITH CHECK (
        exists (
            select 1 from rune_chats 
            where id = rune_chat_messages.chat_id 
            and user_id = auth.uid()
        )
    );

-- 3. Ensure RLS is enabled
ALTER TABLE rune_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create enum for approval status
DO $$ BEGIN
    CREATE TYPE tool_approval_status AS ENUM ('pending', 'approved', 'rejected', 'auto_approved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add approval columns to chat messages
ALTER TABLE public.rune_chat_messages 
ADD COLUMN IF NOT EXISTS approval_status tool_approval_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS approval_metadata JSONB DEFAULT '{}'::jsonb; -- Who approved it, when, etc.

-- Index for finding pending approvals
CREATE INDEX IF NOT EXISTS idx_messages_approval_status ON public.rune_chat_messages(approval_status) 
WHERE approval_status = 'pending';

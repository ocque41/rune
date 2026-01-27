-- Add tool_calls column to chat messages for reliable history
ALTER TABLE public.rune_chat_messages 
ADD COLUMN IF NOT EXISTS tool_calls JSONB DEFAULT NULL;

-- Add index for debugging/performance
CREATE INDEX IF NOT EXISTS idx_messages_tool_calls ON public.rune_chat_messages USING gin(tool_calls);

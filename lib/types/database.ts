export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            rune_chats: {
                Row: {
                    id: string
                    user_id: string
                    workflow_id: string | null
                    title: string
                    is_temporary: boolean
                    created_at: string
                    updated_at: string
                    last_message_at: string
                    archived_at: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string
                    workflow_id?: string | null
                    title?: string
                    is_temporary?: boolean
                    created_at?: string
                    updated_at?: string
                    last_message_at?: string
                    archived_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    workflow_id?: string | null
                    title?: string
                    is_temporary?: boolean
                    created_at?: string
                    updated_at?: string
                    last_message_at?: string
                    archived_at?: string | null
                }
            }
            rune_chat_messages: {
                Row: {
                    id: string
                    chat_id: string
                    user_id: string
                    role: string
                    content: string | null
                    tool_calls: Json | null
                    tool_results: Json | null
                    usage_metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    chat_id: string
                    user_id?: string // Handled by RLS/Trigger or explicit
                    role: string
                    content?: string | null
                    tool_calls?: Json | null
                    tool_results?: Json | null
                    usage_metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    chat_id?: string
                    user_id?: string
                    role?: string
                    content?: string | null
                    tool_calls?: Json | null
                    tool_results?: Json | null
                    usage_metadata?: Json | null
                    created_at?: string
                }
            }
        }
    }
}

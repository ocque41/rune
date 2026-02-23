import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';

export type Chat = Database['public']['Tables']['rune_chats']['Row'];
export type ChatInsert = Database['public']['Tables']['rune_chats']['Insert'];
export type ChatUpdate = Database['public']['Tables']['rune_chats']['Update'];

export type Message = Database['public']['Tables']['rune_chat_messages']['Row'];
export type MessageInsert = Database['public']['Tables']['rune_chat_messages']['Insert'];

export class AgentDB {
    constructor(private supabase: SupabaseClient<Database>) { }

    // --- Chats ---

    async listChats(workflowId: string): Promise<Chat[]> {
        const { data, error } = await this.supabase
            .from('rune_chats')
            .select('*')
            .eq('workflow_id', workflowId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getChat(chatId: string): Promise<Chat | null> {
        const { data, error } = await this.supabase
            .from('rune_chats')
            .select('*')
            .eq('id', chatId)
            .single();

        if (error) return null;
        return data;
    }

    async createChat(userId: string, workflowId: string, title: string = 'New Chat'): Promise<Chat> {
        const payload: ChatInsert = {
            user_id: userId,
            workflow_id: workflowId,
            title: title
        };

        const { data, error } = await this.supabase
            .from('rune_chats')
            // @ts-ignore
            .insert(payload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async renameChat(chatId: string, title: string): Promise<void> {
        const payload: ChatUpdate = { title, updated_at: new Date().toISOString() };
        const { error } = await this.supabase
            .from('rune_chats')
            // @ts-ignore
            .update(payload)
            .eq('id', chatId);

        if (error) throw error;
    }

    async deleteChat(chatId: string): Promise<void> {
        const { error } = await this.supabase
            .from('rune_chats')
            .delete()
            .eq('id', chatId);

        if (error) throw error;
    }

    // --- Messages ---

    async getFormatMessages(chatId: string, limit: number = 50): Promise<Message[]> {
        const { data, error } = await this.supabase
            .from('rune_chat_messages')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async appendUserMessage(
        userId: string,
        chatId: string,
        content: string
    ): Promise<Message> {
        // Update chat timestamp
        const chatUpdate: ChatUpdate = { updated_at: new Date().toISOString() };
        await this.supabase
            .from('rune_chats')
            // @ts-ignore
            .update(chatUpdate)
            .eq('id', chatId);

        // Add message
        const msgPayload: MessageInsert = {
            chat_id: chatId,
            role: 'user',
            content: content
        };

        const { data, error } = await this.supabase
            .from('rune_chat_messages')
            // @ts-ignore
            .insert(msgPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async appendAssistantMessage(
        userId: string,
        chatId: string,
        content: string,
        usageMetadata?: any,
        toolCalls?: any[]
    ): Promise<Message> {
        // Update chat timestamp
        const chatUpdate: ChatUpdate = { updated_at: new Date().toISOString() };
        await this.supabase
            .from('rune_chats')
            // @ts-ignore
            .update(chatUpdate)
            .eq('id', chatId);

        const msgPayload: MessageInsert = {
            chat_id: chatId,
            role: 'assistant',
            content: content,
            tool_calls: toolCalls || null
        };

        const { data, error } = await this.supabase
            .from('rune_chat_messages')
            // @ts-ignore
            .insert(msgPayload)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

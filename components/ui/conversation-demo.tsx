"use client"

import * as React from "react"
import {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
} from "@/components/ui/conversation"
import { Button } from "@/components/ui/button"

export function ConversationDemo() {
    const [messages, setMessages] = React.useState<{ id: string; content: string }[]>([])

    const addMessage = () => {
        setMessages((prev) => [
            ...prev,
            {
                id: Math.random().toString(),
                content: `Message ${prev.length + 1} - This is a new message to demonstrate scrolling`,
            },
        ])
    }

    return (
        <div className="flex h-[400px] flex-col gap-4 border rounded-md p-4">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold">Chat Demo</h3>
                <Button onClick={addMessage} size="sm">Add Message</Button>
            </div>

            <div className="flex-1 overflow-hidden border rounded-md bg-background">
                <Conversation>
                    <ConversationContent>
                        {messages.length === 0 ? (
                            <ConversationEmptyState
                                title="No messages yet"
                                description="Click 'Add Message' to start the conversation"
                            />
                        ) : (
                            messages.map((message) => (
                                <div key={message.id} className="p-3 bg-muted/50 rounded-lg">
                                    {message.content}
                                </div>
                            ))
                        )}
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
            </div>
        </div>
    )
}

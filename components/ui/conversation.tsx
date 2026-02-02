"use client"

import * as React from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"
import { Button, type ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ArrowDown, MessageSquare } from "lucide-react"

const Conversation = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<typeof StickToBottom> & { className?: string }
>(({ className, initial = "smooth", resize = "smooth", ...props }, ref) => (
    <StickToBottom
        ref={ref}
        className={cn("relative h-full w-full overflow-hidden", className)}
        initial={initial}
        resize={resize}
        {...props}
    />
))
Conversation.displayName = "Conversation"

const ConversationContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<typeof StickToBottom.Content> & { className?: string }
>(({ className, ...props }, ref) => (
    <StickToBottom.Content
        ref={ref}
        className={cn("flex flex-col gap-4 p-4", className)}
        {...props}
    />
))
ConversationContent.displayName = "ConversationContent"

const ConversationEmptyState = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        title?: string
        description?: string
        icon?: React.ReactNode
    }
>(({ className, title = "No messages yet", description, icon, children, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex h-full min-h-[200px] flex-col items-center justify-center space-y-2 text-center text-muted-foreground",
            className
        )}
        {...props}
    >
        {children || (
            <>
                {icon || <MessageSquare className="h-10 w-10 opacity-50" />}
                <h3 className="font-semibold">{title}</h3>
                {description && <p className="text-sm">{description}</p>}
            </>
        )}
    </div>
))
ConversationEmptyState.displayName = "ConversationEmptyState"

const ConversationScrollButton = React.forwardRef<
    HTMLButtonElement,
    ButtonProps & { className?: string }
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
    const { isAtBottom, scrollToBottom } = useStickToBottomContext()
    const [isVisible, setIsVisible] = React.useState(false)

    React.useEffect(() => {
        if (isAtBottom) {
            setIsVisible(false)
        } else {
            setIsVisible(true)
        }
    }, [isAtBottom])

    if (!isVisible && isAtBottom) return null

    return (
        <Button
            ref={ref}
            variant={variant}
            size={size}
            className={cn(
                "absolute bottom-4 right-4 z-10 rounded-full shadow-md transition-all duration-300",
                isAtBottom ? "translate-y-10 opacity-0" : "translate-y-0 opacity-100",
                className
            )}
            onClick={() => scrollToBottom()}
            {...props}
        >
            <ArrowDown className="h-4 w-4" />
        </Button>
    )
})
ConversationScrollButton.displayName = "ConversationScrollButton"

export {
    Conversation,
    ConversationContent,
    ConversationEmptyState,
    ConversationScrollButton,
}

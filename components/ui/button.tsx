import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md border text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-45",
    {
        variants: {
            variant: {
                default: "border-white/20 bg-white/90 text-black hover:bg-white",
                brand: "border-white/25 bg-white/85 text-black rounded-full uppercase tracking-wide hover:bg-white",
                destructive:
                    "border-white/25 bg-[color:var(--metric-chip-strong)] text-white hover:bg-[color:var(--metric-surface-3)]",
                outline:
                    "border-white/16 bg-[color:var(--metric-surface-1)] text-white/80 hover:bg-[color:var(--metric-surface-2)] hover:text-white",
                secondary:
                    "border-white/14 bg-[color:var(--metric-surface-2)] text-white/85 hover:bg-[color:var(--metric-surface-3)]",
                node: "border-white/16 bg-[color:var(--metric-surface-2)] text-white/85 hover:bg-[color:var(--metric-surface-3)]",
                ghost: "border-transparent bg-transparent text-white/70 hover:border-white/14 hover:bg-[color:var(--metric-surface-2)] hover:text-white",
                link: "border-transparent p-0 text-white/80 underline-offset-4 hover:text-white hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-md px-3",
                lg: "h-11 rounded-md px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    hint?: React.ReactNode
    hintSide?: React.ComponentPropsWithoutRef<typeof TooltipContent>["side"]
    hintClassName?: string
}

function getNodeText(node: React.ReactNode): string {
    if (node === null || node === undefined || typeof node === "boolean") return ""
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(getNodeText).join(" ").trim()
    if (React.isValidElement(node)) {
        const elementProps = node.props as { children?: React.ReactNode }
        return getNodeText(elementProps.children)
    }
    return ""
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, hint, hintSide = "top", hintClassName, title, children, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        const readableLabel = getNodeText(children).replace(/\s+/g, " ").trim()
        const computedTitle =
            title
            ?? (typeof props["aria-label"] === "string" ? props["aria-label"] : undefined)
            ?? (readableLabel.length ? readableLabel : undefined)

        const buttonNode = (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                title={computedTitle}
                {...props}
            >
                {children}
            </Comp>
        )

        if (!hint) return buttonNode

        return (
            <Tooltip>
                <TooltipTrigger asChild>{buttonNode}</TooltipTrigger>
                <TooltipContent side={hintSide} className={hintClassName}>
                    {hint}
                </TooltipContent>
            </Tooltip>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }

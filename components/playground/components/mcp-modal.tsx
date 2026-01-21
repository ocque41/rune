"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plug, Server, Database, FileText, Plus, Trash2, Command, Terminal, Globe, Key, AlertCircle, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { getMcpServers, addMcpServer, deleteMcpServer, toggleMcpServerConnection, McpServer } from "@/app/actions/mcp"
import { toast } from "sonner"
import { animate, stagger } from 'animejs'
import { cn } from "@/lib/utils"

export function McpModal() {
    const [servers, setServers] = useState<McpServer[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("list")
    const listRef = useRef<HTMLDivElement>(null)

    // New Server State
    const [newServer, setNewServer] = useState({
        name: '',
        type: 'sse' as const,
        url: '',
        env: [] as { key: string, value: string }[]
    })
    const [isVerifying, setIsVerifying] = useState(false)

    useEffect(() => {
        loadServers()
    }, [])

    useEffect(() => {
        if (activeTab === 'list' && listRef.current && servers.length > 0) {
            // @ts-ignore
            animate(listRef.current.children, {
                opacity: [0, 1],
                translateY: [20, 0],
                delay: stagger(100),
                easing: 'easeOutExpo',
                duration: 600
            })
        }
    }, [activeTab, servers])

    const loadServers = async () => {
        try {
            const data = await getMcpServers()
            setServers(data)
        } catch (error) {
            toast.error("Failed to load MCP servers")
        } finally {
            setIsLoading(false)
        }
    }

    const handleToggleServer = async (id: string, currentStatus: string) => {
        try {
            const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected'

            // Optimistic update
            setServers(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))

            await toggleMcpServerConnection(id, currentStatus)
            toast.success(newStatus === 'connected' ? 'Server connected' : 'Server disconnected')
        } catch (error) {
            // Revert on error
            toast.error("Failed to update connection")
            loadServers()
        }
    }

    const handleDeleteServer = async (id: string) => {
        try {
            await deleteMcpServer(id)
            setServers(prev => prev.filter(s => s.id !== id))
            toast.success("Server removed")
        } catch (error) {
            toast.error("Failed to delete server")
        }
    }

    // Form Handlers

    const handleAddEnv = () => setNewServer({ ...newServer, env: [...newServer.env, { key: '', value: '' }] })
    const handleEnvChange = (index: number, field: 'key' | 'value', value: string) => {
        const newEnv = [...newServer.env]
        newEnv[index] = { ...newEnv[index], [field]: value }
        setNewServer({ ...newServer, env: newEnv })
    }
    const removeEnv = (index: number) => {
        setNewServer({ ...newServer, env: newServer.env.filter((_, i) => i !== index) })
    }

    const handleSaveServer = async () => {
        if (!newServer.name || !newServer.url) return
        setIsVerifying(true)

        try {
            const envObject = newServer.env.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {})

            await addMcpServer({
                name: newServer.name,
                type: 'sse',
                url: newServer.url,
                env: envObject
            })

            toast.success("Server added successfully")
            setActiveTab("list")
            loadServers()
            // Reset form
            setNewServer({ name: '', type: 'sse', url: '', env: [] })
        } catch (error) {
            toast.error("Failed to add server. Check connection details.")
        } finally {
            setIsVerifying(false)
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50 group">
                    <Plug className="h-3.5 w-3.5 group-hover:text-white transition-colors" />
                    MCP Extension
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] bg-[#0A0A0A]/95 backdrop-blur-xl border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto text-white">
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-lg">
                    <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,theme(colors.white/0.03),transparent_50%)]" />
                </div>

                <DialogHeader className="relative z-10">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
                        <div className="p-1.5 rounded-lg bg-white/10 border border-white/20">
                            <Plug className="h-5 w-5 text-white" />
                        </div>
                        MCP Intelligence Gateway
                    </DialogTitle>
                    <DialogDescription className="text-white/50 text-xs">
                        Connect external tools and context providers to the agent runtime.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative z-10">
                    <TabsList className="grid w-full grid-cols-2 bg-white/5 border border-white/5 p-1">
                        <TabsTrigger value="list" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Active Servers</TabsTrigger>
                        <TabsTrigger value="add" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Add Server</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-4 py-4 min-h-[300px]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-[200px] text-white/50">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        ) : servers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[200px] text-white/30 gap-2 border border-dashed border-white/10 rounded-xl bg-white/5">
                                <Server className="h-8 w-8 opacity-50" />
                                <p className="text-sm">No servers connected</p>
                                <Button variant="link" onClick={() => setActiveTab('add')} className="text-white h-auto p-0 text-xs hover:text-white/80">
                                    Add your first server
                                </Button>
                            </div>
                        ) : (
                            <div ref={listRef} className="grid gap-3">
                                {servers.map((server) => (
                                    <div key={server.id} className="group relative flex flex-col gap-3 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-all overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2.5 rounded-lg border",
                                                    server.status === 'connected'
                                                        ? "bg-white/10 border-white/20 text-white"
                                                        : "bg-white/5 border-white/10 text-white/40"
                                                )}>
                                                    <Terminal className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Label className="text-base font-medium text-white/90">{server.name}</Label>
                                                        <span className={cn("flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-mono font-medium tracking-wide uppercase border",
                                                            server.status === 'connected'
                                                                ? "bg-white/10 text-white border-white/20"
                                                                : "bg-red-500/10 text-red-500 border-red-500/20"
                                                        )}>
                                                            <span className={cn("h-1.5 w-1.5 rounded-full",
                                                                server.status === 'connected' ? "bg-white animate-pulse" : "bg-red-500"
                                                            )} />
                                                            {server.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-white/40 font-mono mt-1 opacity-70">
                                                        {server.server_type === 'stdio' ? 'STDIO Process' : 'SSE Stream'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={server.status === 'connected'}
                                                    onCheckedChange={() => handleToggleServer(server.id, server.status as string)}
                                                    className="data-[state=checked]:bg-white"
                                                />
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-white/30 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDeleteServer(server.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {server.rune_mcp_tools && server.rune_mcp_tools.length > 0 && (
                                            <div className="relative z-10 pt-3 border-t border-white/5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {server.rune_mcp_tools.map(tool => (
                                                        <span key={tool.id} className="flex items-center gap-1 text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded text-white/70 font-mono">
                                                            <div className="h-1 w-1 rounded-full bg-white/50" />
                                                            {tool.tool_name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {server.error_message && (
                                            <div className="relative z-10 pt-2 text-[10px] text-red-400 flex items-center gap-2">
                                                <AlertCircle className="h-3 w-3" />
                                                {server.error_message}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="add" className="space-y-4 py-4">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label className="text-white/80 text-xs">Server Name</Label>
                                <Input
                                    className="bg-white/5 border-white/10 text-white focus:border-white/50"
                                    placeholder="e.g. Production DB"
                                    value={newServer.name}
                                    onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label className="text-white/80 text-xs">Server URL</Label>
                                <div className="relative">
                                    <Globe className="absolute left-2 top-2.5 h-4 w-4 text-white/30" />
                                    <Input
                                        className="pl-8 font-mono text-xs bg-white/5 border-white/10 text-white focus:border-white/50"
                                        placeholder="https://api.example.com/sse"
                                        value={newServer.url}
                                        onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="p-3 rounded-md bg-white/5 border border-white/10 text-white/60 text-[11px] flex items-start gap-2">
                                <Globe className="h-3.5 w-3.5 mt-0.5 flex-none" />
                                <p>
                                    Only <strong>SSE</strong> (Server-Sent Events) connections are supported in production.
                                    Local processes (stdio) are disabled.
                                </p>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/10">
                                <Label className="text-white/80 text-xs">Environment Variables</Label>
                                <div className="space-y-2">
                                    {newServer.env.map((env, i) => (
                                        <div key={i} className="flex gap-2">
                                            <Input
                                                className="font-mono text-xs flex-1 bg-white/5 border-white/10 text-white focus:border-white/50"
                                                placeholder="KEY"
                                                value={env.key}
                                                onChange={(e) => handleEnvChange(i, 'key', e.target.value)}
                                            />
                                            <Input
                                                className="font-mono text-xs flex-1 bg-white/5 border-white/10 text-white focus:border-white/50"
                                                placeholder="VALUE"
                                                type="password"
                                                value={env.value}
                                                onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                                            />
                                            <Button size="icon" variant="ghost" onClick={() => removeEnv(i)} className="text-white/50 hover:text-white">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button size="sm" variant="outline" className="w-full text-xs border-dashed border-white/20 bg-transparent text-white/60 hover:text-white hover:border-white/30" onClick={handleAddEnv}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Environment Variable
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                className="w-full h-10 gap-2 transition-all bg-white text-black hover:bg-white/90 font-medium"
                                onClick={handleSaveServer}
                                disabled={isVerifying || !newServer.name || !newServer.url}
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verifying Connection...
                                    </>
                                ) : (
                                    <>
                                        Test Connection & Save
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

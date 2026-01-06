"use client"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Plug, Server, Database, FileText, Plus, Trash2, Command, Terminal, Globe, Key } from "lucide-react"
import { useState } from "react"

export function McpModal() {
    // Mock State for MCP Servers
    const [servers, setServers] = useState([
        { id: 'filesystem', name: 'Filesystem', type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'], env: {}, icon: FileText, connected: true, tools: ['list_dir', 'read_file', 'write_file', 'search_files'] },
        { id: 'postgres', name: 'Postgres DB', type: 'stdio', command: 'docker', args: ['run', '-i', '--rm', 'mcp/postgres'], env: { POSTGRES_URL: 'postgresql://...' }, icon: Database, connected: false, tools: ['execute_query', 'list_tables', 'describe_table'] },
        { id: 'brave', name: 'Brave Search', type: 'sse', url: 'https://mcp-proxy.brave.com/sse', env: { BRAVE_API_KEY: 'BS...' }, icon: Globe, connected: true, tools: ['search_web', 'get_weather'] },
    ])

    const toggleServer = (id: string) => {
        setServers(servers.map(s =>
            s.id === id ? { ...s, connected: !s.connected } : s
        ))
    }

    // New Server State
    const [newServer, setNewServer] = useState({
        name: '',
        type: 'stdio',
        command: '',
        url: '',
        args: [''],
        env: [] as { key: string, value: string }[]
    })

    // UI States
    const [isVerifying, setIsVerifying] = useState(false)
    const [activeTab, setActiveTab] = useState("list")

    const handleAddArg = () => setNewServer({ ...newServer, args: [...newServer.args, ''] })
    const handleArgChange = (index: number, value: string) => {
        const newArgs = [...newServer.args]
        newArgs[index] = value
        setNewServer({ ...newServer, args: newArgs })
    }
    const removeArg = (index: number) => {
        setNewServer({ ...newServer, args: newServer.args.filter((_, i) => i !== index) })
    }

    const handleAddEnv = () => setNewServer({ ...newServer, env: [...newServer.env, { key: '', value: '' }] })
    const handleEnvChange = (index: number, field: 'key' | 'value', value: string) => {
        const newEnv = [...newServer.env]
        newEnv[index] = { ...newEnv[index], [field]: value }
        setNewServer({ ...newServer, env: newEnv })
    }
    const removeEnv = (index: number) => {
        setNewServer({ ...newServer, env: newServer.env.filter((_, i) => i !== index) })
    }

    const generateMockTools = (name: string) => {
        const n = name.toLowerCase()
        if (n.includes('git')) return ['git_status', 'git_commit', 'git_push', 'git_log']
        if (n.includes('github')) return ['create_issue', 'list_prs', 'get_repo']
        if (n.includes('linear')) return ['create_issue', 'get_issue', 'update_status']
        if (n.includes('slack')) return ['send_message', 'list_channels', 'read_history']
        return ['custom_tool_run', 'get_status', 'execute_command']
    }

    const handleSaveServer = async () => {
        if (!newServer.name) return

        setIsVerifying(true)

        // Simulate Verification Delay
        await new Promise(resolve => setTimeout(resolve, 1500))

        const id = newServer.name.toLowerCase().replace(/\s+/g, '-')
        const serverConfig = {
            id,
            name: newServer.name,
            type: newServer.type,
            ...(newServer.type === 'stdio' ? { command: newServer.command, args: newServer.args.filter(a => a) } : { url: newServer.url }),
            env: newServer.env.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}),
            icon: Terminal,
            connected: true,
            tools: generateMockTools(newServer.name)
        }

        // @ts-ignore
        setServers([...servers, serverConfig])
        setIsVerifying(false)
        setActiveTab("list")

        // Reset form
        setNewServer({ name: '', type: 'stdio', command: '', url: '', args: [''], env: [] })
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent/50">
                    <Plug className="h-3.5 w-3.5" />
                    MCP
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-background/95 backdrop-blur-xl border-border/60 shadow-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-medium">
                        <Plug className="h-5 w-5 text-primary" />
                        MCP Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Manage connections to external tool servers.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="list">Active Servers</TabsTrigger>
                        <TabsTrigger value="add">Add Server</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-4 py-4">
                        <div className="grid gap-4">
                            {servers.map((server) => (
                                <div key={server.id} className="flex flex-col gap-4 p-4 rounded-xl border border-border/40 bg-card/50 hover:bg-card/80 transition-all shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2.5 rounded-lg border border-border/20 ${server.connected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                <server.icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Label className="text-base font-medium">{server.name}</Label>
                                                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide uppercased ${server.connected ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-muted text-muted-foreground border border-border/50'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${server.connected ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
                                                        {server.connected ? 'Connected' : 'Disabled'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-mono">
                                                    <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                                                        {server.type === 'stdio' ? <Terminal className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                                                        {/* @ts-ignore */}
                                                        <span className="opacity-70">{server.type === 'stdio' ? 'STDIO' : 'SSE'}</span>
                                                    </span>

                                                    {/* @ts-ignore */}
                                                    {server.type === 'stdio' && <span className="opacity-60 truncate max-w-[200px]">{server.command} {server.args[0]}...</span>}
                                                    {/* @ts-ignore */}
                                                    {server.type === 'sse' && <span className="opacity-60 truncate max-w-[200px]">{server.url}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <Switch checked={server.connected} onCheckedChange={() => toggleServer(server.id)} />
                                    </div>

                                    {server.connected && (
                                        <div className="pl-[52px] space-y-3">
                                            {/* Tools Section */}
                                            <div>
                                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">Available Tools</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {server.tools.map(tool => (
                                                        <span key={tool} className="flex items-center gap-1.5 text-[11px] bg-background border border-border/40 px-2 py-1 rounded-md text-foreground/80 font-mono shadow-sm hover:border-primary/30 transition-colors cursor-default">
                                                            <div className="h-1 w-1 rounded-full bg-primary/50" />
                                                            {tool}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Env Vars (Obfuscated) */}
                                            {/* @ts-ignore */}
                                            {server.env && Object.keys(server.env).length > 0 && (
                                                <div className="pt-3 mt-1 border-t border-border/30">
                                                    <div className="flex flex-wrap gap-3">
                                                        {/* @ts-ignore */}
                                                        {Object.entries(server.env).map(([k, v]) => (
                                                            <div key={k} className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-border/20">
                                                                <Key className="h-3 w-3 opacity-60" />
                                                                <span className="font-mono font-medium">{k}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="add" className="space-y-4 py-4 px-1">
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Server Name</Label>
                                <Input
                                    placeholder="e.g. My Custom Tool"
                                    value={newServer.name}
                                    onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Transport Type</Label>
                                <Select
                                    value={newServer.type}
                                    onValueChange={(val) => setNewServer({ ...newServer, type: val as 'stdio' | 'sse' })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="stdio">Stdio (Local Process)</SelectItem>
                                        <SelectItem value="sse">SSE (Remote URL)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {newServer.type === 'stdio' ? (
                                <>
                                    <div className="grid gap-2">
                                        <Label>Command</Label>
                                        <div className="relative">
                                            <Terminal className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                className="pl-8 font-mono text-xs"
                                                placeholder="npx, python, /path/to/binary"
                                                value={newServer.command}
                                                onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Arguments</Label>
                                        <div className="space-y-2">
                                            {newServer.args.map((arg, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        className="font-mono text-xs"
                                                        placeholder={`Arg ${i + 1}`}
                                                        value={arg}
                                                        onChange={(e) => handleArgChange(i, e.target.value)}
                                                    />
                                                    <Button size="icon" variant="ghost" onClick={() => removeArg(i)} disabled={newServer.args.length === 1 && !arg}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button size="sm" variant="outline" className="w-full text-xs border-dashed" onClick={handleAddArg}>
                                                <Plus className="h-3 w-3 mr-1" /> Add Argument
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="grid gap-2">
                                    <Label>Server URL</Label>
                                    <div className="relative">
                                        <Globe className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-8 font-mono text-xs"
                                            placeholder="https://api.example.com/sse"
                                            value={newServer.url}
                                            onChange={(e) => setNewServer({ ...newServer, url: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2 pt-4 border-t border-border/50">
                                <Label>Environment Variables</Label>
                                <p className="text-[10px] text-muted-foreground">Secrets and configuration (e.g. API_KEY)</p>
                                <div className="space-y-2">
                                    {newServer.env.map((env, i) => (
                                        <div key={i} className="flex gap-2">
                                            <Input
                                                className="font-mono text-xs flex-1"
                                                placeholder="KEY"
                                                value={env.key}
                                                onChange={(e) => handleEnvChange(i, 'key', e.target.value)}
                                            />
                                            <Input
                                                className="font-mono text-xs flex-1"
                                                placeholder="VALUE"
                                                type="password"
                                                value={env.value}
                                                onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                                            />
                                            <Button size="icon" variant="ghost" onClick={() => removeEnv(i)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button size="sm" variant="outline" className="w-full text-xs border-dashed" onClick={handleAddEnv}>
                                        <Plus className="h-3 w-3 mr-1" /> Add Environment Variable
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                className="w-full h-10 gap-2 transition-all"
                                onClick={handleSaveServer}
                                disabled={isVerifying || !newServer.name || (newServer.type === 'stdio' ? !newServer.command : !newServer.url)}
                            >
                                {isVerifying ? (
                                    <>
                                        <div className="h-4 w-4 rounded-full border-2 border-background/30 border-t-background animate-spin" />
                                        Verifying Connection...
                                    </>
                                ) : (
                                    <>
                                        Test Connection & Save
                                    </>
                                )}
                            </Button>
                            {!isVerifying && <p className="text-center text-[10px] text-muted-foreground mt-2">Will attempt to handshake with the server before saving.</p>}
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="hidden">
                    {/* Footer managed by Tabs content actions */}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

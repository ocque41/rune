
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Play, Database } from "lucide-react"

interface WorkflowNodeProps {
  title?: string
  type?: "source" | "process" | "output"
  status?: "idle" | "running" | "completed" | "error"
}

export function WorkflowNode({
  title = "Data Source",
  type = "source",
  status = "idle"
}: WorkflowNodeProps) {

  const getIcon = () => {
    switch (type) {
      case "source": return <Database className="h-4 w-4" />
      case "process": return <Settings className="h-4 w-4" />
      case "output": return <Play className="h-4 w-4" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case "running": return "border-l-white"
      case "completed": return "border-l-white/80"
      case "error": return "border-l-white/55"
      default: return "border-l-white/20"
    }
  }

  return (
    <div className="relative group w-[350px]">
      {/* Input Handle */}
      <div className="absolute top-1/2 -left-3 z-10 w-4 h-4 bg-muted-foreground/40 rounded-full border-2 border-background transform -translate-y-1/2 cursor-crosshair shadow-sm" />

      <Card className={`shadow-lg border-l-4 ${getStatusColor()} bg-card text-card-foreground`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6">
          <CardTitle className="text-base font-medium flex items-center gap-3">
            {getIcon()}
            <span>{title}</span>
          </CardTitle>
          <div className={`w-2.5 h-2.5 rounded-full ${status === 'running' ? 'bg-white shadow-white/35 shadow-sm' : 'bg-muted'}`} />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-xs text-muted-foreground font-mono mt-1 mb-4 opacity-70">
            uuid: {Math.random().toString(36).substr(2, 6)}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processing</span>
              <span>60%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[60%]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Handle */}
      <div className="absolute top-1/2 -right-3 z-10 w-4 h-4 bg-muted-foreground/40 rounded-full border-2 border-background transform -translate-y-1/2 cursor-crosshair shadow-sm" />
    </div>
  )
}

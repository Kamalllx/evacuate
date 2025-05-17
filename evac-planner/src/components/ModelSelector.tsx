"use client"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useMode, type MapMode } from "../context/mode-context"
import { motion } from "framer-motion"
import { AlertOctagon, Thermometer, Shield, Users } from "lucide-react"
import { toast } from "sonner"

const ModeSelector = () => {
  const { mode, setMode } = useMode()

  const handleModeChange = (value: string) => {
    setMode(value as MapMode)

    // Show toast notification when mode changes
    const modeName = value.charAt(0).toUpperCase() + value.slice(1)
    toast.success(`${modeName} Mode Activated`, {
      description: getModeDescription(value as MapMode),
    })
  }

  // Get description for each mode
  const getModeDescription = (mode: MapMode): string => {
    switch (mode) {
      case "evacuate":
        return "Plan and visualize evacuation routes with obstacles."
      case "heatmap":
        return "View traffic density and congestion patterns."
      case "defense":
        return "Analyze secure zones and defense perimeters."
      case "crowd":
        return "Simulate crowd movement and density patterns."
      default:
        return ""
    }
  }

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="bg-slate-800/90 backdrop-blur-sm p-1 rounded-lg shadow-lg border border-slate-700"
    >
      <Tabs value={mode} onValueChange={handleModeChange} className="w-full">
        <TabsList className="grid grid-cols-4 min-w-[400px] bg-slate-900/50">
          <TabsTrigger value="evacuate" className="flex items-center gap-2 data-[state=active]:bg-blue-600">
            <AlertOctagon className="h-4 w-4" />
            <span>Evacuate</span>
          </TabsTrigger>
          <TabsTrigger value="heatmap" className="flex items-center gap-2 data-[state=active]:bg-amber-600">
            <Thermometer className="h-4 w-4" />
            <span>Heatmap</span>
          </TabsTrigger>
          <TabsTrigger value="defense" className="flex items-center gap-2 data-[state=active]:bg-red-600">
            <Shield className="h-4 w-4" />
            <span>Defense</span>
          </TabsTrigger>
          <TabsTrigger value="crowd" className="flex items-center gap-2 data-[state=active]:bg-indigo-600">
            <Users className="h-4 w-4" />
            <span>Crowd</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </motion.div>
  )
}

export default ModeSelector

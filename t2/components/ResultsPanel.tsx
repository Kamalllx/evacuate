"use client"
import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { useMode } from "../context/mode-context"
import { motion } from "framer-motion"
import { Clock, Route, ArrowRight, Ruler, AlertTriangle, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface ResultsPanelProps {
  routeData: any
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ routeData }) => {
  const { mode } = useMode()

  if (!routeData || !routeData.features || !routeData.features[0]) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center text-slate-400">
        <AlertTriangle className="h-12 w-12 mb-4 opacity-30" />
        <h3 className="text-lg font-medium mb-2">No Route Data</h3>
        <p className="max-w-xs text-sm">
          Set start and end points, then calculate a route to see detailed results here.
        </p>
      </div>
    )
  }

  const feature = routeData.features[0]
  const properties = feature.properties
  const segments = properties.segments || []
  const summary = properties.summary || {}

  // Format time in minutes and seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}m ${secs}s`
  }

  // Format distance in km or m
  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`
    }
    return `${Math.round(meters)} m`
  }

  // Handle export to JSON
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(routeData, null, 2)
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

      const exportFileDefaultName = `${mode}-route-${new Date().toISOString().slice(0, 10)}.json`

      const linkElement = document.createElement("a")
      linkElement.setAttribute("href", dataUri)
      linkElement.setAttribute("download", exportFileDefaultName)
      linkElement.click()

      toast.success("Export Successful", {
        description: `Route data exported as ${exportFileDefaultName}`,
      })
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Export Failed", {
        description: "Failed to export route data. Please try again.",
      })
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Route Summary</CardTitle>
                <CardDescription>Overview of the calculated route</CardDescription>
              </div>
              <Badge
                className={
                  mode === "evacuate"
                    ? "bg-blue-600"
                    : mode === "heatmap"
                      ? "bg-amber-600"
                      : mode === "defense"
                        ? "bg-red-600"
                        : "bg-indigo-600"
                }
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)} Mode
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-lg p-3 flex flex-col items-center justify-center border border-slate-700">
                <Clock className="h-5 w-5 mb-1 text-blue-400" />
                <div className="text-sm text-slate-400">Total Time</div>
                <div className="text-lg font-medium">{formatTime(summary.duration || 0)}</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 flex flex-col items-center justify-center border border-slate-700">
                <Route className="h-5 w-5 mb-1 text-green-400" />
                <div className="text-sm text-slate-400">Total Distance</div>
                <div className="text-lg font-medium">{formatDistance(summary.distance || 0)}</div>
              </div>
            </div>

            {segments.length > 0 && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="segments" className="border-slate-700">
                  <AccordionTrigger className="hover:bg-slate-700/30 px-3 rounded-md">Route Segments</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 mt-2">
                      {segments.map((segment: any, index: number) => (
                        <div key={index} className="border border-slate-700 rounded-md p-3 text-sm bg-slate-900/30">
                          <div className="flex justify-between items-center mb-2">
                            <Badge variant="outline" className="bg-slate-800 border-slate-600">
                              Segment {index + 1}
                            </Badge>
                            <div className="text-slate-400 text-xs">{formatTime(segment.duration || 0)}</div>
                          </div>

                          <div className="space-y-2">
                            {segment.steps &&
                              segment.steps.map((step: any, stepIndex: number) => (
                                <div key={stepIndex} className="flex items-start gap-2">
                                  <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-500" />
                                  <div>
                                    <div className="text-sm">{step.instruction}</div>
                                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                                      <span className="flex items-center">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {formatTime(step.duration || 0)}
                                      </span>
                                      <span className="flex items-center">
                                        <Ruler className="h-3 w-3 mr-1" />
                                        {formatDistance(step.distance || 0)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {mode === "heatmap" && (
              <div className="border border-slate-700 rounded-md p-3 bg-slate-900/30">
                <h4 className="text-sm font-medium mb-2">Traffic Conditions</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-red-900/30 p-2 rounded border border-red-800/50">
                    <div className="font-medium">Heavy</div>
                    <div className="text-red-400">{"<"}10 km/h</div>
                  </div>
                  <div className="bg-amber-900/30 p-2 rounded border border-amber-800/50">
                    <div className="font-medium">Moderate</div>
                    <div className="text-amber-400">10-20 km/h</div>
                  </div>
                  <div className="bg-green-900/30 p-2 rounded border border-green-800/50">
                    <div className="font-medium">Light</div>
                    <div className="text-green-400">{">"}20 km/h</div>
                  </div>
                </div>
              </div>
            )}

            {mode === "defense" && (
              <div className="border border-slate-700 rounded-md p-3 bg-slate-900/30">
                <h4 className="text-sm font-medium mb-2">Defense Information</h4>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>• Secure zones established along evacuation route</div>
                  <div>• Checkpoints active at major intersections</div>
                  <div>• Emergency services positioned at strategic locations</div>
                </div>
              </div>
            )}

            {mode === "crowd" && (
              <div className="border border-slate-700 rounded-md p-3 bg-slate-900/30">
                <h4 className="text-sm font-medium mb-2">Crowd Density</h4>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>• Estimated crowd flow: {Math.floor(Math.random() * 500 + 100)} people/hour</div>
                  <div>• Average movement speed: {(Math.random() * 3 + 1).toFixed(1)} km/h</div>
                  <div>• Bottleneck risk: {Math.random() > 0.5 ? "High" : "Low"}</div>
                </div>
              </div>
            )}

            <Button onClick={handleExportJSON} className="w-full mt-4 bg-blue-600 hover:bg-blue-700" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Route Data
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default ResultsPanel

"use client"
import "leaflet/dist/leaflet.css"
import "leaflet-draw/dist/leaflet.draw.css"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ModeProvider } from "../context/mode-context"
import { Toaster } from "@/components/ui/sonner"

// Dynamically import MapPanel with no SSR to avoid Leaflet issues
const MapPanel = dynamic(() => import("../components/MapPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-white">Loading map components...</p>
      </div>
    </div>
  ),
})

import ControlPanel from "../components/ControlPanel"
import ResultsPanel from "../components/ResultsPanel"

export default function HomePage() {
  const [routeData, setRouteData] = useState<any>(null)
  const [blockages, setBlockages] = useState<any[]>([])
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null)
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null)
  const [activeTab, setActiveTab] = useState<string>("controls")
  const [isClient, setIsClient] = useState(false)

  // Ensure we're running on the client before rendering Leaflet
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white">Initializing application...</p>
        </div>
      </div>
    )
  }

  return (
    <ModeProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
        <div className="flex-grow min-w-0 relative">
          <MapPanel
            routeData={routeData}
            blockages={blockages}
            setBlockages={setBlockages}
            startPoint={startPoint}
            endPoint={endPoint}
            setStartPoint={setStartPoint}
            setEndPoint={setEndPoint}
          />
        </div>
        <div className="w-[400px] bg-slate-800/90 backdrop-blur-sm border-l border-slate-700 shadow-xl overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="controls" className="text-sm">
                  Controls
                </TabsTrigger>
                <TabsTrigger value="results" className="text-sm">
                  Results
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="controls" className="p-4 pt-2">
              <ControlPanel
                setRouteData={setRouteData}
                blockages={blockages}
                startPoint={startPoint}
                endPoint={endPoint}
                setStartPoint={setStartPoint}
                setEndPoint={setEndPoint}
              />
            </TabsContent>

            <TabsContent value="results" className="p-4 pt-2">
              <ResultsPanel routeData={routeData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </ModeProvider>
  )
}

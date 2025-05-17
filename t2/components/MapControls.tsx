"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useMode } from "../context/mode-context"
import { toast } from "sonner"
import { MapPin, Navigation, AlertTriangle, Locate, ZoomIn, ZoomOut, Compass } from "lucide-react"
import { motion } from "framer-motion"

const MapControls = ({ mapRef, setStartPoint, setEndPoint }) => {
  const { markerMode, setMarkerMode, isDrawingObstacle, setIsDrawingObstacle } = useMode()
  const [loading, setLoading] = useState(false)

  const handleCurrentLocation = async () => {
    setLoading(true)

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setStartPoint([latitude, longitude])

            if (mapRef.current) {
              const map = mapRef.current
              map.setView([latitude, longitude], 15)
            }

            toast.success("Location Found", {
              description: "Your current location has been set as the starting point.",
            })

            setLoading(false)
          },
          (error) => {
            console.error("Error getting location:", error)
            toast.error("Location Error", {
              description: "Unable to get your current location. Please try again or set manually.",
            })
            setLoading(false)
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
        )
      } else {
        toast.error("Geolocation Not Supported", {
          description: "Your browser doesn't support geolocation. Please set location manually.",
        })
        setLoading(false)
      }
    } catch (error) {
      console.error("Geolocation error:", error)
      toast.error("Location Error", {
        description: "An error occurred while getting your location.",
      })
      setLoading(false)
    }
  }

  const handleZoomIn = () => {
    if (mapRef.current) {
      const map = mapRef.current
      map.setZoom(map.getZoom() + 1)
    }
  }

  const handleZoomOut = () => {
    if (mapRef.current) {
      const map = mapRef.current
      map.setZoom(map.getZoom() - 1)
    }
  }

  const handleResetView = () => {
    if (mapRef.current) {
      const map = mapRef.current
      map.setView([40.7128, -74.006], 13)
    }
  }

  const handleToggleDrawing = () => {
    setIsDrawingObstacle(!isDrawingObstacle)
    if (!isDrawingObstacle) {
      toast.info("Obstacle Drawing Mode", {
        description: "Click on the map to draw obstacles. Click 'Finish' when done.",
      })
    }
  }

  return (
    <TooltipProvider>
      <motion.div
        className="bg-slate-800/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-slate-700 flex flex-col gap-2"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={markerMode === "start" ? "default" : "outline"}
                size="icon"
                onClick={() => setMarkerMode(markerMode === "start" ? "none" : "start")}
                className={markerMode === "start" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Set Start Point</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={markerMode === "end" ? "default" : "outline"}
                size="icon"
                onClick={() => setMarkerMode(markerMode === "end" ? "none" : "end")}
                className={markerMode === "end" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                <Navigation className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Set End Point</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleCurrentLocation} disabled={loading}>
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Locate className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Use Current Location</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="w-full h-px bg-slate-700 my-1" />

        <div className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isDrawingObstacle ? "default" : "outline"}
                size="icon"
                onClick={handleToggleDrawing}
                className={isDrawingObstacle ? "bg-amber-600 hover:bg-amber-700" : ""}
              >
                <AlertTriangle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isDrawingObstacle ? "Finish Drawing" : "Draw Obstacle"}</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom In</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Zoom Out</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleResetView}>
                <Compass className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Reset View</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    </TooltipProvider>
  )
}

export default MapControls

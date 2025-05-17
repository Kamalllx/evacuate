"use client"
import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, ZoomControl } from "react-leaflet"
import MapView from "./MapView"
import Legend from "./Legend"
import MapControls from "./MapControls"
import ModeSelector from "./ModeSelector"
import { useMode } from "../context/mode-context"
import { motion } from "framer-motion"
import L from "leaflet"

const defaultCenter = [40.7128, -74.006]
const MAP_ID = "main-map"

const MapPanel = (props) => {
  const mapRef = useRef(null)
  const { mode } = useMode()
  const [mapLoaded, setMapLoaded] = useState(false)

  // Fix Leaflet icon issues
  useEffect(() => {
    // This is needed for the Leaflet icons to work properly
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    })
  }, [])

  // Get map style based on current mode
  const getMapStyle = () => {
    switch (mode) {
      case "heatmap":
        return "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      case "defense":
        return "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      case "crowd":
        return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      default: // evacuate
        return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    }
  }

  // Handle map load event
  const handleMapLoad = () => {
    setMapLoaded(true)
    console.log("Map loaded successfully")
  }

  return (
    <div className="relative h-full w-full bg-slate-900">
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-900">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-white">Loading map...</p>
          </div>
        </div>
      )}

      <MapContainer
        id={MAP_ID}
        center={defaultCenter}
        zoom={13}
        className="h-full w-full z-0"
        scrollWheelZoom={true}
        zoomControl={false}
        ref={mapRef}
        whenReady={handleMapLoad}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={getMapStyle()}
        />
        <ZoomControl position="bottomleft" />
        <MapView {...props} mapRef={mapRef} />
      </MapContainer>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000]"
      >
        <ModeSelector />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="absolute top-4 left-4 z-[1000]"
      >
        <MapControls mapRef={mapRef} {...props} />
      </motion.div>

      <Legend />
    </div>
  )
}

export default MapPanel

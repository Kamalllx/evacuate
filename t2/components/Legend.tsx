"use client"
import { useMode } from "../context/mode-context"
import { motion } from "framer-motion"

const Legend = () => {
  const { mode } = useMode()

  // Get legend items based on current mode
  const getLegendItems = () => {
    const baseItems = [
      { color: "#10b981", label: "Starting Point", type: "circle" },
      { color: "#ef4444", label: "Destination", type: "circle" },
    ]

    switch (mode) {
      case "evacuate":
        return [
          ...baseItems,
          { color: "#ff3300", label: "Obstacle", type: "square" },
          { color: "#0088ff", label: "Evacuation Route", type: "line" },
        ]
      case "heatmap":
        return [
          ...baseItems,
          { color: "#ff0000", label: "Heavy Traffic", type: "circle" },
          { color: "#ff9900", label: "Moderate Traffic", type: "circle" },
          { color: "#00ff00", label: "Light Traffic", type: "circle" },
          { color: "#ffcc00", label: "Route", type: "line" },
        ]
      case "defense":
        return [
          ...baseItems,
          { color: "#ff3300", label: "Defense Zone", type: "square" },
          { color: "#ff5500", label: "Secure Route", type: "dashed-line" },
        ]
      case "crowd":
        return [
          ...baseItems,
          { color: "#3366ff", label: "Crowd Density", type: "circle" },
          { color: "#00ccff", label: "Movement Path", type: "line" },
        ]
      default:
        return baseItems
    }
  }

  const renderSymbol = (item: { color: string; type: string }) => {
    switch (item.type) {
      case "circle":
        return <span style={{ color: item.color, fontWeight: 700 }}>●</span>
      case "square":
        return <span style={{ color: item.color, fontWeight: 700 }}>■</span>
      case "line":
        return <span style={{ color: item.color, fontWeight: 700 }}>━</span>
      case "dashed-line":
        return <span style={{ color: item.color, fontWeight: 700 }}>┅</span>
      default:
        return <span style={{ color: item.color, fontWeight: 700 }}>●</span>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="absolute bottom-6 right-6 bg-slate-800/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-lg border border-slate-700 z-[1000] min-w-[180px]"
    >
      <div className="font-medium mb-2 text-sm">Legend</div>
      <div className="space-y-1 text-sm">
        {getLegendItems().map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {renderSymbol(item)}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default Legend

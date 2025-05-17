"use client"
import type React from "react"
import { createContext, useContext, useState, type ReactNode } from "react"

export type MapMode = "evacuate" | "heatmap" | "defense" | "crowd"

interface ModeContextType {
  mode: MapMode
  setMode: (mode: MapMode) => void
  markerMode: "none" | "start" | "end"
  setMarkerMode: (mode: "none" | "start" | "end") => void
  isDrawingObstacle: boolean
  setIsDrawingObstacle: (isDrawing: boolean) => void
}

const ModeContext = createContext<ModeContextType | undefined>(undefined)

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<MapMode>("evacuate")
  const [markerMode, setMarkerMode] = useState<"none" | "start" | "end">("none")
  const [isDrawingObstacle, setIsDrawingObstacle] = useState(false)

  return (
    <ModeContext.Provider
      value={{
        mode,
        setMode,
        markerMode,
        setMarkerMode,
        isDrawingObstacle,
        setIsDrawingObstacle,
      }}
    >
      {children}
    </ModeContext.Provider>
  )
}

export const useMode = (): ModeContextType => {
  const context = useContext(ModeContext)
  if (context === undefined) {
    throw new Error("useMode must be used within a ModeProvider")
  }
  return context
}

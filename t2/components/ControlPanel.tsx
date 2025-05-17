"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { geocode, getDirections, requestTomTomRouteAnalysis } from "../utils/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Search, LocateFixed, Navigation2, Car, PersonStanding, Trash2, Calculator } from "lucide-react"
import { useMode } from "../context/mode-context"
import { motion } from "framer-motion"

interface ControlPanelProps {
  setRouteData: (data: any) => void
  blockages: any[]
  startPoint: [number, number] | null
  endPoint: [number, number] | null
  setStartPoint: (p: [number, number]) => void
  setEndPoint: (p: [number, number]) => void
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  setRouteData,
  blockages,
  startPoint,
  endPoint,
  setStartPoint,
  setEndPoint,
}) => {
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [travelMode, setTravelMode] = useState("foot-walking")
  const [loading, setLoading] = useState(false)
  const [ttAnalysis, setTTAnalysis] = useState<any>(null)
  const { mode } = useMode()

  useEffect(() => {
    const recalculateRoute = async () => {
      if (!startPoint || !endPoint) {
        setRouteData(null)
        setTTAnalysis(null)
        return
      }
      setLoading(true)

      const avoid_polygons =
        blockages.length > 0
          ? {
              type: "MultiPolygon",
              coordinates: blockages.map((b) => [b.coords.map(([lat, lng]) => [lng, lat])]),
            }
          : undefined

      try {
        const data = await getDirections(
          [
            [startPoint[1], startPoint[0]],
            [endPoint[1], endPoint[0]],
          ],
          avoid_polygons,
          travelMode,
        )
        setRouteData(data)

        // Call TomTom Route Analysis if in appropriate mode
        if (mode === "heatmap" || mode === "crowd") {
          const coords = [
            [startPoint[1], startPoint[0]],
            [endPoint[1], endPoint[0]],
          ]
          try {
            const ttResult = await requestTomTomRouteAnalysis(coords)
            setTTAnalysis(ttResult)
          } catch (error) {
            console.error("Error fetching TomTom analysis:", error)
          }
        }

        toast.success("Route Calculated", {
          description: `${mode.charAt(0).toUpperCase() + mode.slice(1)} route has been calculated successfully.`,
        })
      } catch (error) {
        console.error("Error fetching directions:", error)
        setRouteData(null)
        setTTAnalysis(null)
        toast.error("Route Error", {
          description: "Unable to calculate route. Please try different points.",
        })
      } finally {
        setLoading(false)
      }
    }

    if (startPoint && endPoint) {
      recalculateRoute()
    }
  }, [blockages, startPoint, endPoint, travelMode, mode, setRouteData])

  const handleSearch = async () => {
    if (!search.trim()) return

    setLoading(true)
    try {
      const results = await geocode(search)
      setSearchResults(results || [])

      if (results && results.length > 0) {
        toast.success("Search Results", {
          description: `Found ${results.length} locations matching "${search}"`,
        })
      } else {
        toast.error("No Results", {
          description: `No locations found matching "${search}"`,
        })
      }
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Search Error", {
        description: "Unable to search for locations. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectLocation = (result: any, pointType: "start" | "end") => {
    if (pointType === "start") {
      setStartPoint([result.lat, result.lon])
      toast.success("Start Point Set", {
        description: `Start point set to ${result.display_name.split(",")[0]}`,
      })
    } else {
      setEndPoint([result.lat, result.lon])
      toast.success("End Point Set", {
        description: `Destination set to ${result.display_name.split(",")[0]}`,
      })
    }
    setSearchResults([])
    setSearch("")
  }

  const handleClearRoute = () => {
    setRouteData(null)
    setTTAnalysis(null)
    toast.info("Route Cleared", {
      description: "The route has been cleared from the map.",
    })
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Location
            </CardTitle>
            <CardDescription>Find places to set as start or destination</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter address or landmark"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1 bg-slate-900/50 border-slate-700"
              />
              <Button
                onClick={handleSearch}
                disabled={loading || !search.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-3 max-h-[200px] overflow-y-auto border border-slate-700 rounded-md bg-slate-900/30">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-slate-700/50 cursor-pointer flex flex-col border-b border-slate-700 last:border-b-0"
                  >
                    <div className="font-medium">{result.display_name}</div>
                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs bg-green-900/20 border-green-700/50 hover:bg-green-800/30 text-green-400"
                        onClick={() => handleSelectLocation(result, "start")}
                      >
                        <LocateFixed className="h-3 w-3 mr-1" /> Set as Start
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs bg-red-900/20 border-red-700/50 hover:bg-red-800/30 text-red-400"
                        onClick={() => handleSelectLocation(result, "end")}
                      >
                        <Navigation2 className="h-3 w-3 mr-1" /> Set as Destination
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Route Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="start-point">Start Point</Label>
              <Input
                id="start-point"
                value={startPoint ? `${startPoint[0].toFixed(5)}, ${startPoint[1].toFixed(5)}` : ""}
                readOnly
                className="font-mono text-sm bg-slate-900/50 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-point">Destination Point</Label>
              <Input
                id="end-point"
                value={endPoint ? `${endPoint[0].toFixed(5)}, ${endPoint[1].toFixed(5)}` : ""}
                readOnly
                className="font-mono text-sm bg-slate-900/50 border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="travel-mode">Travel Mode</Label>
              <Select value={travelMode} onValueChange={setTravelMode}>
                <SelectTrigger id="travel-mode" className="bg-slate-900/50 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="foot-walking" className="flex items-center">
                    <div className="flex items-center gap-2">
                      <PersonStanding className="h-4 w-4" />
                      <span>Walking</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="driving-car" className="flex items-center">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <span>Driving</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-red-900/20 text-red-400 hover:bg-red-900/30 border-red-700/50">
                  {blockages.length} {blockages.length === 1 ? "Obstacle" : "Obstacles"}
                </Badge>
                {mode === "defense" && (
                  <Badge
                    variant="outline"
                    className="bg-blue-900/20 text-blue-400 hover:bg-blue-900/30 border-blue-700/50"
                  >
                    Defense Mode
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading || !startPoint || !endPoint}
              onClick={() => {
                if (startPoint && endPoint) {
                  // Trigger route recalculation
                  const event = new CustomEvent("recalculate-route")
                  window.dispatchEvent(event)
                }
              }}
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              Calculate Route
            </Button>
            <Button
              variant="outline"
              onClick={handleClearRoute}
              disabled={!startPoint && !endPoint}
              className="border-red-700/50 hover:bg-red-900/20 text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {ttAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="bg-slate-800/60 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Route Analysis</CardTitle>
              <CardDescription>TomTom traffic analysis results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Job ID:</span> {ttAnalysis.jobId}
              </div>
              <div>
                <span className="font-medium">Status:</span> {ttAnalysis.status}
              </div>
              {ttAnalysis.resultUrls && (
                <div>
                  <span className="font-medium">Result URLs:</span>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {Object.entries(ttAnalysis.resultUrls).map(([k, v]) => (
                      <li key={k}>
                        <a
                          href={v as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          {k}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

export default ControlPanel

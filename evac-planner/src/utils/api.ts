import axios from "axios"

const API_BASE = "http://localhost:8000/api" // or your actual backend URL

export const geocode = async (query: string) => {
  try {
    const res = await axios.get(`${API_BASE}/geocode`, { params: { query } })
    return res.data
  } catch (error) {
    console.error("Geocode error:", error)
    throw error
  }
}

export const getDirections = async (coordinates: number[][], avoid_polygons?: any, profile = "foot-walking") => {
  try {
    const res = await axios.post(`${API_BASE}/directions`, { coordinates, avoid_polygons, profile })
    return res.data
  } catch (error) {
    console.error("Directions error:", error)
    throw error
  }
}

export const getTomTomTrafficForRoute = async (coordinates: number[][]) => {
  try {
    const res = await axios.post(`${API_BASE}/traffic/route`, { coordinates })
    return res.data
  } catch (error) {
    console.error("Traffic route error:", error)
    throw error
  }
}

export const getTomTomTrafficDensity = async (points: [number, number][]) => {
  try {
    const res = await axios.post(`${API_BASE}/traffic/density`, { points })
    return res.data
  } catch (error) {
    console.error("Traffic density error:", error)
    throw error
  }
}

export const requestTomTomRouteAnalysis = async (coordinates: number[][]) => {
  try {
    const res = await axios.post(`${API_BASE}/traffic/route-analysis`, { coordinates })
    return res.data
  } catch (error) {
    console.error("Route analysis error:", error)
    throw error
  }
}

export const getIsochrones = async (
  location: [number, number],
  ranges: number[] = [300, 600, 900],
  profile = "foot-walking",
) => {
  try {
    const res = await axios.post(`${API_BASE}/isochrones`, { location, ranges, profile })
    return res.data
  } catch (error) {
    console.error("Isochrones error:", error)
    throw error
  }
}

export const getElevation = async (lat: number, lon: number) => {
  try {
    const res = await axios.get(`${API_BASE}/elevation`, { params: { lat, lon } })
    return res.data
  } catch (error) {
    console.error("Elevation error:", error)
    throw error
  }
}

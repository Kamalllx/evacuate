import axios from "axios"

const API_BASE = "http://localhost:8000/api" // or your actual backend URL

export const geocode = async (query: string) => {
  try {
    // For demo purposes, return mock data if API is not available
    const mockData = [
      {
        display_name: "New York City, NY, USA",
        lat: 40.7128,
        lon: -74.006,
      },
      {
        display_name: "Brooklyn, NY, USA",
        lat: 40.6782,
        lon: -73.9442,
      },
      {
        display_name: "Manhattan, NY, USA",
        lat: 40.7831,
        lon: -73.9712,
      },
    ]

    try {
      const res = await axios.get(`${API_BASE}/geocode`, { params: { query } })
      return res.data
    } catch (error) {
      console.warn("Using mock geocode data due to API error:", error)
      return mockData.filter((item) => item.display_name.toLowerCase().includes(query.toLowerCase()))
    }
  } catch (error) {
    console.error("Geocode error:", error)
    throw error
  }
}

export const getDirections = async (coordinates: number[][], avoid_polygons?: any, profile = "foot-walking") => {
  try {
    // For demo purposes, return mock data if API is not available
    const mockRoute = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            segments: [
              {
                distance: 2500,
                duration: 1800,
                steps: [
                  {
                    distance: 800,
                    duration: 600,
                    instruction: "Walk straight on Broadway",
                  },
                  {
                    distance: 900,
                    duration: 650,
                    instruction: "Turn right onto 5th Avenue",
                  },
                  {
                    distance: 800,
                    duration: 550,
                    instruction: "Continue onto Park Avenue",
                  },
                ],
              },
            ],
            summary: {
              distance: 2500,
              duration: 1800,
            },
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [coordinates[0][0], coordinates[0][1]],
              [coordinates[0][0] + 0.01, coordinates[0][1] + 0.01],
              [coordinates[0][0] + 0.02, coordinates[0][1] + 0.005],
              [coordinates[1][0], coordinates[1][1]],
            ],
          },
        },
      ],
    }

    try {
      const res = await axios.post(`${API_BASE}/directions`, { coordinates, avoid_polygons, profile })
      return res.data
    } catch (error) {
      console.warn("Using mock route data due to API error:", error)
      return mockRoute
    }
  } catch (error) {
    console.error("Directions error:", error)
    throw error
  }
}

export const getTomTomTrafficDensity = async (points: [number, number][]) => {
  try {
    // For demo purposes, return mock data if API is not available
    const mockDensity = points.map(([lat, lon]) => ({
      lat,
      lon,
      currentSpeed: Math.random() * 30,
      freeFlowSpeed: Math.random() * 50 + 20,
      confidence: Math.random().toFixed(2),
    }))

    try {
      const res = await axios.post(`${API_BASE}/traffic/density`, { points })
      return res.data
    } catch (error) {
      console.warn("Using mock traffic density data due to API error:", error)
      return mockDensity
    }
  } catch (error) {
    console.error("Traffic density error:", error)
    throw error
  }
}

export const requestTomTomRouteAnalysis = async (coordinates: number[][]) => {
  try {
    // For demo purposes, return mock data if API is not available
    const mockAnalysis = {
      jobId: "mock-job-" + Math.random().toString(36).substring(2, 10),
      status: "completed",
      resultUrls: {
        trafficDensity: "https://example.com/traffic-density",
        routeAnalysis: "https://example.com/route-analysis",
      },
    }

    try {
      const res = await axios.post(`${API_BASE}/traffic/route-analysis`, { coordinates })
      return res.data
    } catch (error) {
      console.warn("Using mock route analysis data due to API error:", error)
      return mockAnalysis
    }
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
    // Mock implementation
    const res = await axios.post(`${API_BASE}/isochrones`, { location, ranges, profile })
    return res.data
  } catch (error) {
    console.error("Isochrones error:", error)
    throw error
  }
}

export const getElevation = async (lat: number, lon: number) => {
  try {
    // Mock implementation
    const res = await axios.get(`${API_BASE}/elevation`, { params: { lat, lon } })
    return res.data
  } catch (error) {
    console.error("Elevation error:", error)
    throw error
  }
}

import axios from 'axios';

const API_BASE = 'http://localhost:8000/api'; // or your actual backend URL

export const geocode = async (query: string) => {
  const res = await axios.get(`${API_BASE}/geocode`, { params: { query } });
  return res.data;
};

export const getDirections = async (
  coordinates: number[][],
  avoid_polygons?: any,
  profile = 'foot-walking'
) => {
  const res = await axios.post(`${API_BASE}/directions`, { coordinates, avoid_polygons, profile });
  return res.data;
};

export const getTomTomTrafficForRoute = async (coordinates: number[][]) => {
  const res = await axios.post(`${API_BASE}/traffic/route`, { coordinates });
  return res.data;
};

export const getTomTomTrafficDensity = async (points: [number, number][]) => {
    const res = await axios.post(`${API_BASE}/traffic/density`, { points });
    return res.data;
  };

export const requestTomTomRouteAnalysis = async (coordinates: number[][]) => {
  const res = await axios.post(`${API_BASE}/traffic/route-analysis`, { coordinates });
  return res.data;
};

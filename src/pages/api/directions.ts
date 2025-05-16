import type { NextApiRequest, NextApiResponse } from 'next';

// This will need to be replaced with proper environment variable in production
const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_BASE_URL = "https://api.openrouteservice.org/v2";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { coordinates, profile = 'foot-walking' } = req.body;
  
  if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
    return res.status(400).json({ error: 'Invalid coordinates provided' });
  }
  
  try {
    // Build request to OpenRouteService
    const orsHeaders = {
      'Authorization': ORS_API_KEY || '',
      'Content-Type': 'application/json; charset=utf-8'
    };
    
    const payload = {
      coordinates: coordinates,
      format: 'geojson'
    };
    
    // Add avoid_polygons if provided
    if (req.body.avoid_polygons) {
      payload['options'] = {
        avoid_polygons: req.body.avoid_polygons
      };
    }
    
    // Make request to OpenRouteService
    const response = await fetch(
      `${ORS_BASE_URL}/directions/${profile}/geojson`,
      {
        method: 'POST',
        headers: orsHeaders,
        body: JSON.stringify(payload)
      }
    );
    
    if (!response.ok) {
      throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Directions API error:', error);
    return res.status(500).json({ 
      error: 'Error calculating route', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
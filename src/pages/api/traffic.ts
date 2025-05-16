import type { NextApiRequest, NextApiResponse } from 'next';

// This will be replaced with environment variable
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TOMTOM_API_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { boundingBox } = req.body;
  
  if (!boundingBox || !Array.isArray(boundingBox) || boundingBox.length !== 2) {
    return res.status(400).json({ error: 'Invalid bounding box provided' });
  }
  
  // Check if we have the API key
  if (!TOMTOM_API_KEY) {
    return res.status(500).json({ error: 'TomTom API key is not configured' });
  }
  
  try {
    // Format the bounding box for TomTom API
    // TomTom format: minLon,minLat,maxLon,maxLat
    const formattedBoundingBox = `${boundingBox[0][0]},${boundingBox[0][1]},${boundingBox[1][0]},${boundingBox[1][1]}`;
    
    // Make request to TomTom Traffic API
    const url = `${TOMTOM_API_URL}/absolute/4/json?key=${TOMTOM_API_KEY}&bbox=${formattedBoundingBox}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`TomTom API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Traffic API error:', error);
    return res.status(500).json({ 
      error: 'Error fetching traffic data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
import type { NextApiRequest, NextApiResponse } from 'next';

// OpenTopoData API endpoint
const OPENTOPO_API_URL = "https://api.opentopodata.org/v1/ned10m";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { locations } = req.query;
  
  if (!locations) {
    return res.status(400).json({ error: 'Locations parameter is required' });
  }
  
  try {
    // Make request to OpenTopoData API
    const url = `${OPENTOPO_API_URL}?locations=${locations}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenTopoData API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Elevation API error:', error);
    return res.status(500).json({ 
      error: 'Error fetching elevation data', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
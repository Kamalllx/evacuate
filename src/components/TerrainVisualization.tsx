import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

interface TerrainVisualizationProps {
  mapInstance: mapboxgl.Map | null;
  routeCoordinates?: number[][];
}

const TerrainVisualization: React.FC<TerrainVisualizationProps> = ({ mapInstance, routeCoordinates }) => {
  const elevationProfileRef = useRef<HTMLDivElement>(null);

  // Effect to add terrain to map
  useEffect(() => {
    if (!mapInstance) return;

    // Add terrain source and layer when we have a valid map
    mapInstance.on('load', () => {
      // Check if style is already loaded
      if (!mapInstance.isStyleLoaded()) return;

      // Add terrain source if it doesn't exist
      if (!mapInstance.getSource('mapbox-dem')) {
        mapInstance.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
      }

      // Add terrain layer if it doesn't exist
      if (!mapInstance.getLayer('terrain-3d')) {
        mapInstance.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

        mapInstance.addLayer({
          'id': 'terrain-3d',
          'source': 'mapbox-dem',
          'type': 'hillshade',
          'paint': {
            'hillshade-highlight-color': '#FFFFFF',
            'hillshade-illumination-direction': 270,
            'hillshade-illumination-anchor': 'viewport',
            'hillshade-accent-color': '#5a6673',
            'hillshade-shadow-color': '#273239'
          }
        });
      }
    });
  }, [mapInstance]);

  // Effect to update elevation profile when route changes
  useEffect(() => {
    if (!routeCoordinates || routeCoordinates.length === 0 || !elevationProfileRef.current) return;

    const fetchAndDisplayElevationProfile = async () => {
      try {
        // Format coordinates for the API
        const locationString = routeCoordinates
          .map(coord => `${coord[1]},${coord[0]}`) // API expects lat,lng
          .join('|');

        // Sample only a subset of points to avoid overloading the API
        const sampledLocations = samplePoints(locationString, 20);
        
        // Call the API through our Next.js API route
        const response = await fetch(`/api/elevation?locations=${sampledLocations}`);
        if (!response.ok) throw new Error('Failed to fetch elevation data');
        
        const data = await response.json();
        
        // Display the elevation profile
        renderElevationProfile(data.results, elevationProfileRef.current);
      } catch (error) {
        console.error('Error fetching elevation data:', error);
      }
    };

    fetchAndDisplayElevationProfile();
  }, [routeCoordinates]);

  // Helper function to sample points from a route
  const samplePoints = (locationString: string, maxPoints: number): string => {
    const points = locationString.split('|');
    if (points.length <= maxPoints) return locationString;
    
    const stride = Math.ceil(points.length / maxPoints);
    const sampledPoints = [];
    
    for (let i = 0; i < points.length; i += stride) {
      sampledPoints.push(points[i]);
    }
    
    // Always include the last point
    if (!sampledPoints.includes(points[points.length - 1])) {
      sampledPoints.push(points[points.length - 1]);
    }
    
    return sampledPoints.join('|');
  };

  // Helper function to render elevation profile
  const renderElevationProfile = (elevationData: any[], container: HTMLDivElement) => {
    // Clear previous content
    container.innerHTML = '';
    
    if (!elevationData || elevationData.length === 0) {
      container.innerHTML = '<p>No elevation data available</p>';
      return;
    }
    
    // Find min and max elevation for scaling
    const elevations = elevationData.map(point => point.elevation);
    const minElevation = Math.min(...elevations);
    const maxElevation = Math.max(...elevations);
    const range = maxElevation - minElevation;
    
    // Create SVG for elevation profile
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "150");
    svg.setAttribute("viewBox", `0 0 ${elevationData.length} 100`);
    svg.style.display = "block";
    
    // Create path for elevation profile
    const path = document.createElementNS(svgNS, "path");
    let pathData = `M 0,${100 - ((elevationData[0].elevation - minElevation) / range * 80 + 10)}`;
    
    elevationData.forEach((point, index) => {
      if (index > 0) {
        const y = 100 - ((point.elevation - minElevation) / range * 80 + 10);
        pathData += ` L ${index},${y}`;
      }
    });
    
    // Add baseline to close the path
    pathData += ` L ${elevationData.length - 1},100 L 0,100 Z`;
    
    path.setAttribute("d", pathData);
    path.setAttribute("fill", "rgba(66, 135, 245, 0.5)");
    path.setAttribute("stroke", "#2a67c9");
    path.setAttribute("stroke-width", "1");
    
    svg.appendChild(path);
    container.appendChild(svg);
    
    // Add elevation stats
    const stats = document.createElement('div');
    stats.className = 'elevation-stats d-flex justify-content-between mt-2';
    stats.innerHTML = `
      <div>
        <strong>Min:</strong> ${minElevation.toFixed(1)}m
      </div>
      <div>
        <strong>Max:</strong> ${maxElevation.toFixed(1)}m
      </div>
      <div>
        <strong>Change:</strong> ${range.toFixed(1)}m
      </div>
    `;
    
    container.appendChild(stats);
  };

  return (
    <div className="terrain-visualization">
      <h5>Elevation Profile</h5>
      <div 
        ref={elevationProfileRef} 
        className="elevation-profile bg-dark p-3 rounded"
        style={{ minHeight: '150px' }}
      >
        {!routeCoordinates && <p>Calculate a route to see elevation profile</p>}
      </div>
    </div>
  );
};

export default TerrainVisualization;
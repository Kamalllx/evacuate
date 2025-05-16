import { useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

interface TrafficVisualizationProps {
  mapInstance: mapboxgl.Map | null;
  boundingBox?: number[][];
  isEnabled: boolean;
}

const TrafficVisualization: React.FC<TrafficVisualizationProps> = ({ 
  mapInstance, 
  boundingBox,
  isEnabled
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Only proceed if enabled, map exists, and we have a bounding box
    if (!isEnabled || !mapInstance || !boundingBox) return;
    
    const fetchAndDisplayTrafficData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch traffic data from our API
        const response = await fetch('/api/traffic', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ boundingBox })
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch traffic data');
        }
        
        const trafficData = await response.json();
        
        // Add traffic data to map
        addTrafficLayerToMap(trafficData);
        
      } catch (error) {
        console.error('Error fetching traffic data:', error);
        setError(error instanceof Error ? error.message : 'Unknown error fetching traffic data');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Call the function
    fetchAndDisplayTrafficData();
    
    // Setup timer to refresh traffic data every 2 minutes
    const intervalId = setInterval(fetchAndDisplayTrafficData, 120000);
    
    // Clean up on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
      removeTrafficLayersFromMap();
    };
  }, [mapInstance, boundingBox, isEnabled]);
  
  // Function to add traffic data to the map
  const addTrafficLayerToMap = (trafficData: any) => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    
    // Remove existing traffic layers first
    removeTrafficLayersFromMap();
    
    // Ensure we have flow segments to display
    if (!trafficData.flowSegmentData) {
      console.warn('No flow segment data available');
      return;
    }
    
    // Convert TomTom traffic data to GeoJSON
    const trafficGeoJSON = {
      type: 'FeatureCollection',
      features: trafficData.flowSegmentData.map((segment: any) => ({
        type: 'Feature',
        properties: {
          currentSpeed: segment.currentSpeed,
          freeFlowSpeed: segment.freeFlowSpeed,
          currentTravelTime: segment.currentTravelTime,
          freeFlowTravelTime: segment.freeFlowTravelTime,
          confidence: segment.confidence,
          // Calculate congestion level (0-1)
          congestionLevel: 
            segment.freeFlowSpeed > 0 
              ? Math.max(0, Math.min(1, 1 - (segment.currentSpeed / segment.freeFlowSpeed)))
              : 0
        },
        geometry: segment.geometry
      }))
    };
    
    // Add source to map
    mapInstance.addSource('traffic-data', {
      type: 'geojson',
      data: trafficGeoJSON
    });
    
    // Add layer to map
    mapInstance.addLayer({
      id: 'traffic-flow',
      type: 'line',
      source: 'traffic-data',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-width': 4,
        'line-color': [
          'interpolate',
          ['linear'],
          ['get', 'congestionLevel'],
          0, '#4CAF50', // No congestion (green)
          0.3, '#FFEB3B', // Light congestion (yellow)
          0.6, '#FF9800', // Moderate congestion (orange)
          1, '#F44336'  // Heavy congestion (red)
        ],
        'line-opacity': 0.8
      }
    });
    
    // Add hover effect
    mapInstance.on('mouseenter', 'traffic-flow', () => {
      mapInstance.getCanvas().style.cursor = 'pointer';
    });
    
    mapInstance.on('mouseleave', 'traffic-flow', () => {
      mapInstance.getCanvas().style.cursor = '';
    });
    
    // Add click effect to show detailed traffic info
    mapInstance.on('click', 'traffic-flow', (e) => {
      if (!e.features || e.features.length === 0) return;
      
      const properties = e.features[0].properties;
      if (!properties) return;
      
      const congestionLevel = properties.congestionLevel * 100;
      let congestionText = 'Low';
      if (congestionLevel > 60) congestionText = 'High';
      else if (congestionLevel > 30) congestionText = 'Moderate';
      
      new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="traffic-popup">
            <h6>Traffic Details</h6>
            <div><strong>Current Speed:</strong> ${properties.currentSpeed} km/h</div>
            <div><strong>Normal Speed:</strong> ${properties.freeFlowSpeed} km/h</div>
            <div><strong>Congestion:</strong> ${congestionLevel.toFixed(0)}% (${congestionText})</div>
            <div><strong>Current Travel Time:</strong> ${(properties.currentTravelTime / 60).toFixed(1)} min</div>
            <div><strong>Normal Travel Time:</strong> ${(properties.freeFlowTravelTime / 60).toFixed(1)} min</div>
          </div>
        `)
        .addTo(mapInstance);
    });
  };
  
  // Function to remove traffic layers from the map
  const removeTrafficLayersFromMap = () => {
    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    
    if (mapInstance.getLayer('traffic-flow')) {
      mapInstance.removeLayer('traffic-flow');
    }
    
    if (mapInstance.getSource('traffic-data')) {
      mapInstance.removeSource('traffic-data');
    }
  };

  if (error) {
    return (
      <div className="traffic-visualization">
        <div className="alert alert-danger">
          Error loading traffic data: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="traffic-visualization">
      {isLoading && (
        <div className="text-center my-2">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Loading traffic data...</span>
          </div>
          <span className="ms-2">Loading traffic data...</span>
        </div>
      )}
      
      {!isEnabled && (
        <div className="alert alert-info">
          Traffic visualization is disabled. Enable it in settings to see real-time traffic conditions.
        </div>
      )}
    </div>
  );
};

export default TrafficVisualization;
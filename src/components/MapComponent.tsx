import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Map, MapboxGeoJSONFeature } from 'mapbox-gl';
import TerrainVisualization from './TerrainVisualization';
import TrafficVisualization from './TrafficVisualization';

// Types
interface MapComponentProps {
  isEmergencyMode: boolean;
}

// In a production app, this would be stored in .env.local
// Normally we would use process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
// This line would be replaced with a proper API key when provided by user
const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_TOKEN';

const MapComponent: React.FC<MapComponentProps> = ({ isEmergencyMode }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const [lng, setLng] = useState(-74.0060);
  const [lat, setLat] = useState(40.7128);
  const [zoom, setZoom] = useState(13);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
  const [isSettingStart, setIsSettingStart] = useState(false);
  const [isSettingEnd, setIsSettingEnd] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<number[][]>([]);
  const [trafficDensity, setTrafficDensity] = useState<any>(null);
  const [boundingBox, setBoundingBox] = useState<number[][]>([]);
  const [showTerrain, setShowTerrain] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);

  // Initialize map when component mounts
  useEffect(() => {
    if (map.current) return; // Initialize map only once
    
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom
    });

    // Add navigation control (zoom buttons)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add fullscreen control
    map.current.addControl(new mapboxgl.FullscreenControl());

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      })
    );

    // Save reference to the map
    const mapInstance = map.current;

    // Clean up on unmount
    return () => mapInstance.remove();
  }, []);

  // Setup event listeners once map is loaded
  useEffect(() => {
    if (!map.current) return;

    // Add event listener for when the map finishes loading
    const setupMapEvents = () => {
      const mapInstance = map.current;
      if (!mapInstance) return;

      // Update state variables when map moves
      mapInstance.on('move', () => {
        const center = mapInstance.getCenter();
        setLng(parseFloat(center.lng.toFixed(4)));
        setLat(parseFloat(center.lat.toFixed(4)));
        setZoom(parseFloat(mapInstance.getZoom().toFixed(2)));
      });

      // Handle click events for setting start/end points
      mapInstance.on('click', (e) => {
        if (isSettingStart) {
          setStartPoint([e.lngLat.lng, e.lngLat.lat]);
          setIsSettingStart(false);
          addMarker([e.lngLat.lng, e.lngLat.lat], 'start');
        } else if (isSettingEnd) {
          setEndPoint([e.lngLat.lng, e.lngLat.lat]);
          setIsSettingEnd(false);
          addMarker([e.lngLat.lng, e.lngLat.lat], 'end');
        }
      });
    };

    // If map is already loaded, set up events immediately
    if (map.current.loaded()) {
      setupMapEvents();
    } else {
      // Otherwise wait for the load event
      map.current.on('load', setupMapEvents);
    }
  }, [isSettingStart, isSettingEnd]);

  // Effect to update map appearance based on emergency mode
  useEffect(() => {
    if (!map.current) return;

    if (isEmergencyMode) {
      // Change map style for emergency mode
      map.current.setStyle('mapbox://styles/mapbox/dark-v10');
    } else {
      // Reset to default style
      map.current.setStyle('mapbox://styles/mapbox/streets-v11');
    }
  }, [isEmergencyMode]);

  // Function to add a marker to the map
  const addMarker = (coordinates: [number, number], type: 'start' | 'end') => {
    if (!map.current) return;

    // Create a custom HTML element for the marker
    const el = document.createElement('div');
    el.className = `marker ${type}-marker`;
    el.innerHTML = type === 'start' 
      ? '<i class="fas fa-map-marker-alt" style="color: green;"></i>' 
      : '<i class="fas fa-flag-checkered" style="color: red;"></i>';

    // Create and add the marker
    new mapboxgl.Marker(el)
      .setLngLat(coordinates)
      .addTo(map.current);
  };

  // Function to calculate route between start and end points
  const calculateRoute = async () => {
    if (!startPoint || !endPoint) {
      alert('Please set both start and end points first');
      return;
    }

    try {
      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coordinates: [startPoint, endPoint],
          profile: 'foot-walking'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to calculate route');
      }

      const data = await response.json();
      setCurrentRoute(data);
      displayRoute(data);

      // After getting route, fetch traffic density
      fetchTrafficDensity();
    } catch (error) {
      console.error('Error calculating route:', error);
      alert('Error calculating route. Please try again.');
    }
  };

  // Function to display the calculated route on the map
  const displayRoute = (routeData: any) => {
    if (!map.current || !routeData) return;

    // Remove any existing route
    if (map.current.getSource('route')) {
      map.current.removeLayer('route');
      map.current.removeSource('route');
    }

    // Add the route to the map
    map.current.addSource('route', {
      type: 'geojson',
      data: routeData
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': isEmergencyMode ? '#ff3300' : '#0066ff',
        'line-width': 5,
        'line-opacity': 0.8
      }
    });

    // Extract route coordinates for terrain visualization and traffic analysis
    if (routeData.features && routeData.features.length > 0 && 
        routeData.features[0].geometry && routeData.features[0].geometry.coordinates) {
      const coordinates = routeData.features[0].geometry.coordinates;
      setRouteCoordinates(coordinates);
      
      // Create bounding box for traffic analysis
      // Find min and max coordinates to create a bounding box
      if (coordinates.length > 0) {
        let minLng = coordinates[0][0];
        let maxLng = coordinates[0][0];
        let minLat = coordinates[0][1];
        let maxLat = coordinates[0][1];
        
        coordinates.forEach((coord: [number, number]) => {
          minLng = Math.min(minLng, coord[0]);
          maxLng = Math.max(maxLng, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        });
        
        // Add a small buffer around the route (0.01 degrees ~ 1km)
        const buffer = 0.01;
        setBoundingBox([
          [minLng - buffer, minLat - buffer], // Southwest corner
          [maxLng + buffer, maxLat + buffer]  // Northeast corner
        ]);
      }
    }

    // Fit the map to show the route
    const bounds = new mapboxgl.LngLatBounds();
    routeData.features[0].geometry.coordinates.forEach((coordinate: [number, number]) => {
      bounds.extend(coordinate);
    });
    
    map.current.fitBounds(bounds, {
      padding: 50,
      duration: 1000
    });
  };

  // Function to fetch traffic density data
  const fetchTrafficDensity = async () => {
    // This would connect to TomTom Traffic API in a real implementation
    // For this demo, we'll simulate with a placeholder
    console.log("Traffic density would be fetched here from TomTom API");
    
    // In a real app, uncomment and implement this:
    /*
    try {
      const response = await fetch('/api/traffic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          boundingBox: [
            // Southwest corner (longitude, latitude)
            [lng - 0.05, lat - 0.05],
            // Northeast corner (longitude, latitude)
            [lng + 0.05, lat + 0.05]
          ]
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch traffic data');
      }

      const data = await response.json();
      setTrafficDensity(data);
      displayTrafficDensity(data);
    } catch (error) {
      console.error('Error fetching traffic data:', error);
    }
    */
  };

  // Function to display traffic density on the map
  const displayTrafficDensity = (trafficData: any) => {
    if (!map.current || !trafficData) return;

    // Implementation would go here
    console.log("Traffic density would be displayed here");
  };

  return (
    <div>
      <div ref={mapContainer} className="map-container" style={{ height: '600px' }} />
      
      {/* Map Controls */}
      <div className="map-controls mt-3">
        <div className="d-flex justify-content-center mb-3">
          <button 
            className="btn btn-primary mx-2"
            onClick={() => setIsSettingStart(true)}
          >
            <i className="fas fa-map-marker-alt"></i> Set Start
          </button>
          <button 
            className="btn btn-danger mx-2"
            onClick={() => setIsSettingEnd(true)}
          >
            <i className="fas fa-flag-checkered"></i> Set End
          </button>
          <button 
            className="btn btn-success mx-2"
            onClick={calculateRoute}
            disabled={!startPoint || !endPoint}
          >
            <i className="fas fa-route"></i> Calculate Route
          </button>
        </div>
        
        {/* Visualization Toggles */}
        <div className="d-flex justify-content-center mb-3">
          <div className="form-check form-switch mx-3">
            <input 
              className="form-check-input" 
              type="checkbox" 
              id="terrainToggle" 
              checked={showTerrain}
              onChange={() => setShowTerrain(!showTerrain)} 
            />
            <label className="form-check-label" htmlFor="terrainToggle">
              <i className="fas fa-mountain me-1"></i> Terrain
            </label>
          </div>
          <div className="form-check form-switch mx-3">
            <input 
              className="form-check-input" 
              type="checkbox" 
              id="trafficToggle" 
              checked={showTraffic}
              onChange={() => setShowTraffic(!showTraffic)} 
            />
            <label className="form-check-label" htmlFor="trafficToggle">
              <i className="fas fa-car me-1"></i> Traffic
            </label>
          </div>
        </div>
        
        <div className="map-instructions text-center mb-3">
          {isSettingStart && <div className="alert alert-info">Click on the map to set start point</div>}
          {isSettingEnd && <div className="alert alert-info">Click on the map to set end point</div>}
        </div>
      </div>
      
      {/* Visualizations */}
      {currentRoute && (
        <div className="visualizations mt-4">
          <div className="row">
            {/* Terrain Visualization */}
            {showTerrain && (
              <div className="col-md-6 mb-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <TerrainVisualization 
                      mapInstance={map.current} 
                      routeCoordinates={routeCoordinates} 
                    />
                  </div>
                </div>
              </div>
            )}
            
            {/* Traffic Visualization */}
            {showTraffic && boundingBox.length > 0 && (
              <div className="col-md-6 mb-3">
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    <h5>Traffic Conditions</h5>
                    <TrafficVisualization 
                      mapInstance={map.current} 
                      boundingBox={boundingBox}
                      isEnabled={showTraffic} 
                    />
                    <p className="text-muted mt-2">
                      <i className="fas fa-info-circle me-1"></i> 
                      Real-time traffic data along your route is shown on the map with color-coded congestion levels.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;
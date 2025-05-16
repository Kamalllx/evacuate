import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Map, MapboxGeoJSONFeature } from 'mapbox-gl';

// Types
interface MapComponentProps {
  isEmergencyMode: boolean;
}

// In a production app, this would be stored in .env.local
// and accessed via process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
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
  const [trafficDensity, setTrafficDensity] = useState<any>(null);

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
        <div className="map-instructions text-center mb-3">
          {isSettingStart && <div className="alert alert-info">Click on the map to set start point</div>}
          {isSettingEnd && <div className="alert alert-info">Click on the map to set end point</div>}
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
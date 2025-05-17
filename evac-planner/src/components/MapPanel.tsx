import React, { useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import MapView from './MapView';
import Legend from './Legend';

const defaultCenter = [40.7128, -74.0060];

const MAP_ID = 'main-map';

const MapPanel = (props) => {
  useEffect(() => {
    // This ensures the Leaflet map instance is destroyed before mounting a new one
    const container = document.getElementById(MAP_ID);
    if (container && container._leaflet_id) {
      container._leaflet_id = null;
    }
  }, []);

  return (
    <div style={{ flex: 3, minWidth: 0, position: 'relative' }}>
      <MapContainer
        id={MAP_ID}
        center={defaultCenter}
        zoom={13}
        style={{ height: '100vh', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />
        <MapView {...props} />
      </MapContainer>
      <Legend />
    </div>
  );
};

export default MapPanel;

'use client';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'bootstrap/dist/css/bootstrap.min.css';
  
import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const MapPanel = dynamic(() => import('../components/MapPanel'), { ssr: false });
import ControlPanel from '../components/ControlPanel';

export default function HomePage() {
  const [routeData, setRouteData] = useState<any>(null);
  const [blockages, setBlockages] = useState<any[]>([]);
  const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
  const [endPoint, setEndPoint] = useState<[number, number] | null>(null);

  return (
    <div className="d-flex" style={{ height: '100vh', background: '#232b3a' }}>
      <div style={{ flex: 3, minWidth: 0 }}>
        <MapPanel
          routeData={routeData}
          blockages={blockages}
          setBlockages={setBlockages}
          startPoint={startPoint}
          endPoint={endPoint}
          setStartPoint={setStartPoint}
          setEndPoint={setEndPoint}
        />
      </div>
      <div style={{ flex: 1, background: '#232b3a', color: '#fff', padding: '24px', minWidth: '350px' }}>
        <ControlPanel
          setRouteData={setRouteData}
          blockages={blockages}
          startPoint={startPoint}
          endPoint={endPoint}
          setStartPoint={setStartPoint}
          setEndPoint={setEndPoint}
        />
      </div>
    </div>
  );
}

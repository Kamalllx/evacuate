import React, { useRef, useState, useEffect } from 'react';
import {
  FeatureGroup,
  Marker,
  Polyline,
  useMapEvents,
  Circle,
  Popup,
  LayerGroup,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L, { LatLngExpression } from 'leaflet';
import { getTomTomTrafficDensity } from '../utils/api';

interface Blockage {
  type: 'polygon' | 'rectangle';
  coords: [number, number][];
}

interface MapViewProps {
  routeData: any;
  blockages: Blockage[];
  setBlockages: (b: Blockage[]) => void;
  startPoint: [number, number] | null;
  endPoint: [number, number] | null;
  setStartPoint: (p: [number, number]) => void;
  setEndPoint: (p: [number, number]) => void;
}

const startIcon = new L.Icon({
  iconUrl:
    'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-green.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const endIcon = new L.Icon({
  iconUrl:
    'https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function sampleRoutePoints(routeCoords: [number, number][], interval = 5): [number, number][] {
  // Sample every Nth point from the route for traffic density checks
  if (!routeCoords || routeCoords.length === 0) return [];
  const sampled: [number, number][] = [];
  for (let i = 0; i < routeCoords.length; i += interval) {
    const [lng, lat] = routeCoords[i];
    sampled.push([lat, lng]);
  }
  // Always include start/end
  if (sampled.length === 0 || (sampled[0][0] !== routeCoords[0][1] || sampled[0][1] !== routeCoords[0][0])) {
    sampled.unshift([routeCoords[0][1], routeCoords[0][0]]);
  }
  if (sampled[sampled.length - 1][0] !== routeCoords[routeCoords.length - 1][1] ||
      sampled[sampled.length - 1][1] !== routeCoords[routeCoords.length - 1][0]) {
    sampled.push([routeCoords[routeCoords.length - 1][1], routeCoords[routeCoords.length - 1][0]]);
  }
  return sampled;
}

const MapView: React.FC<MapViewProps> = ({
  routeData,
  blockages,
  setBlockages,
  startPoint,
  endPoint,
  setStartPoint,
  setEndPoint,
}) => {
  const drawnItemsRef = useRef<L.FeatureGroup>(null);
  const [pointMode, setPointMode] = useState<'start' | 'end'>('start');
  const [densityPoints, setDensityPoints] = useState<any[]>([]);

  useMapEvents({
    click(e) {
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
      if (pointMode === 'start') {
        setStartPoint(latlng);
        setPointMode('end');
      } else {
        setEndPoint(latlng);
        setPointMode('start');
      }
    },
  });

  const handleDrawCreated = (e: any) => {
    const layer = e.layer;
    let coords: [number, number][] = [];
    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
      const latLngs = (layer.getLatLngs()[0] as L.LatLng[]).map(
        (latlng) => [latlng.lat, latlng.lng] as [number, number]
      );
      if (
        latLngs.length > 0 &&
        (latLngs[0][0] !== latLngs[latLngs.length - 1][0] ||
          latLngs[0][1] !== latLngs[latLngs.length - 1][1])
      ) {
        latLngs.push(latLngs[0]);
      }
      coords = latLngs;
      setBlockages([
        ...blockages,
        { type: layer instanceof L.Polygon ? 'polygon' : 'rectangle', coords },
      ]);
    }
  };

  const handleDrawDeleted = (e: any) => {
    setBlockages([]);
  };

  const toLatLngs = (coords: [number, number][]) =>
    coords.map(([lat, lng]) => [lat, lng] as LatLngExpression);

  const getRouteLatLngs = () => {
    if (!routeData || !routeData.features || !routeData.features[0]) return [];
    return routeData.features[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng] as LatLngExpression
    );
  };

  // Fetch TomTom traffic density for sampled points along the route
  useEffect(() => {
    const fetchDensity = async () => {
      if (routeData && routeData.features && routeData.features[0]) {
        const coords = routeData.features[0].geometry.coordinates;
        const sampledPoints = sampleRoutePoints(coords, 7); // sample every 7th point
        try {
          const density = await getTomTomTrafficDensity(sampledPoints);
          setDensityPoints(density);
        } catch (e) {
          setDensityPoints([]);
        }
      } else {
        setDensityPoints([]);
      }
    };
    fetchDensity();
  }, [routeData]);

  return (
    <>
      <FeatureGroup ref={drawnItemsRef as any}>
        <EditControl
          position="topright"
          onCreated={handleDrawCreated}
          onDeleted={handleDrawDeleted}
          draw={{
            polyline: false,
            circle: false,
            marker: false,
            circlemarker: false,
            polygon: { shapeOptions: { color: '#ff3300', fillOpacity: 0.3 } },
            rectangle: { shapeOptions: { color: '#ff3300', fillOpacity: 0.3 } },
          }}
        />
      </FeatureGroup>
      {startPoint && <Marker position={startPoint} icon={startIcon} />}
      {endPoint && <Marker position={endPoint} icon={endIcon} />}
      {routeData && (
  <Polyline
    positions={getRouteLatLngs()}
    color="#0275d8"
    weight={5}
    opacity={0.7}
  />
)}
<LayerGroup>
  {densityPoints.map((pt, idx) => (
    <Circle
      key={idx}
      center={[pt.lat, pt.lon]}
      radius={100}
      pathOptions={{
        color:
          pt.currentSpeed === null
            ? 'gray'
            : pt.currentSpeed < 10
            ? 'red'
            : pt.currentSpeed < 20
            ? 'orange'
            : 'green',
        fillOpacity: 0.5,
      }}
    >
      <Popup>
        <div>
          <b>Current Speed:</b> {pt.currentSpeed ?? 'N/A'} km/h<br />
          <b>Free Flow Speed:</b> {pt.freeFlowSpeed ?? 'N/A'} km/h<br />
          <b>Confidence:</b> {pt.confidence ?? 'N/A'}<br />
          <b>FRC:</b> {pt.frc ?? 'N/A'}
        </div>
      </Popup>
    </Circle>
  ))}
</LayerGroup>

    </>
  );
};

export default MapView;

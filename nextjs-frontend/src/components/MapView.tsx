"use client"
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, GeoJSON } from 'react-leaflet';
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import { useScenario } from '../contexts/ScenarioContext';
import axios from 'axios';

// Define props interface
interface MapViewProps {
    isEmergencyMode: boolean;
}

// MapControls component to add scale and legend
function MapControls({ onDrawCreated }: { onDrawCreated: (e: any) => void }) {
    const map = useMap();

    useEffect(() => {
        // Add scale control
        L.control.scale().addTo(map);

        // Add legend control
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend bg-dark p-2 rounded text-white');
            div.innerHTML = `
                <h6 class="mb-2">Legend</h6>
                <div class="d-flex align-items-center mb-1">
                    <i class="fas fa-circle me-2" style="color: green;"></i> Starting Point
                </div>
                <div class="d-flex align-items-center mb-1">
                    <i class="fas fa-circle me-2" style="color: red;"></i> Destination
                </div>
                <div class="d-flex align-items-center mb-1">
                    <i class="fas fa-square me-2" style="color: #ff3300;"></i> Blockage
                </div>
                <div class="d-flex align-items-center">
                    <i class="fas fa-route me-2" style="color: blue;"></i> Evacuation Route
                </div>
            `;
            return div;
        };
        legend.addTo(map);
    }, [map]);

    return (
        <FeatureGroup>
            <EditControl
                position="topright"
                onCreated={onDrawCreated}
                draw={{
                    rectangle: true,
                    polygon: true,
                    circle: false,
                    circlemarker: false,
                    marker: false,
                    polyline: false
                }}
            />
        </FeatureGroup>
    );
}

// Main MapView component
export default function MapView({ isEmergencyMode }: MapViewProps) {
    const { currentScenario, updateScenario } = useScenario();
    const [startMarker, setStartMarker] = useState<L.Marker | null>(null);
    const [endMarker, setEndMarker] = useState<L.Marker | null>(null);
    const [route, setRoute] = useState<any>(null);
    const mapRef = useRef<L.Map | null>(null);

    // Handle drawing of blockages
    const handleDrawCreated = (e: any) => {
        const blockage = {
            type: e.layerType,
            coords: e.layer.getLatLngs ? e.layer.getLatLngs() : e.layer.getLatLng()
        };
        updateScenario({ blockages: [...currentScenario.blockages, blockage] });
        if (startMarker && endMarker) calculateRoute();
    };

    // Calculate route between start and end points
    const calculateRoute = async () => {
        if (!startMarker || !endMarker) return;
        const startCoords = [startMarker.getLatLng().lng, startMarker.getLatLng().lat];
        const endCoords = [endMarker.getLatLng().lng, endMarker.getLatLng().lat];
        const requestData = {
            coordinates: [startCoords, endCoords],
            profile: 'foot-walking',
            avoid_polygons: currentScenario.blockages.length > 0 ? {
                type: 'MultiPolygon',
                coordinates: currentScenario.blockages.map(b => b.coords.map((c: any) => [c.lng, c.lat]))
            } : null
        };

        try {
            const response = await axios.post('/api/directions', requestData);
            setRoute(response.data);
            updateScenario({ route: response.data });
        } catch (error) {
            console.error('Error calculating route:', error);
        }
    };

    // Set markers based on scenario data
    useEffect(() => {
        if (currentScenario.startPoint && !startMarker) {
            setStartMarker(L.marker(currentScenario.startPoint, {
                icon: L.divIcon({ html: '<i class="fas fa-map-marker-alt fa-2x text-green"></i>' })
            }));
        }
        if (currentScenario.endPoint && !endMarker) {
            setEndMarker(L.marker(currentScenario.endPoint, {
                icon: L.divIcon({ html: '<i class="fas fa-flag-checkered fa-2x text-red"></i>' })
            }));
        }
    }, [currentScenario, startMarker, endMarker]);

    // Ensure map size is updated
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.invalidateSize();
        }
    }, [mapRef]);

    return (
        <MapContainer
            center={[12.9716, 77.5946]} // Bengaluru, India coordinates
            zoom={13}
            style={{ height: '100vh', width: '100%' }}
            whenCreated={(map) => {
                mapRef.current = map;
            }}
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapControls onDrawCreated={handleDrawCreated} />
            {startMarker && <Marker position={startMarker.getLatLng()} />}
            {endMarker && <Marker position={endMarker.getLatLng()} />}
            {route && (
                <GeoJSON
                    data={route}
                    style={() => ({
                        color: isEmergencyMode ? '#dc3545' : '#0275d8',
                        weight: 5,
                        opacity: 0.7
                    })}
                />
            )}
        </MapContainer>
    );
}
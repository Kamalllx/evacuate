"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useScenario } from '../contexts/ScenarioContext';

function SimulationControls() {
    const map = useMap();
    useEffect(() => {
        const legend = L.control({ position: 'bottomright' });
        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'info legend bg-dark p-2 rounded text-white');
            div.innerHTML = `
                <h6 class="mb-2">Legend</h6>
                <div class="d-flex align-items-center mb-1">
                    <div class="me-2" style="width:10px;height:10px;background-color:#007bff;border-radius:50%;"></div>
                    <small>Evacuee</small>
                </div>
                <div class="d-flex align-items-center mb-1">
                    <div class="me-2" style="width:10px;height:10px;background-color:#dc3545;border-radius:50%;"></div>
                    <small>In Danger</small>
                </div>
                <div class="d-flex align-items-center">
                    <div class="me-2" style="width:10px;height:10px;background-color:#28a745;border-radius:50%;"></div>
                    <small>Safe</small>
                </div>
            `;
            return div;
        };
        legend.addTo(map);
    }, [map]);
    return null;
}

export default function SimulationView() {
    const { currentScenario } = useScenario();
    const [agents, setAgents] = useState<any[]>([]);
    const [simRunning, setSimRunning] = useState(false);

    const generateAgents = () => {
        if (!currentScenario.route) return;
        const coords = currentScenario.route.features[0].geometry.coordinates;
        const route = coords.map((c: number[]) => [c[1], c[0]]);
        const agentCount = 100; // Example density
        const newAgents = Array.from({ length: agentCount }, (_, i) => {
            const pos = Math.random() * (route.length - 1);
            const index = Math.floor(pos);
            const ratio = pos - index;
            const pointA = route[index];
            const pointB = route[Math.min(index + 1, route.length - 1)];
            const position = [
                pointA[0] + ratio * (pointB[0] - pointA[0]),
                pointA[1] + ratio * (pointB[1] - pointA[1])
            ];
            return {
                id: i,
                position,
                progress: pos / (route.length - 1),
                speed: 0.001,
                status: 'active'
            };
        });
        setAgents(newAgents);
    };

    useEffect(() => {
        if (simRunning) {
            const interval = setInterval(() => {
                setAgents(prev => prev.map(agent => {
                    if (agent.status !== 'active') return agent;
                    const newProgress = agent.progress + agent.speed;
                    if (newProgress >= 1) {
                        return { ...agent, status: 'safe', progress: 1 };
                    }
                    const index = Math.floor(newProgress * (currentScenario.route.features[0].geometry.coordinates.length - 1));
                    const route = currentScenario.route.features[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
                    const pointA = route[index];
                    const pointB = route[Math.min(index + 1, route.length - 1)];
                    const ratio = newProgress * (route.length - 1) - index;
                    const newPosition = [
                        pointA[0] + ratio * (pointB[0] - pointA[0]),
                        pointA[1] + ratio * (pointB[1] - pointA[1])
                    ];
                    return { ...agent, position: newPosition, progress: newProgress };
                }));
            }, 100);
            return () => clearInterval(interval);
        }
    }, [simRunning, currentScenario.route]);

    useEffect(() => {
        if (currentScenario.route && agents.length === 0) generateAgents();
    }, [currentScenario.route]);

    return (
        <MapContainer center={[40.7128, -74.0060]} zoom={13} style={{ height: '500px', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <SimulationControls />
            {currentScenario.startPoint && (
                <Marker position={currentScenario.startPoint} icon={L.divIcon({ html: '<i class="fas fa-map-marker-alt fa-2x text-green"></i>' })} />
            )}
            {currentScenario.endPoint && (
                <Marker position={currentScenario.endPoint} icon={L.divIcon({ html: '<i class="fas fa-flag-checkered fa-2x text-red"></i>' })} />
            )}
            {agents.map(agent => (
                <Marker
                    key={agent.id}
                    position={agent.position}
                    icon={L.divIcon({
                        html: '',
                        className: `agent ${agent.status === 'safe' ? 'bg-success' : agent.status === 'danger' ? 'bg-danger' : 'bg-primary'}`,
                        iconSize: [8, 8]
                    })}
                />
            ))}
        </MapContainer>
    );
}
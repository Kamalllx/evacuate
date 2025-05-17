"use client";

import { useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { useScenario } from '../contexts/ScenarioContext';
import axios from 'axios';

interface ControlPanelProps {
    activeView: string;
    onShowLocationModal: () => void;
}

export default function ControlPanel({ activeView, onShowLocationModal }: ControlPanelProps) {
    const { currentScenario, updateScenario } = useScenario();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = async () => {
        try {
            const response = await axios.get(`/api/geocode?query=${encodeURIComponent(searchQuery)}`);
            if (response.data.length > 0) {
                updateScenario({ startPoint: [response.data[0].lat, response.data[0].lon] });
            }
        } catch (error) {
            console.error('Search error:', error);
        }
    };

    if (activeView === 'map') {
        return (
            <div className="control-panel p-3 bg-light position-fixed end-0 top-50" style={{ width: '300px', transform: 'translateY(-50%)' }}>
                <h5>Control Panel</h5>
                <Form.Group className="mb-3">
                    <Form.Label>Search Location</Form.Label>
                    <Form.Control
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <Button className="mt-2" onClick={handleSearch}>Search</Button>
                </Form.Group>
                <Button onClick={onShowLocationModal}>Set Coordinates</Button>
            </div>
        );
    }
    return null; // Add simulation and scenarios controls as needed
}
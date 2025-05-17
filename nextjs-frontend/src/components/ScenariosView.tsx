"use client";
import { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import axios from 'axios';

export default function ScenariosView({ onSaveSuccess }: { onSaveSuccess: () => void }) {
    const [scenarios, setScenarios] = useState<any[]>([]);

    useEffect(() => {
        axios.get('/api/scenarios')
            .then(response => setScenarios(response.data))
            .catch(error => console.error('Error fetching scenarios:', error));
    }, []);

    return (
        <div className="container py-4">
            <h2>Saved Scenarios</h2>
            {scenarios.length === 0 ? (
                <div className="text-center p-5">
                    <i className="fas fa-folder-open fa-3x mb-3 text-muted"></i>
                    <p className="text-muted">No saved scenarios yet.</p>
                </div>
            ) : (
                scenarios.map(scenario => (
                    <div key={scenario.id} className="card mb-2">
                        <div className="card-body d-flex justify-content-between align-items-center">
                            <div>
                                <h5>{scenario.name}</h5>
                                <p>{scenario.description}</p>
                            </div>
                            <div>
                                <Button variant="outline-primary" size="sm" className="me-1">Load</Button>
                                <Button variant="outline-danger" size="sm">Delete</Button>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}   
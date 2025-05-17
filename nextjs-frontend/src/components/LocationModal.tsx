"use client";

import { Modal, Button, Form } from 'react-bootstrap';
import { useState } from 'react';
import { useScenario } from '../contexts/ScenarioContext';

export default function LocationModal({ show, onHide }: { show: boolean; onHide: () => void }) {
    const { updateScenario } = useScenario();
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

    const handleConfirm = () => {
        updateScenario({ startPoint: [parseFloat(lat), parseFloat(lng)] });
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Select Location</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className="mb-3">
                    <Form.Label>Latitude</Form.Label>
                    <Form.Control type="number" value={lat} onChange={e => setLat(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3">
                    <Form.Label>Longitude</Form.Label>
                    <Form.Control type="number" value={lng} onChange={e => setLng(e.target.value)} />
                </Form.Group>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={handleConfirm}>Confirm Location</Button>
            </Modal.Footer>
        </Modal>
    );
}
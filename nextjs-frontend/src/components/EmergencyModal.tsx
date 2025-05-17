import { Modal, Button } from 'react-bootstrap';

export default function EmergencyModal({ show, onHide }: { show: boolean; onHide: () => void }) {
    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Emergency Mode Activated</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Emergency mode is now active. The system will prioritize:</p>
                <ul>
                    <li>Fastest evacuation routes</li>
                    <li>Real-time hazard avoidance</li>
                    <li>Accessibility for all users</li>
                </ul>
                <p className="text-muted">In a real emergency, always follow official guidance from emergency services.</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Understand</Button>
            </Modal.Footer>
        </Modal>
    );
}
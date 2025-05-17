import { Modal, Button } from 'react-bootstrap';

export default function SaveSuccessModal({ show, onHide, onViewScenarios }: { show: boolean; onHide: () => void; onViewScenarios: () => void }) {
    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>Scenario Saved</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Your evacuation scenario has been saved successfully!</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
                <Button variant="primary" onClick={onViewScenarios}>View All Scenarios</Button>
            </Modal.Footer>
        </Modal>
    );
}
"use client"
import { useState } from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import dynamic from 'next/dynamic';
import HeroSection from '../components/HeroSection';
import SimulationView from '../components/SimulationView';
import ScenariosView from '../components/ScenariosView';
import ControlPanel from '../components/ControlPanel';
import EmergencyModal from '../components/EmergencyModal';
import SaveSuccessModal from '../components/SaveSuccessModal';
import LocationModal from '../components/LocationModal';
import { ScenarioProvider } from '../contexts/ScenarioContext';

// Dynamically import MapView with SSR disabled
const MapView = dynamic(() => import('../components/MapView'), {
    ssr: false,
    loading: () => <div className="loading-map">Loading map...</div>,
});

export default function Home() {
    const [activeView, setActiveView] = useState('hero');
    const [isEmergencyMode, setIsEmergencyMode] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
    const [showLocationModal, setShowLocationModal] = useState(false);

    const switchView = (viewName: string) => {
        setActiveView(viewName);
    };

    const toggleEmergencyMode = () => {
        setIsEmergencyMode(!isEmergencyMode);
        setShowEmergencyModal(!isEmergencyMode);
    };

    return (
        <ScenarioProvider>
            <div className={isEmergencyMode ? 'emergency-mode' : ''}>
                <Navbar bg="dark" variant="dark" expand="lg" fixed="top">
                    <Navbar.Brand href="#">Evacuation Planner</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link onClick={() => switchView('map')}>Map</Nav.Link>
                            <Nav.Link onClick={() => switchView('simulation')}>Simulation</Nav.Link>
                            <Nav.Link onClick={() => switchView('scenarios')}>Scenarios</Nav.Link>
                        </Nav>
                        <Nav>
                            <Button
                                variant={isEmergencyMode ? 'danger' : 'outline-danger'}
                                onClick={toggleEmergencyMode}
                            >
                                {isEmergencyMode ? 'Exit Emergency Mode' : 'Emergency Mode'}
                            </Button>
                        </Nav>
                    </Navbar.Collapse>
                </Navbar>

                <main className="pt-5">
                    {activeView === 'hero' && <HeroSection onStartPlanning={() => switchView('map')} />}
                    <div className={activeView === 'map' ? 'view-section' : 'view-section d-none'}>
                        <MapView isEmergencyMode={isEmergencyMode} />
                    </div>
                    <div className={activeView === 'simulation' ? 'view-section' : 'view-section d-none'}>
                        <SimulationView />
                    </div>
                    <div className={activeView === 'scenarios' ? 'view-section' : 'view-section d-none'}>
                        <ScenariosView onSaveSuccess={() => setShowSaveSuccessModal(true)} />
                    </div>
                    <ControlPanel
                        activeView={activeView}
                        onShowLocationModal={() => setShowLocationModal(true)}
                    />
                </main>

                <EmergencyModal show={showEmergencyModal} onHide={() => setShowEmergencyModal(false)} />
                <SaveSuccessModal
                    show={showSaveSuccessModal}
                    onHide={() => setShowSaveSuccessModal(false)}
                    onViewScenarios={() => {
                        setShowSaveSuccessModal(false);
                        switchView('scenarios');
                    }}
                />
                <LocationModal show={showLocationModal} onHide={() => setShowLocationModal(false)} />
            </div>
        </ScenarioProvider>
    );
}
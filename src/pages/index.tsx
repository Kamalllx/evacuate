import Head from 'next/head';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Import styles
import 'mapbox-gl/dist/mapbox-gl.css';

// Dynamically import MapComponent to avoid SSR issues with mapbox-gl
const MapComponent = dynamic(() => import('../components/MapComponent'), { 
  ssr: false,
  loading: () => <div className="loading-map">Loading map...</div>
});

export default function Home() {
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [activeView, setActiveView] = useState('map');

  return (
    <>
      <Head>
        <title>Evacuation Planning & Simulation Tool</title>
        <meta name="description" content="Plan safe evacuation routes and simulate emergency scenarios" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={`app-container ${isEmergencyMode ? 'emergency-mode' : ''}`}>
        <header className="navbar navbar-expand-lg navbar-dark bg-dark">
          <div className="container-fluid">
            <a className="navbar-brand d-flex align-items-center" href="#">
              <i className="fas fa-route me-2"></i>
              <span>Evacuation Planner</span>
            </a>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
              <ul className="navbar-nav me-auto">
                <li className="nav-item">
                  <a 
                    className={`nav-link ${activeView === 'map' ? 'active' : ''}`} 
                    href="#"
                    onClick={() => setActiveView('map')}
                  >
                    Map
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${activeView === 'simulation' ? 'active' : ''}`}
                    href="#"
                    onClick={() => setActiveView('simulation')}
                  >
                    Simulation
                  </a>
                </li>
                <li className="nav-item">
                  <a 
                    className={`nav-link ${activeView === 'scenarios' ? 'active' : ''}`}
                    href="#"
                    onClick={() => setActiveView('scenarios')}
                  >
                    Scenarios
                  </a>
                </li>
              </ul>
              <div className="d-flex">
                <button 
                  className="btn btn-outline-danger me-2" 
                  onClick={() => setIsEmergencyMode(!isEmergencyMode)}
                >
                  <i className="fas fa-exclamation-triangle me-1"></i> Emergency Mode
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="container-fluid main-container">
          {/* Hero section */}
          <div className="row hero-section mb-4" id="heroSection">
            <div className="col-md-12 position-relative">
              <div className="hero-overlay"></div>
              <div className="hero-content text-center text-white p-4">
                <h1>Evacuation Planning & Simulation Tool</h1>
                <p className="lead">Plan safe evacuation routes and simulate emergency scenarios</p>
                <button className="btn btn-danger btn-lg" id="startPlanningBtn">
                  <i className="fas fa-map-marked-alt me-2"></i> Start Planning Now
                </button>
              </div>
            </div>
          </div>

          {/* Main content area */}
          <div className="row mb-3">
            {/* Map View */}
            {activeView === 'map' && (
              <div className="view-section col-lg-9">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-dark d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Interactive Map</h5>
                    <div>
                      <button className="btn btn-sm btn-outline-secondary me-1">
                        <i className="fas fa-pen"></i> Draw Blockage
                      </button>
                      <button className="btn btn-sm btn-outline-info">
                        <i className="fas fa-location-arrow"></i> My Location
                      </button>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <MapComponent 
                      isEmergencyMode={isEmergencyMode} 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Simulation View */}
            {activeView === 'simulation' && (
              <div className="view-section col-lg-9">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-dark d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Evacuation Simulation</h5>
                    <div>
                      <button className="btn btn-sm btn-success me-1">
                        <i className="fas fa-play"></i> Start
                      </button>
                      <button className="btn btn-sm btn-danger me-1" disabled>
                        <i className="fas fa-stop"></i> Stop
                      </button>
                      <button className="btn btn-sm btn-secondary">
                        <i className="fas fa-redo"></i> Reset
                      </button>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div>Simulation view will be implemented here</div>
                  </div>
                </div>
              </div>
            )}

            {/* Scenarios View */}
            {activeView === 'scenarios' && (
              <div className="view-section col-lg-9">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-dark d-flex justify-content-between align-items-center">
                    <h5 className="m-0">Saved Scenarios</h5>
                    <button className="btn btn-sm btn-primary">
                      <i className="fas fa-plus"></i> New Scenario
                    </button>
                  </div>
                  <div className="card-body">
                    <div>Scenarios view will be implemented here</div>
                  </div>
                </div>
              </div>
            )}

            {/* Control Panel (always visible) */}
            <div className="col-lg-3">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-header bg-dark">
                  <h5 className="m-0">Control Panel</h5>
                </div>
                <div className="card-body">
                  {/* Control panel content based on active view will be implemented here */}
                  <div>Control panel for {activeView} view</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
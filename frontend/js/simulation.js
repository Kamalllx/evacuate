// Simulation module for evacuation planning
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const simulationMap = document.getElementById('simulationMap');
    const startSimBtn = document.getElementById('startSimBtn');
    const stopSimBtn = document.getElementById('stopSimBtn');
    const resetSimBtn = document.getElementById('resetSimBtn');
    const speedSlider = document.getElementById('speedSlider');
    const densitySlider = document.getElementById('densitySlider');
    const timeInput = document.getElementById('timeInput');
    
    // Simulation variables
    let simMap = null;
    let simRunning = false;
    let simSpeed = 5;
    let simDensity = 5;
    let simTime = 30; // minutes
    let simulationInterval = null;
    let agents = [];
    let agentLayers = L.layerGroup();
    let routeLayer = L.layerGroup();
    let blockageLayer = L.layerGroup();
    let evacuationRoutes = [];
    
    // Initialize simulation map
    function initSimulation() {
        // Only initialize once
        if (simMap) {
            resetSimulation();
            return;
        }
        
        // Create map instance
        simMap = L.map('simulationMap', {
            center: [40.7128, -74.0060], // New York City
            zoom: 13,
            zoomControl: false
        });
        
        // Add Leaflet default attribution
        simMap.attributionControl.setPrefix('Powered by Leaflet');
        
        // Add zoom control to top-right
        L.control.zoom({
            position: 'topright'
        }).addTo(simMap);
        
        // Add base tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(simMap);
        
        // Add simulation layers
        agentLayers.addTo(simMap);
        routeLayer.addTo(simMap);
        blockageLayer.addTo(simMap);
        
        // Add simulation control panel
        addSimulationControls();
        
        // Get current scenario from main app
        if (window.appModule) {
            const currentScenario = window.appModule.getCurrentScenario();
            
            // If there's a route, load it into the simulation
            if (currentScenario.route) {
                loadRouteIntoSimulation(currentScenario.route);
            }
            
            // If there are blockages, load them into the simulation
            if (currentScenario.blockages && currentScenario.blockages.length > 0) {
                loadBlockagesIntoSimulation(currentScenario.blockages);
            }
            
            // If there are start and end points, use them
            if (currentScenario.startPoint && currentScenario.endPoint) {
                // Add markers for start and end points
                addStartEndMarkers(currentScenario.startPoint, currentScenario.endPoint);
                
                // If no route is loaded yet, center on start point
                if (!currentScenario.route) {
                    simMap.setView(currentScenario.startPoint, 15);
                }
            }
        }
        
        // Set up event listeners
        setupSimulationEvents();
    }
    
    // Add custom simulation controls
    function addSimulationControls() {
        // Add emergency info panel
        const infoPanel = L.control({ position: 'bottomleft' });
        
        infoPanel.onAdd = function() {
            const div = L.DomUtil.create('div', 'custom-leaflet-control');
            div.innerHTML = `
                <div class="simulation-info p-2">
                    <h6>Simulation Status</h6>
                    <div id="simStatus" class="badge bg-secondary">Ready</div>
                    <hr>
                    <div class="d-flex justify-content-between">
                        <small>Evacuees:</small>
                        <span id="evacueeCount">0</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small>Time Elapsed:</small>
                        <span id="timeElapsed">00:00</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <small>Safe Zone Reached:</small>
                        <span id="safeCount">0%</span>
                    </div>
                </div>
            `;
            return div;
        };
        
        infoPanel.addTo(simMap);
        
        // Add legend
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = function() {
            const div = L.DomUtil.create('div', 'custom-leaflet-control');
            div.innerHTML = `
                <div class="p-2">
                    <h6 class="mb-2">Legend</h6>
                    <div class="d-flex align-items-center mb-1">
                        <div class="me-2" style="width:10px;height:10px;background-color:#007bff;border-radius:50%;"></div>
                        <small>Evacuee</small>
                    </div>
                    <div class="d-flex align-items-center mb-1">
                        <div class="me-2" style="width:10px;height:10px;background-color:#dc3545;border-radius:50%;"></div>
                        <small>In Danger</small>
                    </div>
                    <div class="d-flex align-items-center mb-1">
                        <div class="me-2" style="width:10px;height:10px;background-color:#28a745;border-radius:50%;"></div>
                        <small>Safe</small>
                    </div>
                    <div class="d-flex align-items-center">
                        <div class="me-2" style="width:10px;height:10px;background-color:#ff3300;border:none;"></div>
                        <small>Blockage</small>
                    </div>
                </div>
            `;
            return div;
        };
        
        legend.addTo(simMap);
    }
    
    // Setup simulation event listeners
    function setupSimulationEvents() {
        // Start simulation
        startSimBtn.addEventListener('click', startSimulation);
        
        // Stop simulation
        stopSimBtn.addEventListener('click', stopSimulation);
        
        // Reset simulation
        resetSimBtn.addEventListener('click', resetSimulation);
        
        // Update simulation settings when sliders change
        speedSlider.addEventListener('input', function() {
            simSpeed = parseInt(this.value);
            updateSimulationSpeed();
        });
        
        densitySlider.addEventListener('input', function() {
            simDensity = parseInt(this.value);
            
            // If simulation is not running, update agent count
            if (!simRunning) {
                resetAgents();
                generateAgents();
            }
        });
        
        timeInput.addEventListener('change', function() {
            simTime = parseInt(this.value);
        });
    }
    
    // Load a route from GeoJSON into the simulation
    function loadRouteIntoSimulation(routeData) {
        // Clear previous routes
        routeLayer.clearLayers();
        evacuationRoutes = [];
        
        if (!routeData || !routeData.features || routeData.features.length === 0) {
            console.warn('No valid route data provided');
            return;
        }
        
        // Get the route feature
        const route = routeData.features[0];
        
        // Add route to map
        const routeStyle = {
            color: window.appModule && window.appModule.isEmergencyModeActive() ? '#dc3545' : '#0275d8',
            weight: 5,
            opacity: 0.7
        };
        
        const routePath = L.geoJSON(route, {
            style: routeStyle
        }).addTo(routeLayer);
        
        // Store route for agent movement
        if (route.geometry.type === 'LineString') {
            evacuationRoutes.push(route.geometry.coordinates.map(coord => [coord[1], coord[0]]));
        }
        
        // Fit map to show the route
        simMap.fitBounds(routePath.getBounds(), {
            padding: [50, 50]
        });
    }
    
    // Load blockages into the simulation
    function loadBlockagesIntoSimulation(blockages) {
        blockageLayer.clearLayers();
        
        blockages.forEach(blockage => {
            if (blockage.type === 'polygon' || blockage.type === 'rectangle') {
                L.polygon(blockage.coords, {
                    color: '#ff3300',
                    fillColor: '#ff3300',
                    fillOpacity: 0.3
                }).addTo(blockageLayer);
            }
        });
    }
    
    // Add start and end markers to the map
    function addStartEndMarkers(startPoint, endPoint) {
        // Add start marker
        L.marker(startPoint, {
            icon: L.divIcon({
                html: '<i class="fas fa-map-marker-alt fa-2x"></i>',
                className: 'start-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 20]
            })
        }).addTo(simMap);
        
        // Add end marker
        L.marker(endPoint, {
            icon: L.divIcon({
                html: '<i class="fas fa-flag-checkered fa-2x"></i>',
                className: 'end-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 20]
            })
        }).addTo(simMap);
    }
    
    // Generate evacuation agents along the route
    function generateAgents() {
        if (evacuationRoutes.length === 0) {
            alert('No evacuation routes loaded. Please calculate a route first.');
            return;
        }
        
        // Determine number of agents based on density setting
        const agentCount = simDensity * 20; // 20-200 agents
        
        for (let i = 0; i < agentCount; i++) {
            // Select a random route if there are multiple
            const routeIndex = Math.floor(Math.random() * evacuationRoutes.length);
            const route = evacuationRoutes[routeIndex];
            
            // Place agent at a random position along the route
            const routePosition = Math.random();
            const pointIndex = Math.floor(routePosition * (route.length - 1));
            
            // Interpolate between points for smoother distribution
            const pointA = route[pointIndex];
            const pointB = route[Math.min(pointIndex + 1, route.length - 1)];
            const ratio = routePosition * (route.length - 1) - pointIndex;
            
            const position = [
                pointA[0] + ratio * (pointB[0] - pointA[0]),
                pointA[1] + ratio * (pointB[1] - pointA[1])
            ];
            
            // Create agent
            const agent = {
                id: i,
                position,
                route: route,
                routeIndex: pointIndex,
                progress: routePosition,
                speed: 0.0005 + Math.random() * 0.001, // Random speed
                status: 'active', // active, safe, or danger
                marker: null
            };
            
            // Create marker for the agent
            agent.marker = L.marker(position, {
                icon: L.divIcon({
                    html: '',
                    className: 'agent',
                    iconSize: [8, 8]
                })
            }).addTo(agentLayers);
            
            agents.push(agent);
        }
        
        // Update evacuee count display
        document.getElementById('evacueeCount').textContent = agents.length;
    }
    
    // Start the simulation
    function startSimulation() {
        if (simRunning) return;
        
        // Check if we have routes
        if (evacuationRoutes.length === 0) {
            alert('No evacuation routes loaded. Please calculate a route first.');
            return;
        }
        
        // Generate agents if none exist
        if (agents.length === 0) {
            generateAgents();
        }
        
        // Update UI
        simRunning = true;
        startSimBtn.disabled = true;
        stopSimBtn.disabled = false;
        document.getElementById('simStatus').className = 'badge bg-success';
        document.getElementById('simStatus').textContent = 'Running';
        
        // Start time counter
        let seconds = 0;
        const timeElapsedElement = document.getElementById('timeElapsed');
        
        // Setup simulation interval
        const baseInterval = 100; // ms
        const interval = baseInterval / (simSpeed / 5);
        
        simulationInterval = setInterval(() => {
            // Update agents
            moveAgents();
            
            // Update time display
            seconds++;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timeElapsedElement.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
            
            // Check if simulation should end
            if (minutes >= simTime || agents.every(agent => agent.status !== 'active')) {
                stopSimulation();
            }
            
            // Update safe percentage
            updateSafePercentage();
        }, interval);
    }
    
    // Stop the simulation
    function stopSimulation() {
        if (!simRunning) return;
        
        // Clear interval
        clearInterval(simulationInterval);
        
        // Update UI
        simRunning = false;
        startSimBtn.disabled = false;
        stopSimBtn.disabled = true;
        document.getElementById('simStatus').className = 'badge bg-warning';
        document.getElementById('simStatus').textContent = 'Stopped';
    }
    
    // Reset the simulation
    function resetSimulation() {
        // Stop if running
        if (simRunning) {
            stopSimulation();
        }
        
        // Clear agents
        resetAgents();
        
        // Reset UI
        document.getElementById('simStatus').className = 'badge bg-secondary';
        document.getElementById('simStatus').textContent = 'Ready';
        document.getElementById('timeElapsed').textContent = '00:00';
        document.getElementById('safeCount').textContent = '0%';
        
        // Re-enable start button
        startSimBtn.disabled = false;
    }
    
    // Clear all agents
    function resetAgents() {
        agentLayers.clearLayers();
        agents = [];
        document.getElementById('evacueeCount').textContent = '0';
    }
    
    // Move agents along their routes
    function moveAgents() {
        agents.forEach(agent => {
            if (agent.status !== 'active') return;
            
            // Update progress based on speed and simulation speed
            agent.progress += agent.speed * (simSpeed / 5);
            
            // Calculate new position along the route
            const routeIndex = Math.floor(agent.progress);
            
            // Check if agent has reached the end of the route
            if (routeIndex >= agent.route.length - 1) {
                // Mark as safe
                agent.status = 'safe';
                agent.marker.setIcon(L.divIcon({
                    html: '',
                    className: 'agent bg-success',
                    iconSize: [8, 8]
                }));
                return;
            }
            
            // Interpolate between points
            const pointA = agent.route[routeIndex];
            const pointB = agent.route[Math.min(routeIndex + 1, agent.route.length - 1)];
            const ratio = agent.progress - routeIndex;
            
            const newPosition = [
                pointA[0] + ratio * (pointB[0] - pointA[0]),
                pointA[1] + ratio * (pointB[1] - pointA[1])
            ];
            
            // Update agent position
            agent.position = newPosition;
            agent.marker.setLatLng(newPosition);
            
            // Check for blockages (simplified collision detection)
            const inDanger = checkAgentInDanger(agent);
            if (inDanger && agent.status !== 'danger') {
                agent.status = 'danger';
                agent.marker.setIcon(L.divIcon({
                    html: '',
                    className: 'agent bg-danger',
                    iconSize: [8, 8]
                }));
            }
        });
    }
    
    // Check if agent is in a danger zone
    function checkAgentInDanger(agent) {
        let inDanger = false;
        
        blockageLayer.eachLayer(blockage => {
            if (blockage instanceof L.Polygon) {
                if (isPointInPolygon(agent.position, blockage.getLatLngs()[0])) {
                    inDanger = true;
                }
            }
        });
        
        return inDanger;
    }
    
    // Helper function to check if a point is inside a polygon
    function isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lat, yi = polygon[i].lng;
            const xj = polygon[j].lat, yj = polygon[j].lng;
            
            const intersect = ((yi > point[1]) !== (yj > point[1])) &&
                (point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
    
    // Update simulation speed
    function updateSimulationSpeed() {
        if (!simRunning) return;
        
        // Stop and restart with new speed
        stopSimulation();
        startSimulation();
    }
    
    // Update safe percentage display
    function updateSafePercentage() {
        const safeAgents = agents.filter(agent => agent.status === 'safe').length;
        const percentage = Math.round((safeAgents / agents.length) * 100);
        document.getElementById('safeCount').textContent = `${percentage}%`;
    }
    
    // Export functions to global scope
    window.simulationModule = {
        initSimulation,
        startSimulation,
        stopSimulation,
        resetSimulation
    };
});

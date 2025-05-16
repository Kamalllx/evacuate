// Map functionality module
document.addEventListener('DOMContentLoaded', function() {
    // Map initialization settings
    const defaultCenter = [40.7128, -74.0060]; // New York City
    const defaultZoom = 13;
    
    // Map instance
    let map = null;
    
    // Map layers
    let routeLayer = null;
    let blockagesLayer = null;
    let markersLayer = null;
    
    // Drawing tools
    let drawControl = null;
    let drawnItems = null;
    
    // State variables
    let startMarker = null;
    let endMarker = null;
    let currentRoute = null;
    let isSettingStart = false;
    let isSettingEnd = false;
    
    // DOM Elements
    const mapElem = document.getElementById('map');
    const toggleDrawBtn = document.getElementById('toggleDrawBtn');
    const locateBtn = document.getElementById('locateBtn');
    const startPointInput = document.getElementById('startPointInput');
    const endPointInput = document.getElementById('endPointInput');
    const setStartBtn = document.getElementById('setStartBtn');
    const setEndBtn = document.getElementById('setEndBtn');
    const calculateRouteBtn = document.getElementById('calculateRouteBtn');
    const clearRouteBtn = document.getElementById('clearRouteBtn');
    const travelModeSelect = document.getElementById('travelModeSelect');
    const routeInfoSection = document.getElementById('routeInfoSection');
    const routeDistance = document.getElementById('routeDistance');
    const routeTime = document.getElementById('routeTime');
    const routeDifficulty = document.getElementById('routeDifficulty');
    const routeHazards = document.getElementById('routeHazards');
    
    // Initialize the map
    function initMap() {
        // Create map instance
        map = L.map('map', {
            center: defaultCenter,
            zoom: defaultZoom,
            zoomControl: false
        });
        
        // Add Leaflet default attribution
        map.attributionControl.setPrefix('Powered by Leaflet');
        
        // Add zoom control to top-right
        L.control.zoom({
            position: 'topright'
        }).addTo(map);
        
        // Add base tile layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
        
        // Initialize map layers
        markersLayer = L.layerGroup().addTo(map);
        routeLayer = L.layerGroup().addTo(map);
        blockagesLayer = L.layerGroup().addTo(map);
        
        // Initialize drawing tools
        drawnItems = new L.FeatureGroup().addTo(map);
        
        drawControl = new L.Control.Draw({
            draw: {
                polyline: false,
                circle: false,
                marker: false,
                circlemarker: false,
                rectangle: {
                    shapeOptions: {
                        color: '#ff3300',
                        fillOpacity: 0.3
                    }
                },
                polygon: {
                    shapeOptions: {
                        color: '#ff3300',
                        fillOpacity: 0.3
                    }
                }
            },
            edit: {
                featureGroup: drawnItems
            }
        });
        
        // Don't add the draw control to the map yet - toggle it when needed
        
        // Setup map event listeners
        setupMapEvents();
        
        // Setup button event listeners
        setupButtonListeners();
        
        // Add scale control
        L.control.scale().addTo(map);
        
        // Add custom legend
        addMapLegend();
    }
    
    // Set up map event listeners
    function setupMapEvents() {
        // Handle drawn items
        map.on(L.Draw.Event.CREATED, function(event) {
            const layer = event.layer;
            drawnItems.addLayer(layer);
            
            // Store the blockage in the current scenario
            const blockage = {
                type: event.layerType,
                coords: layer.getLatLngs ? layer.getLatLngs() : layer.getLatLng()
            };
            
            // Update current scenario with blockage
            if (window.appModule) {
                const currentScenario = window.appModule.getCurrentScenario();
                const blockages = [...currentScenario.blockages, blockage];
                window.appModule.updateScenario({ blockages });
            }
            
            // If a route is already calculated, recalculate to avoid the blockage
            if (startMarker && endMarker) {
                calculateRoute();
            }
        });
        
        // Handle deleted drawn items
        map.on(L.Draw.Event.DELETED, function(event) {
            // Update current scenario by removing blockages
            if (window.appModule) {
                // This is simplified - in a real app, we'd need a better way to identify which blockages were removed
                const currentScenario = window.appModule.getCurrentScenario();
                window.appModule.updateScenario({ blockages: [] });
                
                // Re-add the remaining blockages from drawnItems
                drawnItems.eachLayer(layer => {
                    const blockage = {
                        type: layer instanceof L.Polygon ? 'polygon' : 'rectangle',
                        coords: layer.getLatLngs()
                    };
                    currentScenario.blockages.push(blockage);
                });
                
                // If a route is already calculated, recalculate to account for the change
                if (startMarker && endMarker) {
                    calculateRoute();
                }
            }
        });
        
        // Handle map click for setting markers
        map.on('click', function(e) {
            if (isSettingStart) {
                setStartPoint([e.latlng.lat, e.latlng.lng]);
                isSettingStart = false;
            } else if (isSettingEnd) {
                setEndPoint([e.latlng.lat, e.latlng.lng]);
                isSettingEnd = false;
            }
        });
    }
    
    // Set up button event listeners
    function setupButtonListeners() {
        // Toggle draw control
        toggleDrawBtn.addEventListener('click', function() {
            if (map.hasLayer(drawControl)) {
                map.removeControl(drawControl);
                toggleDrawBtn.innerHTML = '<i class="fas fa-pen"></i> Draw Blockage';
            } else {
                map.addControl(drawControl);
                toggleDrawBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Draw';
            }
        });
        
        // Locate user
        locateBtn.addEventListener('click', getUserLocation);
        
        // Set start/end points
        setStartBtn.addEventListener('click', function() {
            isSettingStart = true;
            isSettingEnd = false;
            map.getContainer().style.cursor = 'crosshair';
            alert('Click on the map to set your starting point');
        });
        
        setEndBtn.addEventListener('click', function() {
            isSettingEnd = true;
            isSettingStart = false;
            map.getContainer().style.cursor = 'crosshair';
            alert('Click on the map to set your destination point');
        });
        
        // Calculate route
        calculateRouteBtn.addEventListener('click', calculateRoute);
        
        // Clear route
        clearRouteBtn.addEventListener('click', clearRoute);
    }
    
    // Add a custom legend to the map
    function addMapLegend() {
        const legend = L.control({ position: 'bottomright' });
        
        legend.onAdd = function(map) {
            const div = L.DomUtil.create('div', 'info legend bg-dark p-2 rounded');
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
    }
    
    // Get user's current location
    function getUserLocation() {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }
        
        locateBtn.disabled = true;
        locateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        
        navigator.geolocation.getCurrentPosition(
            // Success callback
            function(position) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Set as start point
                setStartPoint([lat, lng]);
                
                // Center map on location
                map.setView([lat, lng], 15);
                
                // Re-enable button
                locateBtn.disabled = false;
                locateBtn.innerHTML = '<i class="fas fa-location-arrow"></i> My Location';
            },
            // Error callback
            function(error) {
                let errorMessage = 'Unable to retrieve your location';
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'User denied the request for geolocation';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'The request to get user location timed out';
                        break;
                    case error.UNKNOWN_ERROR:
                        errorMessage = 'An unknown error occurred';
                        break;
                }
                
                alert(errorMessage);
                
                // Re-enable button
                locateBtn.disabled = false;
                locateBtn.innerHTML = '<i class="fas fa-location-arrow"></i> My Location';
            },
            // Options
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }
    
    // Set start point
    function setStartPoint(coords) {
        // Clear previous marker
        if (startMarker) {
            markersLayer.removeLayer(startMarker);
        }
        
        // Create new marker
        startMarker = L.marker(coords, {
            icon: L.divIcon({
                html: '<i class="fas fa-map-marker-alt fa-2x"></i>',
                className: 'start-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 20]
            })
        }).addTo(markersLayer);
        
        // Update input field
        startPointInput.value = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
        
        // Update current scenario
        if (window.appModule) {
            window.appModule.updateScenario({ startPoint: coords });
        }
        
        // Reset cursor
        map.getContainer().style.cursor = '';
    }
    
    // Set end point
    function setEndPoint(coords) {
        // Clear previous marker
        if (endMarker) {
            markersLayer.removeLayer(endMarker);
        }
        
        // Create new marker
        endMarker = L.marker(coords, {
            icon: L.divIcon({
                html: '<i class="fas fa-flag-checkered fa-2x"></i>',
                className: 'end-marker',
                iconSize: [20, 20],
                iconAnchor: [10, 20]
            })
        }).addTo(markersLayer);
        
        // Update input field
        endPointInput.value = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
        
        // Update current scenario
        if (window.appModule) {
            window.appModule.updateScenario({ endPoint: coords });
        }
        
        // Reset cursor
        map.getContainer().style.cursor = '';
    }
    
    // Calculate route between start and end points
    function calculateRoute() {
        // Validate that start and end points are set
        if (!startMarker || !endMarker) {
            alert('Please set both start and end points first');
            return;
        }
        
        // Clear previous route
        routeLayer.clearLayers();
        
        // Show loading state
        calculateRouteBtn.disabled = true;
        calculateRouteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
        
        // Get coordinates
        const startCoords = [startMarker.getLatLng().lng, startMarker.getLatLng().lat];
        const endCoords = [endMarker.getLatLng().lng, endMarker.getLatLng().lat];
        
        // Get travel mode
        const profile = travelModeSelect.value;
        
        // Prepare request data
        const requestData = {
            coordinates: [startCoords, endCoords],
            profile: profile
        };
        
        // Add avoid_polygons if there are any blockages
        if (drawnItems.getLayers().length > 0) {
            const avoidPolygons = {
                type: 'MultiPolygon',
                coordinates: []
            };
            
            drawnItems.eachLayer(layer => {
                // Convert Leaflet layer to GeoJSON
                if (layer instanceof L.Polygon) {
                    const coords = layer.getLatLngs()[0].map(latlng => [latlng.lng, latlng.lat]);
                    // Close the polygon by adding the first point at the end
                    coords.push(coords[0]);
                    avoidPolygons.coordinates.push([coords]);
                }
            });
            
            if (avoidPolygons.coordinates.length > 0) {
                requestData.avoid_polygons = avoidPolygons;
            }
        }
        
        // Make API request
        fetch('/api/directions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Process and display the route
            displayRoute(data);
            
            // Update route info section
            updateRouteInfo(data);
            
            // Update current scenario
            if (window.appModule) {
                window.appModule.updateScenario({ route: data });
            }
            
            // Reset button
            calculateRouteBtn.disabled = false;
            calculateRouteBtn.innerHTML = '<i class="fas fa-route me-1"></i> Calculate Route';
        })
        .catch(error => {
            console.error('Error calculating route:', error);
            alert('Error calculating route: ' + error.message);
            
            // Reset button
            calculateRouteBtn.disabled = false;
            calculateRouteBtn.innerHTML = '<i class="fas fa-route me-1"></i> Calculate Route';
        });
    }
    
    // Display the calculated route on the map
    function displayRoute(routeData) {
        if (!routeData || !routeData.features || routeData.features.length === 0) {
            alert('No route found');
            return;
        }
        
        // Get the route geometry
        const route = routeData.features[0];
        
        // Create GeoJSON layer for the route
        currentRoute = L.geoJSON(route, {
            style: function(feature) {
                return {
                    color: window.appModule && window.appModule.isEmergencyModeActive() ? '#dc3545' : '#0275d8',
                    weight: 5,
                    opacity: 0.7,
                    lineJoin: 'round',
                    lineCap: 'round',
                    className: 'route-animation'
                };
            }
        }).addTo(routeLayer);
        
        // Fit the map to show the entire route
        map.fitBounds(currentRoute.getBounds(), {
            padding: [50, 50]
        });
        
        // Show route info section
        routeInfoSection.classList.remove('d-none');
    }
    
    // Update route information panel
    function updateRouteInfo(routeData) {
        if (!routeData || !routeData.features || routeData.features.length === 0) {
            return;
        }
        
        const properties = routeData.features[0].properties;
        
        // Update distance
        const distanceKm = (properties.summary.distance / 1000).toFixed(2);
        routeDistance.textContent = `${distanceKm} km`;
        
        // Update time
        const timeMinutes = Math.round(properties.summary.duration / 60);
        routeTime.textContent = `${timeMinutes} minutes`;
        
        // Calculate difficulty based on distance and any ascent data
        let difficulty = 'Easy';
        if (distanceKm > 5) {
            difficulty = 'Moderate';
        }
        if (distanceKm > 10) {
            difficulty = 'Difficult';
        }
        routeDifficulty.textContent = difficulty;
        
        // Update hazards based on blockages
        if (drawnItems.getLayers().length > 0) {
            routeHazards.textContent = `${drawnItems.getLayers().length} blockage(s) avoided`;
        } else {
            routeHazards.textContent = 'None detected';
        }
    }
    
    // Clear the current route
    function clearRoute() {
        routeLayer.clearLayers();
        currentRoute = null;
        
        // Hide route info section
        routeInfoSection.classList.add('d-none');
        
        // Update current scenario
        if (window.appModule) {
            window.appModule.updateScenario({ route: null });
        }
    }
    
    // Set location from search results
    function setLocationFromSearch(coords, name) {
        // Set as start point by default
        setStartPoint(coords);
        
        // Center map on location
        map.setView(coords, 15);
        
        // Show popup with location name
        L.popup()
            .setLatLng(coords)
            .setContent(`<p>${name}</p><button class="btn btn-sm btn-primary set-as-end-btn">Set as Destination</button>`)
            .openOn(map);
        
        // Add event listener to the button in the popup
        setTimeout(() => {
            document.querySelector('.set-as-end-btn').addEventListener('click', function() {
                setEndPoint(coords);
                map.closePopup();
            });
        }, 100);
    }
    
    // Set emergency mode styling
    function setEmergencyMode(active) {
        // Update map styling for emergency mode
        if (currentRoute) {
            routeLayer.clearLayers();
            
            if (active) {
                // Re-add with emergency styling
                currentRoute.setStyle({
                    color: '#dc3545',
                    weight: 6,
                    opacity: 0.8
                });
            } else {
                // Re-add with normal styling
                currentRoute.setStyle({
                    color: '#0275d8',
                    weight: 5,
                    opacity: 0.7
                });
            }
            
            currentRoute.addTo(routeLayer);
        }
    }
    
    // Initialize the map
    initMap();
    
    // Export functions to global scope for use by other modules
    window.mapModule = {
        getMap: () => map,
        setStartPoint,
        setEndPoint,
        calculateRoute,
        clearRoute,
        setLocationFromSearch,
        setEmergencyMode
    };
});

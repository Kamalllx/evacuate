// Routes calculation module
document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateRouteBtn = document.getElementById('calculateRouteBtn');
    const clearRouteBtn = document.getElementById('clearRouteBtn');
    const travelModeSelect = document.getElementById('travelModeSelect');
    const routeInfoSection = document.getElementById('routeInfoSection');
    
    // Prepare the avoid polygons GeoJSON from drawn items
    function prepareAvoidPolygons(drawnItems) {
        if (!drawnItems || drawnItems.getLayers().length === 0) {
            return null;
        }
        
        const avoidPolygons = {
            type: 'MultiPolygon',
            coordinates: []
        };
        
        drawnItems.eachLayer(layer => {
            if (layer instanceof L.Polygon) {
                const coords = layer.getLatLngs()[0].map(latlng => [latlng.lng, latlng.lat]);
                // Close the polygon by adding the first point at the end
                coords.push(coords[0]);
                avoidPolygons.coordinates.push([coords]);
            }
        });
        
        return avoidPolygons.coordinates.length > 0 ? avoidPolygons : null;
    }
    
    // Calculate isochrones (areas reachable within time limits)
    function calculateIsochrones(location, ranges = [300, 600, 900], profile = 'foot-walking') {
        return new Promise((resolve, reject) => {
            // Validate inputs
            if (!location || !Array.isArray(location) || location.length !== 2) {
                reject(new Error('Invalid location'));
                return;
            }
            
            // Prepare request data
            const requestData = {
                location: [location[1], location[0]], // [lng, lat] format for ORS API
                ranges,
                profile
            };
            
            // Make API request
            fetch('/api/isochrones', {
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
                resolve(data);
            })
            .catch(error => {
                console.error('Error calculating isochrones:', error);
                reject(error);
            });
        });
    }
    
    // Format time from seconds
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            const remainingMinutes = minutes % 60;
            return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} min` : ''}`;
        } else {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
    }
    
    // Format distance from meters
    function formatDistance(meters) {
        if (meters < 1000) {
            return `${meters.toFixed(0)} m`;
        } else {
            return `${(meters / 1000).toFixed(2)} km`;
        }
    }
    
    // Get elevation profile for a route
    function getElevationProfile(routeGeometry) {
        // This function would make API calls to get elevation data for points along the route
        // For this MVP, we'll return a Promise that resolves with dummy data
        return new Promise((resolve) => {
            // Dummy elevation data
            const elevationProfile = {
                heights: [10, 12, 15, 20, 18, 16, 14, 10],
                maxAscent: 10,
                maxDescent: 10,
                totalAscent: 15,
                totalDescent: 15
            };
            
            setTimeout(() => {
                resolve(elevationProfile);
            }, 500);
        });
    }
    
    // Get assembly areas near the route
    function getAssemblyAreas(bbox) {
        // In a full implementation, this would query a database or API for designated assembly areas
        // For this MVP, we'll return a Promise that resolves with dummy data
        return new Promise((resolve) => {
            // Dummy assembly areas
            const assemblyAreas = [
                {
                    name: "Central Park Assembly Area",
                    location: [40.7812, -73.9665],
                    capacity: 5000,
                    facilities: ["water", "medical", "shelter"]
                },
                {
                    name: "Battery Park Assembly Area",
                    location: [40.7033, -74.0170],
                    capacity: 2000,
                    facilities: ["water", "medical"]
                }
            ];
            
            setTimeout(() => {
                resolve(assemblyAreas);
            }, 300);
        });
    }
    
    // Export functions for use by other modules
    window.routesModule = {
        prepareAvoidPolygons,
        calculateIsochrones,
        formatTime,
        formatDistance,
        getElevationProfile,
        getAssemblyAreas
    };
});

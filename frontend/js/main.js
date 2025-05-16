// Main application logic
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips and popovers
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize global variables
    let currentScenario = {
        name: '',
        description: '',
        startPoint: null,
        endPoint: null,
        blockages: [],
        route: null
    };

    let isEmergencyMode = false;
    let activeView = 'map';

    // DOM Elements
    const heroSection = document.getElementById('heroSection');
    const startPlanningBtn = document.getElementById('startPlanningBtn');
    const emergencyModeBtn = document.getElementById('emergencyModeBtn');
    const emergencyExitBtn = document.getElementById('emergencyExitBtn');
    const viewScenariosBtn = document.getElementById('viewScenariosBtn');
    const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
    const viewSections = document.querySelectorAll('.view-section');

    // Get control panel elements
    const routeConfig = document.getElementById('routeConfig');
    const simulationControls = document.getElementById('simulationControls');
    const scenarioControls = document.getElementById('scenarioControls');

    // Modal instances
    const emergencyModal = new bootstrap.Modal(document.getElementById('emergencyModal'));
    const saveSuccessModal = new bootstrap.Modal(document.getElementById('saveSuccessModal'));
    const locationModal = new bootstrap.Modal(document.getElementById('locationModal'));

    // Event Listeners
    startPlanningBtn.addEventListener('click', () => {
        // Hide hero section and show map
        heroSection.classList.add('d-none');
        scrollToMap();
    });

    emergencyModeBtn.addEventListener('click', toggleEmergencyMode);
    emergencyExitBtn.addEventListener('click', toggleEmergencyMode);
    viewScenariosBtn.addEventListener('click', () => {
        saveSuccessModal.hide();
        switchView('scenarios');
    });

    // View navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const viewName = this.getAttribute('data-view');
            switchView(viewName);
        });
    });

    // Document initialization functions
    function initApp() {
        // Initialize map view as default (handled in map.js)
        searchSetup();
        // Fetch initial scenarios (would connect to backend in full implementation)
        fetchScenarios();
    }

    // Set up search functionality
    function searchSetup() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const searchResults = document.getElementById('searchResults');

        searchBtn.addEventListener('click', () => {
            performSearch(searchInput.value);
        });

        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                performSearch(this.value);
            }
        });

        // Modal search
        const modalSearchInput = document.getElementById('modalSearchInput');
        const modalSearchResults = document.getElementById('modalSearchResults');
        
        modalSearchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                performModalSearch(this.value);
            }
        });
    }

    // Search for location
    function performSearch(query) {
        if (!query.trim()) return;
        
        const searchResults = document.getElementById('searchResults');
        searchResults.innerHTML = '<div class="text-center p-2"><div class="spinner-border spinner-border-sm" role="status"></div> Searching...</div>';
        searchResults.classList.remove('d-none');
        
        fetch(`/api/geocode?query=${encodeURIComponent(query)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                displaySearchResults(data, searchResults);
            })
            .catch(error => {
                searchResults.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            });
    }

    // Display search results
    function displaySearchResults(results, container) {
        if (!results || results.length === 0) {
            container.innerHTML = '<div class="alert alert-warning">No results found</div>';
            return;
        }
        
        container.innerHTML = '';
        results.forEach(result => {
            const item = document.createElement('button');
            item.className = 'list-group-item list-group-item-action';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${result.display_name.split(',')[0]}</strong>
                        <br>
                        <small>${result.display_name}</small>
                    </div>
                    <span class="badge bg-secondary">${result.type || 'Location'}</span>
                </div>
            `;
            
            item.addEventListener('click', () => {
                // Handle location selection - this function will be in map.js
                if (window.mapModule) {
                    window.mapModule.setLocationFromSearch([result.lat, result.lon], result.display_name);
                }
                container.classList.add('d-none');
            });
            
            container.appendChild(item);
        });
    }

    // Search in modal
    function performModalSearch(query) {
        // Similar to main search but for the modal
        const modalSearchResults = document.getElementById('modalSearchResults');
        
        modalSearchResults.innerHTML = '<div class="text-center p-2"><div class="spinner-border spinner-border-sm" role="status"></div> Searching...</div>';
        
        fetch(`/api/geocode?query=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                displayModalSearchResults(data);
            })
            .catch(error => {
                modalSearchResults.innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
            });
    }

    // Display modal search results
    function displayModalSearchResults(results) {
        const modalSearchResults = document.getElementById('modalSearchResults');
        
        if (!results || results.length === 0) {
            modalSearchResults.innerHTML = '<div class="alert alert-warning">No results found</div>';
            return;
        }
        
        modalSearchResults.innerHTML = '';
        results.forEach(result => {
            const item = document.createElement('button');
            item.className = 'list-group-item list-group-item-action';
            item.innerHTML = `
                <div>
                    <strong>${result.display_name.split(',')[0]}</strong>
                    <br>
                    <small>${result.display_name}</small>
                </div>
            `;
            
            item.addEventListener('click', () => {
                // Fill in coordinate inputs
                document.getElementById('latInput').value = result.lat;
                document.getElementById('lngInput').value = result.lon;
            });
            
            modalSearchResults.appendChild(item);
        });
    }

    // Fetch saved scenarios (would connect to backend in full implementation)
    function fetchScenarios() {
        const scenariosList = document.getElementById('scenariosList');
        
        // In a real app, this would fetch from the backend
        fetch('/api/scenarios')
            .then(response => response.json())
            .then(scenarios => {
                if (scenarios.length === 0) {
                    // Show empty state
                    scenariosList.innerHTML = `
                        <div class="text-center p-5">
                            <i class="fas fa-folder-open fa-3x mb-3 text-muted"></i>
                            <p class="text-muted">No saved scenarios yet. Create a new one to get started.</p>
                        </div>
                    `;
                } else {
                    scenariosList.innerHTML = '';
                    scenarios.forEach(scenario => {
                        const card = document.createElement('div');
                        card.className = 'list-group-item list-group-item-action scenario-card mb-2';
                        card.innerHTML = `
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="mb-1">${scenario.name}</h5>
                                    <p class="mb-1">${scenario.description || 'No description provided'}</p>
                                </div>
                                <div>
                                    <button class="btn btn-sm btn-outline-primary me-1 load-scenario-btn" data-id="${scenario.id}">
                                        <i class="fas fa-folder-open"></i> Load
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger delete-scenario-btn" data-id="${scenario.id}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                        
                        scenariosList.appendChild(card);
                    });
                    
                    // Add event listeners to newly created buttons
                    document.querySelectorAll('.load-scenario-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const scenarioId = e.target.closest('button').getAttribute('data-id');
                            loadScenario(scenarioId);
                        });
                    });
                    
                    document.querySelectorAll('.delete-scenario-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const scenarioId = e.target.closest('button').getAttribute('data-id');
                            deleteScenario(scenarioId);
                        });
                    });
                }
            })
            .catch(error => {
                console.error('Error fetching scenarios:', error);
                scenariosList.innerHTML = `
                    <div class="alert alert-danger">
                        Error loading scenarios. Please try again later.
                    </div>
                `;
            });
    }

    // Load a saved scenario
    function loadScenario(id) {
        // In a real app, this would fetch scenario details from the backend
        // For now, just show a message and switch to map view
        alert(`Loading scenario ${id}...`);
        switchView('map');
    }

    // Delete a scenario
    function deleteScenario(id) {
        // In a real app, this would send a delete request to the backend
        if (confirm('Are you sure you want to delete this scenario?')) {
            alert(`Scenario ${id} deleted`);
            fetchScenarios(); // Refresh the list
        }
    }

    // Toggle emergency mode
    function toggleEmergencyMode() {
        isEmergencyMode = !isEmergencyMode;
        
        const body = document.querySelector('body');
        if (isEmergencyMode) {
            body.classList.add('emergency-mode');
            emergencyModal.show();
        } else {
            body.classList.remove('emergency-mode');
            emergencyModal.hide();
        }
        
        // Update map appearance for emergency mode
        if (window.mapModule) {
            window.mapModule.setEmergencyMode(isEmergencyMode);
        }
    }

    // Switch between views
    function switchView(viewName) {
        // Update nav links
        navLinks.forEach(link => {
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Hide all views
        viewSections.forEach(section => {
            section.classList.add('d-none');
        });
        
        // Show selected view
        const selectedView = document.getElementById(`${viewName}View`);
        if (selectedView) {
            selectedView.classList.remove('d-none');
        }
        
        // Update control panel
        updateControlPanel(viewName);
        
        // If switching to simulation view, initialize simulation map
        if (viewName === 'simulation' && window.simulationModule) {
            window.simulationModule.initSimulation();
        }
        
        activeView = viewName;
    }

    // Update control panel based on active view
    function updateControlPanel(viewName) {
        // Hide all control groups
        routeConfig.classList.add('d-none');
        simulationControls.classList.add('d-none');
        scenarioControls.classList.add('d-none');
        
        // Show appropriate control group
        switch (viewName) {
            case 'map':
                routeConfig.classList.remove('d-none');
                break;
            case 'simulation':
                simulationControls.classList.remove('d-none');
                break;
            case 'scenarios':
                scenarioControls.classList.remove('d-none');
                break;
        }
    }

    // Scroll to map section
    function scrollToMap() {
        const mapView = document.getElementById('mapView');
        mapView.scrollIntoView({ behavior: 'smooth' });
    }

    // Initialize the application
    initApp();

    // Export functions to global scope for use by other modules
    window.appModule = {
        getCurrentScenario: () => currentScenario,
        updateScenario: (updates) => {
            currentScenario = { ...currentScenario, ...updates };
        },
        isEmergencyModeActive: () => isEmergencyMode,
        showLocationModal: () => locationModal.show(),
        showSuccessModal: () => saveSuccessModal.show()
    };
});

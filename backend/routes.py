import os
import json
import logging
import requests
from flask import jsonify, request

# Global variables
ORS_API_KEY = os.environ.get('ORS_API_KEY', 'your_openrouteservice_key')
ORS_BASE_URL = "https://api.openrouteservice.org/v2"

def register_routes(app):
    @app.route('/api/health', methods=['GET'])
    def health_check():
        """Simple health check endpoint"""
        return jsonify({'status': 'healthy'})

    @app.route('/api/geocode', methods=['GET'])
    def geocode():
        """Geocode a location name to coordinates using Nominatim"""
        query = request.args.get('query')
        if not query:
            return jsonify({'error': 'Query parameter is required'}), 400
        
        try:
            # Using Nominatim API (OpenStreetMap)
            nominatim_url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=5"
            response = requests.get(nominatim_url, headers={'User-Agent': 'EvacuationPlanner/1.0'})
            response.raise_for_status()
            
            results = response.json()
            if not results:
                return jsonify({'error': 'No results found'}), 404
                
            formatted_results = []
            for result in results:
                formatted_results.append({
                    'display_name': result.get('display_name'),
                    'lat': float(result.get('lat')),
                    'lon': float(result.get('lon')),
                    'type': result.get('type')
                })
                
            return jsonify(formatted_results)
            
        except requests.exceptions.RequestException as e:
            logging.error(f"Geocoding error: {str(e)}")
            return jsonify({'error': 'Geocoding service unavailable', 'details': str(e)}), 503

    @app.route('/api/directions', methods=['POST'])
    def get_directions():
        """Get directions between points, with optional blockages"""
        data = request.json
        
        if not data or 'coordinates' not in data:
            return jsonify({'error': 'Invalid request. Coordinates are required'}), 400
            
        try:
            coordinates = data['coordinates']
            avoid_polygons = data.get('avoid_polygons', None)
            profile = data.get('profile', 'foot-walking')
            
            # Build request to OpenRouteService
            ors_headers = {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json; charset=utf-8'
            }
            
            payload = {
                'coordinates': coordinates,
                'format': 'geojson'
            }
            
            if avoid_polygons:
                payload['options'] = {
                    'avoid_polygons': avoid_polygons
                }
            
            # Make request to OpenRouteService with the specific profile in the URL
            response = requests.post(
                f"{ORS_BASE_URL}/directions/{profile}/json",
                headers=ors_headers,
                json=payload
            )
            response.raise_for_status()
            
            return jsonify(response.json())
            
        except requests.exceptions.RequestException as e:
            logging.error(f"Directions API error: {str(e)}")
            return jsonify({'error': 'Routing service unavailable', 'details': str(e)}), 503
        except Exception as e:
            logging.error(f"Unexpected error: {str(e)}")
            return jsonify({'error': 'Server error', 'details': str(e)}), 500

    @app.route('/api/isochrones', methods=['POST'])
    def get_isochrones():
        """Get isochrones (areas reachable within a time limit) from a point"""
        data = request.json
        
        if not data or 'location' not in data:
            return jsonify({'error': 'Invalid request. Location is required'}), 400
            
        try:
            location = data['location']
            ranges = data.get('ranges', [300, 600, 900])  # Default: 5, 10, 15 minutes (in seconds)
            profile = data.get('profile', 'foot-walking')
            
            # Build request to OpenRouteService
            ors_headers = {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json; charset=utf-8'
            }
            
            payload = {
                'locations': [location],
                'range': ranges,
                'profile': profile,
                'range_type': 'time',
                'format': 'geojson'
            }
            
            # Make request to OpenRouteService
            response = requests.post(
                f"{ORS_BASE_URL}/isochrones",
                headers=ors_headers,
                json=payload
            )
            response.raise_for_status()
            
            return jsonify(response.json())
            
        except requests.exceptions.RequestException as e:
            logging.error(f"Isochrones API error: {str(e)}")
            return jsonify({'error': 'Isochrones service unavailable', 'details': str(e)}), 503
        except Exception as e:
            logging.error(f"Unexpected error: {str(e)}")
            return jsonify({'error': 'Server error', 'details': str(e)}), 500

    @app.route('/api/elevation', methods=['GET'])
    def get_elevation():
        """Get elevation data for coordinates"""
        try:
            lat = request.args.get('lat')
            lon = request.args.get('lon')
            
            if not lat or not lon:
                return jsonify({'error': 'Latitude and longitude are required'}), 400
                
            # Using OpenTopoData API
            url = f"https://api.opentopodata.org/v1/ned10m?locations={lat},{lon}"
            response = requests.get(url)
            response.raise_for_status()
            
            return jsonify(response.json())
            
        except requests.exceptions.RequestException as e:
            logging.error(f"Elevation API error: {str(e)}")
            return jsonify({'error': 'Elevation service unavailable', 'details': str(e)}), 503
        except Exception as e:
            logging.error(f"Unexpected error: {str(e)}")
            return jsonify({'error': 'Server error', 'details': str(e)}), 500

    @app.route('/api/scenarios', methods=['GET', 'POST'])
    def handle_scenarios():
        """Save and load evacuation scenarios"""
        if request.method == 'POST':
            # In a real app, this would save to a database
            # For this MVP, we'll just return success
            return jsonify({'status': 'success', 'message': 'Scenario saved'})
        else:
            # In a real app, this would load from a database
            # For this MVP, we'll return a sample set of scenarios
            return jsonify([
                {
                    'id': 1,
                    'name': 'Sample Scenario',
                    'description': 'This is a sample evacuation scenario'
                }
            ])

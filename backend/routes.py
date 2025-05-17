import os
import json
import logging
import requests
import time

from flask import jsonify, request
from .app import app

ORS_API_KEY = "5b3ce3597851110001cf62489b031f958d374401839da05f388b2306"
ORS_BASE_URL = "https://api.openrouteservice.org/v2"
TOMTOM_API_KEY = '9RMtR8Pfucbdaw93oeLv2XVFulo2Nkon'
def register_routes(app):

    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({'status': 'healthy'})

    @app.route('/api/geocode', methods=['GET'])
    def geocode():
        query = request.args.get('query')
        if not query:
            return jsonify({'error': 'Query parameter is required'}), 400
        try:
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
        data = request.json
        if not data or 'coordinates' not in data:
            return jsonify({'error': 'Invalid request. Coordinates are required'}), 400
        try:
            coordinates = data['coordinates']
            avoid_polygons = data.get('avoid_polygons', None)
            profile = data.get('profile', 'foot-walking')
            ors_headers = {
                'Authorization': ORS_API_KEY,
                'Content-Type': 'application/json; charset=utf-8'
            }
            payload = {
                'coordinates': coordinates,
                'format': 'geojson'
            }
            if avoid_polygons:
                payload['options'] = {'avoid_polygons': avoid_polygons}
            response = requests.post(
                f"{ORS_BASE_URL}/directions/{profile}/geojson",
                headers=ors_headers,
                json=payload
            )
            if response.status_code == 404:
                return jsonify({'error': 'No route found for the selected region/profile.'}), 404
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
        data = request.json
        if not data or 'location' not in data:
            return jsonify({'error': 'Invalid request. Location is required'}), 400
        try:
            location = data['location']
            ranges = data.get('ranges', [300, 600, 900])
            profile = data.get('profile', 'foot-walking')
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
        try:
            lat = request.args.get('lat')
            lon = request.args.get('lon')
            if not lat or not lon:
                return jsonify({'error': 'Latitude and longitude are required'}), 400
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
        if request.method == 'POST':
            return jsonify({'status': 'success', 'message': 'Scenario saved'})
        else:
            return jsonify([{
                'id': 1,
                'name': 'Sample Scenario',
                'description': 'This is a sample evacuation scenario'
            }])

    @app.route('/api/traffic/route', methods=['POST'])
    def traffic_route():
        data = request.get_json()
        coordinates = data.get('coordinates')
        # This is a placeholder; TomTom's API expects a single point or segment, not a route
        # For demo, just use the first point
        if not coordinates or len(coordinates) < 1:
            return jsonify({'error': 'No coordinates provided'}), 400
        lat, lng = coordinates[0][1], coordinates[0][0]
        url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lng}&key={TOMTOM_API_KEY}"
        response = requests.get(url)
        return jsonify(response.json()), response.status_code

    @app.route('/api/traffic/density', methods=['POST'])
    def traffic_density():
        """
        Expects: { "points": [[lat, lon], [lat, lon], ...] }
        Returns: [{ "lat": ..., "lon": ..., "currentSpeed": ..., "freeFlowSpeed": ..., "jamFactor": ... }, ...]
        """
        data = request.get_json()
        points = data.get('points')
        if not points or not isinstance(points, list):
            return jsonify({'error': 'points must be a list of [lat, lon]'}), 400

        results = []
        for pt in points:
            try:
                lat, lon = pt
                url = (
                    f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
                    f"?point={lat},{lon}&unit=KMPH&key={TOMTOM_API_KEY}"
                )
                resp = requests.get(url)
                if resp.status_code == 200:
                    flow = resp.json().get('flowSegmentData', {})
                    results.append({
                        "lat": lat,
                        "lon": lon,
                        "currentSpeed": flow.get("currentSpeed"),
                        "freeFlowSpeed": flow.get("freeFlowSpeed"),
                        "jamFactor": flow.get("currentTravelTime"),
                        "frc": flow.get("frc"),
                        "confidence": flow.get("confidence")
                    })
                else:
                    results.append({"lat": lat, "lon": lon, "error": resp.text})
                print(results)

            except Exception as e:
                results.append({"lat": pt[0], "lon": pt[1], "error": str(e)})
        return jsonify(results)

    @app.route('/api/traffic/route-analysis', methods=['POST'])
    def route_analysis():
        data = request.get_json()
        coordinates = data.get('coordinates') # [[lng, lat], ...]
        job_name = data.get('jobName', 'EvacRouteJob')
        route = {
            "name": "Evacuation Route",
            "start": {"latitude": coordinates[0][1], "longitude": coordinates[0][0]},
            "end": {"latitude": coordinates[-1][1], "longitude": coordinates[-1][0]},
            "fullTraversal": True,
            "probeSource": "ALL"
        }
        if len(coordinates) > 2:
            route["via"] = [{"latitude": lat, "longitude": lng} for lng, lat in coordinates[1:-1]]
        body = {
            "jobName": job_name,
            "distanceUnit": "KILOMETERS",
            "mapType": "GENESIS",
            "routes": [route],
            "dateRanges": [{
                "name": "Recent",
                "from": "2025-05-01",
                "to": "2025-05-07"
            }],
            "timeSets": [{
                "name": "AllDay",
                "timeGroups": [{"days": ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"], "times": ["0:00-23:59"]}]
            }]
        }
        url = f"https://api.tomtom.com/traffic/trafficstats/routeanalysis/1?key={TOMTOM_API_KEY}"
        resp = requests.post(url, json=body, headers={"Content-Type": "application/json"})
        if resp.status_code != 200:
            print("TomTom Route Analysis submission failed:", resp.text)
            return jsonify({"error": "TomTom Route Analysis failed", "details": resp.text}), 500
        job_id = resp.json().get("jobId")
        print(f"Submitted TomTom Route Analysis job: {job_id}")
        print("Request body:", body)
        # Poll for job completion and print result link
        status_url = f"https://api.tomtom.com/traffic/trafficstats/routeanalysis/1/{job_id}?key={TOMTOM_API_KEY}"
        status_json = {}
        for _ in range(10):
            status_resp = requests.get(status_url)
            status_json = status_resp.json()
            print("TomTom job status:", status_json.get("status"))
            if status_json.get("status") == "COMPLETED":
                print("Result links:", status_json.get("resultUrls"))
                break
            time.sleep(2)
        return jsonify({"jobId": job_id, "status": status_json.get("status"), "resultUrls": status_json.get("resultUrls")})

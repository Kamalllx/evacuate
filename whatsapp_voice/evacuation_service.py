import random
import logging
import json
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

def process_evacuation_routes(location):
    """Process evacuation routes based on location"""
    logger.info(f"Processing evacuation routes for location: {location}")
    
    # Instead of making API calls, generate mock routes
    routes = generate_mock_routes(location)
    analysis = generate_mock_analysis(routes)
    
    return routes, analysis

def generate_mock_routes(location):
    """Generate mock evacuation routes"""
    lat, lng = location
    
    # Generate 8 mock routes with different directions
    directions = ["North", "Northeast", "East", "Southeast", "South", "Southwest", "West", "Northwest"]
    routes = []
    
    for i, direction in enumerate(directions):
        # Generate a random distance between 2-10 km
        distance = round(random.uniform(2, 10), 1)
        
        # Generate a random duration between 10-45 minutes
        duration = random.randint(10, 45)
        
        # Generate random waypoints
        waypoints = [
            [lat + random.uniform(-0.01, 0.01), lng + random.uniform(-0.01, 0.01)],
            [lat + random.uniform(-0.02, 0.02), lng + random.uniform(-0.02, 0.02)],
            [lat + random.uniform(-0.03, 0.03), lng + random.uniform(-0.03, 0.03)]
        ]
        
        route = {
            "id": f"route_{i+1}",
            "direction": direction,
            "distance": distance,
            "duration": duration,
            "waypoints": waypoints,
            "description": f"Head {direction} on Main Road for {distance} km to reach Safe Zone {i+1}",
            "safe_zone": f"Evacuation Center {i+1}"
        }
        
        routes.append(route)
    
    return routes

def generate_mock_analysis(routes):
    """Generate mock traffic and crowd analysis"""
    analysis = {
        "traffic": {},
        "crowd": {}
    }
    
    for route in routes:
        route_id = route["id"]
        
        # Generate random traffic congestion (1-10 scale)
        traffic_level = random.randint(1, 10)
        
        # Generate random crowd density (1-10 scale)
        crowd_level = random.randint(1, 10)
        
        analysis["traffic"][route_id] = {
            "congestion_level": traffic_level,
            "delay_minutes": traffic_level * 2,
            "status": get_traffic_status(traffic_level)
        }
        
        analysis["crowd"][route_id] = {
            "density_level": crowd_level,
            "estimated_people": crowd_level * 100,
            "status": get_crowd_status(crowd_level)
        }
    
    return analysis

def get_traffic_status(level):
    """Get traffic status based on level"""
    if level <= 3:
        return "Clear"
    elif level <= 6:
        return "Moderate"
    elif level <= 8:
        return "Heavy"
    else:
        return "Severe"

def get_crowd_status(level):
    """Get crowd status based on level"""
    if level <= 3:
        return "Low"
    elif level <= 6:
        return "Moderate"
    elif level <= 8:
        return "High"
    else:
        return "Very High"

def get_best_route(routes, analysis):
    """Get the best evacuation route based on traffic and crowd analysis"""
    if not routes or not analysis:
        return "No routes available. Please share your location again."
    
    # Calculate a score for each route based on traffic and crowd levels
    route_scores = {}
    
    for route in routes:
        route_id = route["id"]
        
        # Get traffic and crowd data
        traffic_data = analysis["traffic"].get(route_id, {"congestion_level": 5})
        crowd_data = analysis["crowd"].get(route_id, {"density_level": 5})
        
        # Calculate score (lower is better)
        traffic_score = traffic_data["congestion_level"]
        crowd_score = crowd_data["density_level"]
        duration_score = route["duration"] / 5  # Normalize duration
        
        total_score = traffic_score + crowd_score + duration_score
        route_scores[route_id] = total_score
    
    # Find the route with the lowest score
    best_route_id = min(route_scores, key=route_scores.get)
    best_route = next((r for r in routes if r["id"] == best_route_id), None)
    
    if best_route:
        traffic_status = analysis["traffic"][best_route_id]["status"]
        crowd_status = analysis["crowd"][best_route_id]["status"]
        
        route_text = (
            f"🚗 Route: {best_route['direction']} to {best_route['safe_zone']}\n"
            f"📏 Distance: {best_route['distance']} km\n"
            f"⏱️ Estimated Time: {best_route['duration']} minutes\n"
            f"🚦 Traffic: {traffic_status}\n"
            f"👥 Crowd Density: {crowd_status}\n\n"
            f"Directions: {best_route['description']}"
        )
        
        return route_text
    else:
        return "No suitable route found. Please try again."

def get_traffic_analysis_text(analysis):
    """Get traffic analysis text"""
    if not analysis or "traffic" not in analysis:
        return "Traffic analysis not available. Please share your location again."
    
    traffic_text = "*Evacuation Traffic Considerations*\n\n"
    traffic_text += "During an evacuation, traffic congestion can be a significant concern. Here are some tips to help you navigate the roads safely:\n\n"
    
    traffic_text += "*Plan Ahead*: Before evacuating, check traffic conditions and plan your route accordingly. Use traffic apps or websites to get real-time updates and avoid congested areas.\n\n"
    
    traffic_text += "*Leave Early*: Leave early to avoid peak traffic hours and give yourself plenty of time to reach your destination.\n\n"
    
    traffic_text += "*Follow Official Guidance*: Pay attention to official traffic guidance from authorities, such as traffic control signals, road closures, and detours.\n\n"
    
    traffic_text += "*Stay Informed*: Keep your phone charged and stay informed about traffic conditions through official channels, such as emergency alerts, social media, and local news.\n\n"
    
    traffic_text += "*Be Patient*: Evacuation traffic can be unpredictable, so be patient and prepared for delays. Keep your gas tank full, and have a backup plan in case of unexpected detours.\n\n"
    
    return traffic_text

def get_crowd_analysis_text(analysis):
    """Get crowd analysis text"""
    if not analysis or "crowd" not in analysis:
        return "Crowd analysis not available. Please share your location again."
    
    crowd_text = "*Evacuation Crowd Management*\n\n"
    crowd_text += "During evacuations, large crowds can form at key locations. Here's how to navigate crowded areas safely:\n\n"
    
    crowd_text += "*Stay Calm*: Remain calm and patient in crowded areas. Panic can lead to dangerous situations.\n\n"
    
    crowd_text += "*Follow Instructions*: Listen to emergency personnel and follow their directions for orderly movement.\n\n"
    
    crowd_text += "*Hold Hands*: If evacuating with family or friends, hold hands or maintain physical contact to avoid separation.\n\n"
    
    crowd_text += "*Avoid Bottlenecks*: Be aware of potential bottlenecks like doorways, stairs, and narrow passages. Move steadily but don't push.\n\n"
    
    crowd_text += "*Help Others*: Assist elderly, children, or disabled individuals if you can do so safely.\n\n"
    
    crowd_text += "*Alternative Routes*: Consider less crowded alternative routes if official guidance allows.\n\n"
    
    return crowd_text
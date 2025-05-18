from flask import Flask, request, jsonify
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
import os
import json
import logging
import evacuation_service
import groq_service
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Twilio credentials
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '+14155238886')

# Initialize Twilio client
client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

# User session storage
user_sessions = {}

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle incoming WhatsApp messages"""
    # Get incoming message details
    incoming_msg = request.values.get('Body', '').strip()
    sender = request.values.get('From', '')
    
    # Check for location data - WhatsApp sends location as separate latitude/longitude parameters
    latitude = request.values.get('Latitude')
    longitude = request.values.get('Longitude')
    
    # Initialize response
    response = MessagingResponse()
    msg = response.message()
    
    # Get or create user session
    if sender not in user_sessions:
        user_sessions[sender] = {
            'state': 'initial',
            'location': None,
            'routes': None,
            'analysis': None
        }
    
    session = user_sessions[sender]
    
    # Process location if provided
    if latitude and longitude:
        try:
            # Convert to float
            lat = float(latitude)
            lng = float(longitude)
            session['location'] = [lat, lng]
            session['state'] = 'location_received'
            
            logger.info(f"Location received: {lat}, {lng}")
            
            # Process evacuation routes
            routes, analysis = evacuation_service.process_evacuation_routes(session['location'])
            session['routes'] = routes
            session['analysis'] = analysis
            
            # Send initial response
            msg.body("📍 Location received! Calculating evacuation routes...\n\nI'll send you the best evacuation options in a moment.")
            
            # Send follow-up message with route information
            send_route_information(sender, routes, analysis)
            return str(response)
        except Exception as e:
            logger.error(f"Error processing routes: {str(e)}")
            msg.body("Sorry, I couldn't process evacuation routes for your location. Please try again later.")
            return str(response)
    
    # Handle text commands
    if re.search(r'hi|hello|hey', incoming_msg.lower()):
        msg.body("Hello! 👋 I'm your Evacuation Assistant. I can help you find safe evacuation routes and provide safety information.\n\n"
                "- Share your location to get evacuation routes\n"
                "- Type 'safety tips' for emergency guidance\n"
                "- Type 'help' to see all commands")
    
    elif 'location' in incoming_msg.lower():
        msg.body("Please share your current location by using the location sharing feature in WhatsApp. This will help me calculate the best evacuation routes for you.")
    
    elif 'safety tips' in incoming_msg.lower() or 'tips' in incoming_msg.lower():
        safety_tips = groq_service.get_safety_tips()
        msg.body(safety_tips)
    
    # Handle evacuation-specific commands - use evacuation data, not Groq
    elif 'best route' in incoming_msg.lower() and session.get('routes'):
        best_route = evacuation_service.get_best_route(session.get('routes'), session.get('analysis'))
        msg.body(f"🔍 Based on current conditions, your best evacuation route is:\n\n{best_route}")
    
    elif re.search(r'traffic|congestion', incoming_msg.lower()) and session.get('analysis'):
        traffic_info = evacuation_service.get_traffic_analysis_text(session.get('analysis'))
        msg.body(f"Evacuation Traffic Considerations\n\n{traffic_info}")
    
    elif 'crowd' in incoming_msg.lower() and session.get('analysis'):
        crowd_info = evacuation_service.get_crowd_analysis_text(session.get('analysis'))
        msg.body(f"Evacuation Crowd Management\n\n{crowd_info}")
    
    elif ('show' in incoming_msg.lower() and 'routes' in incoming_msg.lower() or 'all routes' in incoming_msg.lower()) and session.get('routes'):
        all_routes = format_all_routes(session.get('routes'), session.get('analysis'))
        msg.body(f"All Available Evacuation Routes:\n\n{all_routes}")
    
    elif 'help' in incoming_msg.lower():
        msg.body("🆘 Available Commands:\n\n"
                "- Share your location to get evacuation routes\n"
                "- 'safety tips' - Get emergency safety guidance\n"
                "- 'best route' - Get your recommended evacuation route\n"
                "- 'traffic' - Get traffic analysis for your routes\n"
                "- 'crowd' - Get crowd density information\n"
                "- 'show all routes' - View all available evacuation routes\n"
                "- 'reset' - Start a new session")
    
    elif 'reset' in incoming_msg.lower():
        if sender in user_sessions:
            del user_sessions[sender]
        msg.body("Your session has been reset. You can share a new location or ask for help.")
    
    # Handle location request in text format (for testing)
    elif "evacuate from" in incoming_msg.lower() or "evacuation plan for" in incoming_msg.lower():
        # Extract location name and use geocoding to get coordinates
        location_text = incoming_msg.lower().replace("evacuate from", "").replace("evacuation plan for", "").strip()
        try:
            # Mock location for testing - in production, use geocoding API
            mock_location = [12.9716, 77.5946]  # Bangalore coordinates
            session['location'] = mock_location
            
            # Process evacuation routes
            routes, analysis = evacuation_service.process_evacuation_routes(mock_location)
            session['routes'] = routes
            session['analysis'] = analysis
            
            # Send response
            msg.body(f"📍 Using location: {location_text}\nCalculating evacuation routes...")
            
            # Send follow-up message with route information
            send_route_information(sender, routes, analysis)
        except Exception as e:
            logger.error(f"Error processing location text: {str(e)}")
            msg.body("Sorry, I couldn't find that location. Please try sharing your exact location using WhatsApp's location feature.")
    
    else:
        # Use Groq for general evacuation and safety questions
        try:
            answer = groq_service.get_evacuation_advice(incoming_msg)
            msg.body(answer)
        except Exception as e:
            logger.error(f"Error getting advice from Groq: {str(e)}")
            msg.body("I'm not sure how to respond to that. Try asking about evacuation procedures, safety tips, or share your location for evacuation routes.")
    
    return str(response)

# Add this new function to format all routes
def format_all_routes(routes, analysis):
    """Format all evacuation routes for display"""
    if not routes or not analysis:
        return "No routes available. Please share your location again."
    
    result = "🚨 ALL EVACUATION ROUTES 🚨\n\n"
    
    for i, route in enumerate(routes):
        direction = route.get("direction", f"Route {i+1}")
        distance = route.get("distance", 0)
        duration = route.get("duration", 0)
        safe_zone = route.get("safe_zone", "Evacuation Center")
        
        # Get traffic and crowd info if available
        route_id = route.get("id", "")
        traffic_status = "Unknown"
        crowd_status = "Unknown"
        
        if route_id in analysis.get("traffic", {}):
            traffic_status = analysis["traffic"][route_id].get("status", "Unknown")
        
        if route_id in analysis.get("crowd", {}):
            crowd_status = analysis["crowd"][route_id].get("density_level", "Unknown")
        
        # Format the route information
        result += f"{i+1}. {direction} to {safe_zone}\n"
        result += f"   📏 Distance: {distance} km\n"
        result += f"   ⏱️ Time: {duration} minutes\n"
        result += f"   🚦 Traffic: {traffic_status}\n"
        result += f"   👥 Crowd: {crowd_status}\n\n"
    
    result += "Reply with 'best route' to see the recommended evacuation route."
    
    return result

def send_route_information(recipient, routes, analysis):
    """Send detailed route information as a follow-up message"""
    try:
        best_route = evacuation_service.get_best_route(routes, analysis)
        
        # Create a message with the best route and summary of alternatives
        message = f"🚨 EVACUATION ROUTES 🚨\n\n"
        message += f"RECOMMENDED ROUTE:\n{best_route}\n\n"
        message += f"I've calculated 8 possible evacuation routes from your location. "
        message += f"The recommended route above has the best combination of:\n"
        message += f"✅ Fastest travel time\n"
        message += f"✅ Lowest traffic congestion\n"
        message += f"✅ Manageable crowd density\n\n"
        message += f"Reply with 'traffic' or 'crowd' for detailed analysis, or 'help' to see all commands."
        
        # Fix the WhatsApp number format
        # If TWILIO_PHONE_NUMBER is not defined in environment variables, use a default
        twilio_number = os.getenv('TWILIO_PHONE_NUMBER', '14155238886')
        
        # Remove any existing "+" or "whatsapp:" prefixes
        twilio_number = twilio_number.replace('+', '').replace('whatsapp:', '')
        
        # Format the number correctly for WhatsApp
        from_number = f"whatsapp:+{twilio_number}"
        
        # Send the message
        client.messages.create(
            body=message,
            from_=from_number,
            to=recipient
        )
        
        logger.info(f"Route information sent to {recipient}")
    except Exception as e:
        logger.error(f"Error sending route information: {str(e)}")
# ... existing code ...

# Add these imports if not already present

# ... existing code ...

@app.route('/api/voice/evacuation', methods=['POST'])
def voice_evacuation_handler():
    """Handle requests from VAPI voice bot"""
    try:
        # Get data from the request
        data = request.json
        
        # Extract conversation context and user input
        conversation = data.get('conversation', {})
        user_input = data.get('input', '')
        user_location = data.get('location', None)
        
        logger.info(f"Voice request received: {user_input}")
        
        # Handle location-based requests
        if user_location:
            try:
                # Parse location data
                lat = float(user_location.get('latitude'))
                lng = float(user_location.get('longitude'))
                
                # Process evacuation routes
                routes, analysis = evacuation_service.process_evacuation_routes([lat, lng])
                
                # Get best route
                best_route = evacuation_service.get_best_route(routes, analysis)
                
                return jsonify({
                    'status': 'success',
                    'response_type': 'location',
                    'best_route': best_route,
                    'routes_count': len(routes),
                    'traffic_status': analysis['traffic'].get(routes[0]['id'], {}).get('status', 'Unknown'),
                    'crowd_status': analysis['crowd'].get(routes[0]['id'], {}).get('status', 'Unknown')
                })
            except Exception as e:
                logger.error(f"Error processing location for voice bot: {str(e)}")
                return jsonify({
                    'status': 'error',
                    'message': 'Could not process location data'
                })
        
        # Handle text commands
        if 'safety tips' in user_input.lower() or 'tips' in user_input.lower():
            safety_tips = groq_service.get_safety_tips()
            return jsonify({
                'status': 'success',
                'response_type': 'safety_tips',
                'content': safety_tips
            })
        
        elif 'traffic' in user_input.lower():
            traffic_info = evacuation_service.get_traffic_analysis_text({})
            return jsonify({
                'status': 'success',
                'response_type': 'traffic',
                'content': traffic_info
            })
        
        elif 'crowd' in user_input.lower():
            crowd_info = evacuation_service.get_crowd_analysis_text({})
            return jsonify({
                'status': 'success',
                'response_type': 'crowd',
                'content': crowd_info
            })
        
        elif 'help' in user_input.lower():
            help_text = (
                "I can help you with evacuation planning. You can ask me for:\n"
                "1. Evacuation routes by sharing your location\n"
                "2. Safety tips for emergency situations\n"
                "3. Traffic information during evacuations\n"
                "4. Crowd density information\n"
                "What would you like to know about?"
            )
            return jsonify({
                'status': 'success',
                'response_type': 'help',
                'content': help_text
            })
        
        # Default to general evacuation advice
        else:
            advice = groq_service.get_evacuation_advice(user_input)
            return jsonify({
                'status': 'success',
                'response_type': 'general',
                'content': advice
            })
    
    except Exception as e:
        logger.error(f"Error in voice evacuation handler: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred processing your request'
        }), 500

# ... existing code ...
if __name__ == '__main__':
    # Run the Flask app
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
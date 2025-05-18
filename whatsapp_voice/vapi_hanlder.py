import os
import requests
import json
from dotenv import load_dotenv
import evacuation_service

# Load environment variables
load_dotenv()

# Get server URL from environment or use default
SERVER_URL = os.getenv('SERVER_URL', 'https://solid-engine-4j7g5jgv7vg4h5j7w-5000.app.github.dev/')

def handle_vapi_request(request_data):
    """
    Handle incoming requests from VAPI
    This function processes the VAPI request and returns a response
    """
    try:
        # Extract conversation data
        conversation = request_data.get('conversation', {})
        messages = conversation.get('messages', [])
        
        # Get the latest user message
        user_message = ""
        for message in reversed(messages):
            if message.get('role') == 'user':
                user_message = message.get('content', '')
                break
        
        # Check if this is a location-based query
        location_keywords = ["evacuate from", "evacuation route", "current location", "near me", "get out of"]
        is_location_query = any(keyword in user_message.lower() for keyword in location_keywords)
        
        # Check conversation state
        conversation_state = conversation.get('state', {})
        awaiting_location = conversation_state.get('awaiting_location', False)
        
        # If we're awaiting location and user provided one
        if awaiting_location:
            # Try to extract location from user message
            location_text = user_message
            
            # Use a default/mock location if we can't parse it
            # In a real system, you'd use geocoding here
            mock_location = [12.9716, 77.5946]  # Bangalore coordinates
            
            # Process evacuation routes using the same service as WhatsApp
            routes, analysis = evacuation_service.process_evacuation_routes(mock_location)
            best_route = evacuation_service.get_best_route(routes, analysis)
            
            # Format response with the best route
            response_text = (
                f"Based on your location, I've found evacuation routes for you. "
                f"The best route is: {best_route}. "
                f"Traffic is {analysis['traffic'][routes[0]['id']]['status']} and "
                f"crowd density is {analysis['crowd'][routes[0]['id']]['status']}. "
                f"Would you like more details about traffic or crowd conditions?"
            )
            
            # Clear the awaiting_location state
            new_state = conversation_state.copy()
            new_state['awaiting_location'] = False
            new_state['has_routes'] = True
            
            return {
                'response': response_text,
                'state': new_state
            }
        
        # If this is a location query but we don't have location yet
        elif is_location_query:
            # Set state to await location
            new_state = conversation_state.copy()
            new_state['awaiting_location'] = True
            
            return {
                'response': "I can help you evacuate. To provide the best evacuation routes, could you please tell me your approximate location? For example, the name of your neighborhood, a nearby landmark, or a street intersection.",
                'state': new_state
            }
        
        # Handle traffic information request
        elif 'traffic' in user_message.lower() and conversation_state.get('has_routes', False):
            traffic_info = evacuation_service.get_traffic_analysis_text({})
            return {
                'response': f"Here's important traffic information for evacuation: {traffic_info}"
            }
        
        # Handle crowd information request
        elif 'crowd' in user_message.lower() and conversation_state.get('has_routes', False):
            crowd_info = evacuation_service.get_crowd_analysis_text({})
            return {
                'response': f"Here's information about crowd conditions during evacuation: {crowd_info}"
            }
        
        # Handle safety tips request
        elif 'safety' in user_message.lower() or 'tips' in user_message.lower():
            safety_tips = "During evacuation, remember these safety tips: 1) Stay calm and follow official instructions. 2) Bring only essential items. 3) Help others if it's safe to do so. 4) Avoid flooded areas. 5) Keep your phone charged. 6) Stay on designated evacuation routes."
            return {
                'response': safety_tips
            }
        
        # Handle help request
        elif 'help' in user_message.lower():
            help_text = (
                "I can help you with evacuation planning. You can ask me for: "
                "1. Evacuation routes from your location. "
                "2. Safety tips for emergency situations. "
                "3. Traffic information during evacuations. "
                "4. Crowd density information. "
                "What would you like to know about?"
            )
            return {
                'response': help_text
            }
        
        # Default response for other queries
        else:
            return {
                'response': "I'm your evacuation assistant. I can help you find evacuation routes, provide safety tips, and give information about traffic and crowd conditions during emergencies. How can I assist you today?"
            }
    
    except Exception as e:
        # Log the error (in a production environment)
        print(f"Error in VAPI handler: {str(e)}")
        
        # Return a friendly error message
        return {
            'response': "I apologize, but I encountered an issue while processing your request. Please try again or ask for help in a different way."
        }

# This is the main function that VAPI will call
def main(request):
    """
    Main function for VAPI
    """
    request_data = request.get('json', {})
    return handle_vapi_request(request_data)
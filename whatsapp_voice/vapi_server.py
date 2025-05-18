from flask import Flask, request, jsonify
import os
from dotenv import load_dotenv
from vapi_handler import handle_vapi_request

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

@app.route('/api/vapi', methods=['POST'])
def vapi_webhook():
    """Handle incoming VAPI requests"""
    try:
        # Get request data
        request_data = request.json
        
        # Process the request
        response = handle_vapi_handler(request_data)
        
        # Return the response
        return jsonify(response)
    
    except Exception as e:
        # Log the error
        print(f"Error in VAPI webhook: {str(e)}")
        
        # Return an error response
        return jsonify({
            'response': "I'm sorry, I encountered an error while processing your request."
        }), 500

if __name__ == '__main__':
    # Run the Flask app
    port = int(os.environ.get('VAPI_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
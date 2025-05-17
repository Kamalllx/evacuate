import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS

logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__)

# Set secret key from environment variable

# Configure CORS to allow requests from frontend
CORS(app, resources={r"/*": {"origins": "*"}})

# Import routes after app creation to avoid circular imports
from backend.routes import register_routes
register_routes(app)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found', 'message': str(error)}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Server error', 'message': str(error)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
import os
import logging
from flask import Flask, jsonify, request, render_template, send_from_directory
from flask_cors import CORS

logging.basicConfig(level=logging.DEBUG)

# Create Flask app
app = Flask(__name__, 
            static_folder="../frontend",
            template_folder="../frontend")

# Set secret key from environment variable
app.secret_key = os.environ.get("SESSION_SECRET")

# Configure CORS to allow requests from frontend
CORS(app, resources={r"/*": {"origins": "*"}})

# Import routes after app creation to avoid circular imports
from backend.routes import register_routes
register_routes(app)

# Serve frontend
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found', 'message': str(error)}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Server error', 'message': str(error)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)

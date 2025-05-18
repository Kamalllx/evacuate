from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit
import os
import logging
import requests
import base64
from dotenv import load_dotenv
from datetime import datetime
from typing import Optional, List, Dict
import json
import tempfile
import re
from werkzeug.utils import secure_filename

from langchain_groq import ChatGroq
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain.output_parsers import StructuredOutputParser, ResponseSchema

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'secret!')
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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") 
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY", "efadce44-3c75-461d-b400-19a1e82e608e")

# Chat history storage
class ChatHistory:
    def __init__(self):
        self.history: Dict[str, List[Dict]] = {}  # session_id -> messages
        self.max_history_per_session = 50

    def add_message(self, session_id: str, text: str, is_user: bool, language: Optional[str] = None):
        if session_id not in self.history:
            self.history[session_id] = []
        
        message = {
            "text": text,
            "isUser": is_user,
            "timestamp": datetime.now().isoformat(),
            "language": language
        }
        
        self.history[session_id].append(message)
        
        # Maintain maximum history size
        if len(self.history[session_id]) > self.max_history_per_session:
            self.history[session_id] = self.history[session_id][-self.max_history_per_session:]

    def get_history(self, session_id: str) -> List[Dict]:
        return self.history.get(session_id, [])
    
    def get_history_as_text(self, session_id: str) -> str:
        """Return chat history as formatted text for LLM context"""
        messages = self.get_history(session_id)
        formatted = []
        for msg in messages:
            prefix = "User" if msg["isUser"] else "TravelGuide"
            formatted.append(f"{prefix}: {msg['text']}")
        return "\n".join(formatted)

chat_history = ChatHistory()

# Define Response Schema for Travel Guide Output
response_schemas = [
    ResponseSchema(name="result", description="Final response to the user's travel-related query"),
    ResponseSchema(name="historical_context", description="Historical information about the location"),
    ResponseSchema(name="cultural_insights", description="Cultural insights about the location or attraction"),
    ResponseSchema(name="travel_tips", description="Practical travel tips for the location"),
    ResponseSchema(name="additional_info", description="Any extra information relevant to the location"),
]

# Structured Output Parser for main output
output_parser = StructuredOutputParser.from_response_schemas(response_schemas)

# Groq LLM setup
llm = ChatGroq(
    model="llama3-70b-8192",
    temperature=0.3,
    api_key=GROQ_API_KEY
)

# Sample travel data for testing - this would be replaced with actual DB retrieval
SAMPLE_TRAVEL_DATA = {
    "taj_mahal": {
        "name": "Taj Mahal",
        "location": "Agra, India",
        "description": "The Taj Mahal is an ivory-white marble mausoleum on the right bank of the river Yamuna in Agra, Uttar Pradesh, India.",
        "history": "It was commissioned in 1632 by the Mughal emperor Shah Jahan to house the tomb of his favorite wife, Mumtaz Mahal. The tomb is the centerpiece of a 17-hectare complex, which includes a mosque and a guest house, and is set in formal gardens bounded on three sides by a crenellated wall.",
        "cultural_significance": "The Taj Mahal was designated as a UNESCO World Heritage Site in 1983 for being 'the jewel of Muslim art in India and one of the universally admired masterpieces of the world's heritage'.",
        "visiting_hours": "Sunrise to sunset, closed on Fridays",
        "tips": "Visit early in the morning to avoid crowds. Wear comfortable shoes as you'll be walking on marble."
    },
    "eiffel_tower": {
        "name": "Eiffel Tower",
        "location": "Paris, France",
        "description": "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France.",
        "history": "It is named after the engineer Gustave Eiffel, whose company designed and built the tower from 1887 to 1889 as the entrance to the 1889 World's Fair.",
        "cultural_significance": "It has become a global cultural icon of France and one of the most recognizable structures in the world.",
        "visiting_hours": "9:00 AM to 12:45 AM (last elevator at 11:00 PM)",
        "tips": "Book tickets online to avoid long queues. Visit at night to see the tower illuminated."
    },
    "machu_picchu": {
        "name": "Machu Picchu",
        "location": "Cusco Region, Peru",
        "description": "Machu Picchu is an Incan citadel set high in the Andes Mountains in Peru, above the Urubamba River valley.",
        "history": "Built in the 15th century and later abandoned, it's renowned for its sophisticated dry-stone walls that fuse huge blocks without the use of mortar, intriguing buildings that play on astronomical alignments, and panoramic views.",
        "cultural_significance": "It was declared a Peruvian Historical Sanctuary in 1981 and a UNESCO World Heritage Site in 1983.",
        "visiting_hours": "6:00 AM to 5:30 PM",
        "tips": "Acclimatize to the altitude before visiting. Bring water, sunscreen, and rain gear as weather can change quickly."
    },
    "great_wall": {
        "name": "Great Wall of China",
        "location": "Northern China",
        "description": "The Great Wall of China is a series of fortifications built along the northern borders of China to protect against invasions.",
        "history": "Several walls were built from as early as the 7th century BC, with selective stretches later joined by Qin Shi Huang (220–206 BC), the first Emperor of China. Later on, many successive dynasties built and maintained multiple stretches of border walls.",
        "cultural_significance": "The Great Wall is a symbol of China's ancient civilization and is the longest wall in the world.",
        "visiting_hours": "Varies by section, typically 7:30 AM to 5:30 PM",
        "tips": "The Badaling and Mutianyu sections are the most restored and tourist-friendly. Wear comfortable shoes and bring water."
    },
    "colosseum": {
        "name": "Colosseum",
        "location": "Rome, Italy",
        "description": "The Colosseum is an oval amphitheatre in the centre of the city of Rome, Italy.",
        "history": "Built of travertine limestone, tuff, and brick-faced concrete, it was the largest amphitheatre ever built at the time and held 50,000 to 80,000 spectators. Construction began under the emperor Vespasian in AD 72 and was completed in AD 80 under his successor and heir, Titus.",
        "cultural_significance": "The Colosseum is an iconic symbol of Imperial Rome and is listed as one of the New 7 Wonders of the World.",
        "visiting_hours": "8:30 AM to 7:00 PM (varies by season)",
        "tips": "Buy tickets in advance to skip the long lines. Consider a guided tour to learn about the rich history."
    }
}

# Updated system prompt for travel guide
system_prompt = """You are a Travel Guide AI named "TravelGuide". Your job is to assist users with information about famous tourist destinations, historical sites, and cultural landmarks around the world.
  
*Guidelines:*
- Answer questions related to travel destinations, historical sites, cultural landmarks, and travel tips.
- Provide concise, structured, and accurate travel and historical information.
- If the question is not about travel or tourism, respond with: "I specialize in travel guidance. How can I assist with your travel plans or questions about destinations?"

*Chat History:*  
{chat_history}

*Travel Data Context:*
{document_context}

## **Introduction**
Welcome to "TravelGuide," a specialized AI-based travel assistant built to provide detailed information about tourist destinations, historical sites, and cultural landmarks worldwide. Your purpose is to assist travelers efficiently and professionally by delivering structured responses in a clear and concise manner.

You are expected to:
- Provide factually correct, data-driven insights about travel destinations.
- Respond in the language the user chooses at the beginning of the conversation.
- Offer consistent and professional communication at all times.
- If you cannot answer a question directly, attempt to gather additional information through follow-up questions.

## **1. Scope of Responses**
You are strictly programmed to answer queries related to travel and tourism. The following areas are within your scope:
- **Destination Information**:
    - Historical background
    - Cultural significance
    - Architectural details
    - Geographical context
- **Visitor Information**:
    - Opening hours
    - Best time to visit
    - Entry fees
    - Accessibility
- **Travel Advice**:
    - Local customs and etiquette
    - Safety tips
    - Transportation options
    - Accommodation recommendations

## **2. Language Support**
- TravelGuide must understand and respond in multiple languages, including:  
    - English  
    - Hindi  
    - Tamil  
    - Telugu  
    - Bengali  
    - Marathi  
    - Kannada  
    - Malayalam  
    - Gujarati  

## **3. Data Source**
You have access to a database of travel information, historical facts, and cultural insights provided in the context. Use this data to provide personalized guidance.

## **4. Structured and Concise Responses**
- Keep responses under 500 words unless detailed clarification is required.
- Present information using:
    - **Markdown** for clarity
    - **Numbering** for steps and instructions
    - **Bullet points** for lists
    - **Bold text** for important information

## **5. Complex Queries Handling**
If the query is unclear or involves multiple data points, ask follow-up questions to narrow down the response.

## **6. User Experience and Tone**
- Maintain a professional, friendly, and enthusiastic tone.
- Be respectful of different cultures and traditions.
- Avoid jargon; explain in simple terms.

*User Query:* {input}

*Response Format:*
{format_instructions}
"""

# Create the prompt with format_instructions
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "User's language: {language}. Chat history: {chat_history}. Travel data context: {document_context}. User's question: {input}")
])

# Format the response function
def format_response(extracted_info):
    """Format the extracted information into a structured response.
    Remove any JSON tags and format the text properly.
    """
    # Get the result text and clean it up
    result_text = extracted_info.get("result", "")
    
    # Remove JSON tags if they exist
    if result_text.startswith('```json'):
        result_text = result_text.replace('```json', '').replace('```', '').strip()
    elif result_text.startswith('{') and result_text.endswith('}'):
        try:
            # Try to parse as JSON and get the "result" field
            parsed = json.loads(result_text)
            result_text = parsed.get("result", result_text)
        except:
            # If JSON parsing fails, just remove the braces
            result_text = result_text.strip('{}').strip()

    formatted_response = result_text + "\n\n"
    
    # Add other fields if they exist and aren't empty
    if extracted_info.get("historical_context"):
        formatted_response += f"**Historical Context:** {extracted_info['historical_context']}\n\n"
    
    if extracted_info.get("cultural_insights"):
        formatted_response += f"**Cultural Insights:** {extracted_info['cultural_insights']}\n\n"
    
    if extracted_info.get("travel_tips"):
        formatted_response += f"**Travel Tips:** {extracted_info['travel_tips']}\n\n"
    
    if extracted_info.get("additional_info"):
        formatted_response += f"**Additional Information:**\n{extracted_info['additional_info']}"
    
    return formatted_response.strip()
    
# WebSocket handlers
@socketio.on('connect')
def handle_connect():
    logger.info("Client connected")
    emit('status', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info("Client disconnected")

@socketio.on('get_chat_history')
def handle_get_history():
    session_id = request.sid
    history = chat_history.get_history(session_id)
    emit('chat_history', history)

@socketio.on('audio_message')
def handle_audio_message(data):
    try:
        session_id = request.sid
        logger.info("=" * 50)
        logger.info("NEW AUDIO MESSAGE RECEIVED")
        
        # Get initial language setting
        auto_detect = data.get('auto_detect', False)
        current_language = data.get('language', 'en-IN')
        
        # Get location context if provided
        location_id = data.get('location_id', '')
        
        logger.info(f"Auto-detect enabled: {auto_detect}")
        logger.info(f"Initial language setting: {current_language}")
        logger.info(f"Location ID provided: {location_id}")
        
        # Handle language detection
        if auto_detect:
            detected_lang = detect_language(data['audio'])
            if detected_lang:
                current_language = detected_lang
                logger.info(f"Auto-detected language: {detected_lang}")
                emit('detected_language', {'language': detected_lang})
        
        logger.info(f"Final language being used: {current_language}")
        
        # Convert speech to text
        stt_result = speech_to_text(data['audio'], current_language)
        if not stt_result:
            raise ValueError("Failed to convert audio to text")
        
        original_text = stt_result.get('transcript', '')
        logger.info(f"Original text ({current_language}): {original_text}")
        
        # Save user message to history
        chat_history.add_message(session_id, original_text, True, current_language)
        
        # Always translate if not English
        needs_translation = current_language != "en-IN"
        logger.info(f"Needs translation: {needs_translation}")
        
        if needs_translation:
            translated_text = translate_text(original_text, current_language, "en-IN")
            logger.info(f"Translated text (English): {translated_text}")
        else:
            translated_text = original_text
            logger.info("Text is in English, no translation needed")
        
        # Add format instructions to the input
        format_instructions = output_parser.get_format_instructions()
        
        # Get travel data context
        travel_context = {}
        
        # Check if user mentioned any known location
        mentioned_location = None
        for location_key, location_data in SAMPLE_TRAVEL_DATA.items():
            if location_key in translated_text.lower() or location_data["name"].lower() in translated_text.lower():
                mentioned_location = location_key
                break
        
        # If location is explicitly provided or detected in the text
        if location_id and location_id in SAMPLE_TRAVEL_DATA:
            travel_context = SAMPLE_TRAVEL_DATA[location_id]
        elif mentioned_location:
            travel_context = SAMPLE_TRAVEL_DATA[mentioned_location]
        else:
            # Provide a summary of available locations
            travel_context = {
                "available_locations": [loc_data["name"] for loc_data in SAMPLE_TRAVEL_DATA.values()],
                "message": "Please ask about a specific location for detailed information."
            }
        
        # Process with LLM
        english_response = process_with_llm(
            translated_text,
            current_language,
            chat_history.get_history_as_text(session_id),
            travel_context,
            format_instructions
        )
        
        logger.info(f"LLM Response (English): {english_response}")
        
        # Try to parse structured output
        try:
            extracted_info = output_parser.parse(english_response)
            # Ensure all expected keys are present by filling missing ones with an empty string
            required_keys = ["result", "historical_context", "cultural_insights", "travel_tips", "additional_info"]
            for key in required_keys:
                if key not in extracted_info:
                    extracted_info[key] = ""
            
            english_response = format_response(extracted_info)
        except Exception as e:
            logger.error(f"Error parsing structured output: {str(e)}")
            # Fall back to the original response if structured parsing fails
        
        # Translate response back if needed
        if needs_translation:
            logger.info(f"Translating response from English to {current_language}")
            translated_response = translate_text(english_response, "en-IN", current_language)
            logger.info(f"Translation successful. Length: {len(translated_response)}")
        else:
            translated_response = english_response
        
        # Save bot response to history
        chat_history.add_message(session_id, translated_response, False, current_language)
        
        # Generate audio in detected language
        logger.info(f"Generating audio in language: {current_language}")
        audio_data = generate_audio_for_large_text(translated_response, current_language)
        
        if audio_data:
            logger.info(f"Successfully generated audio in {current_language}")
        else:
            logger.error("Failed to generate audio")
        
        # Send response
        emit('response', {
            'original_text': original_text,
            'english_text': translated_text if needs_translation else original_text,
            'english_response': english_response,
            'text': translated_response,
            'audio': audio_data,
            'timestamp': datetime.now().isoformat(),
            'language': current_language,
            'location_context': travel_context.get('name', '') if isinstance(travel_context, dict) and 'name' in travel_context else ''
        })
        
    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        emit('error', {'message': str(e)})

def process_with_llm(user_input, language, chat_history_text, travel_context, format_instructions):
    """Process user input with LLM"""
    logger.info("Processing with LLM")
    
    # Convert travel context to string
    context_str = json.dumps(travel_context)
    
    try:
        # Process with LLM
        response = llm.invoke(
            prompt.format(
                input=user_input,
                language=language,
                chat_history=chat_history_text,
                document_context=context_str,
                format_instructions=format_instructions
            )
        )
        return response.content
    except Exception as e:
        logger.error(f"LLM processing error: {str(e)}")
        return "I apologize, but I'm having trouble processing your request. Could you please try again with a different question?"

def generate_audio_for_large_text(text: str, language: str) -> Optional[str]:
    """Generate audio for large text by chunking and combining the results"""
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "Content-Type": "application/json",
        "api-subscription-key": os.getenv("SARVAM_API_KEY")
    }
    
    # Map language codes to appropriate speakers
    language_speaker_map = {
        'hi-IN': 'meera',  # Hindi
        'en-IN': 'meera',  # English
        'ta-IN': 'meera',  # Tamil
        'te-IN': 'meera',  # Telugu
        'kn-IN': 'meera',  # Kannada
        'ml-IN': 'meera',  # Malayalam
        'mr-IN': 'meera',  # Marathi
        'bn-IN': 'meera',  # Bengali
        'gu-IN': 'meera',  # Gujarati
        'od-IN': 'meera',  # Odia (added support)
    }
    
    speaker = language_speaker_map.get(language, 'meera')
    logger.info(f"Using speaker '{speaker}' for language '{language}'")
    
    # Split text into chunks of 450 characters, but try to split at sentence boundaries
    chunks = []
    current_chunk = ""
    
    # Split text into sentences
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    for sentence in sentences:
        # If adding this sentence would exceed the limit, save current chunk and start a new one
        if len(current_chunk) + len(sentence) > 450:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
        else:
            # Add sentence to current chunk
            if current_chunk:
                current_chunk += " " + sentence
            else:
                current_chunk = sentence
    
    # Add the last chunk if it's not empty
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    logger.info(f"Split text into {len(chunks)} chunks for TTS")
    
    # Process each chunk and collect audio data
    audio_base64_chunks = []
    
    for i, chunk in enumerate(chunks):
        logger.info(f"Processing TTS chunk {i+1}/{len(chunks)}")
        payload = {
            "inputs": [chunk],
            "target_language_code": language,
            "speaker": speaker,
            "enable_preprocessing": True,
            "speech_sample_rate": 22050
        }
        
        try:
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
            audio_chunk = result.get("audios", [None])[0]
            if audio_chunk:
                audio_base64_chunks.append(audio_chunk)
            else:
                logger.warning(f"No audio data returned for chunk {i+1}")
        except Exception as e:
            logger.error(f"TTS Error for chunk {i+1}: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
    
    if not audio_base64_chunks:
        logger.error("No audio chunks were successfully generated")
        return None
    
    # For now, return the first chunk as a simplified approach
    # In a production environment, you would want to properly concatenate the audio
    if len(audio_base64_chunks) == 1:
        return audio_base64_chunks[0]
    
    # If we have multiple chunks, we'll return the first one with a note
    # In a real implementation, you would concatenate the audio files properly
    logger.info(f"Generated {len(audio_base64_chunks)} audio chunks, returning first chunk")
    return audio_base64_chunks[0]

def speech_to_text(audio_base64: str, source_language: str) -> Optional[Dict]:
    """Convert speech to text using Sarvam AI"""
    url = "https://api.sarvam.ai/speech-to-text"
    
    # Get API key
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        logger.error("Missing SARVAM_API_KEY environment variable")
        return None
    
    headers = {
        "api-subscription-key": api_key
    }
    
    try:
        # Convert base64 back to audio file
        audio_data = base64.b64decode(audio_base64)
        
        # Prepare payload and files
        payload = {
            'model': 'saarika:v2',
            'with_timesteps': 'false'
        }
        
        files = [
            ('file', ('audio.wav', audio_data, 'audio/wav'))
        ]
        
        # Log request info
        logger.info(f"Sending STT request to {url}")
        
        # Use requests.request with multipart/form-data
        response = requests.request("POST", url, headers=headers, data=payload, files=files)
        response.raise_for_status()
        
        result = response.json()
        logger.info(f"STT Response: {result}")
        
        # Create a structured result with original transcript
        return {
            'transcript': result.get('transcript', ''),
            'language_code': result.get('language_code', source_language)
        }
        
    except Exception as e:
        logger.error(f"STT Error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response content: {e.response.text}")
            logger.error(f"Response status code: {e.response.status_code}")
        return None

def translate_text(text: str, source_language: str, target_language: str) -> str:
    """Translate text using Sarvam AI's translation API"""
    url = "https://api.sarvam.ai/translate"
    
    # If source and target are the same, no need to translate
    if source_language == target_language:
        return text
        
    headers = {
        "Content-Type": "application/json",
        "api-subscription-key": os.getenv("SARVAM_API_KEY")
    }
    
    # Split text into chunks of 900 characters (leaving room for overhead)
    chunks = [text[i:i+900] for i in range(0, len(text), 900)]
    translated_chunks = []
    
    for chunk in chunks:
        payload = {
            "input": chunk,
            "source_language_code": source_language,
            "target_language_code": target_language,
            "mode": "formal",
            "enable_preprocessing": True
        }
        
        try:
            logger.info(f"Sending translation request: {source_language} to {target_language}")
            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()
            logger.info(f"Translation Response: {result}")
            translated_chunks.append(result.get('translated_text', chunk))
        except Exception as e:
            logger.error(f"Translation Error for chunk: {str(e)}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response content: {e.response.text}")
            translated_chunks.append(chunk)  # Use original chunk if translation fails
    
    return ' '.join(translated_chunks)

def detect_language(audio_base64: str) -> Optional[str]:
    """Detect language using Sarvam AI"""
    logger.info("Starting language detection...")
    
    url = "https://api.sarvam.ai/speech-to-text"
    
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        logger.error("Missing SARVAM_API_KEY environment variable")
        return None
        
    headers = {
        "api-subscription-key": api_key
    }
    
    try:
        audio_data = base64.b64decode(audio_base64)
        
        payload = {
            'model': 'saarika:v2',
            'with_timesteps': 'false',
            'detect_language': 'true'
        }
        
        files = [
            ('file', ('audio.wav', audio_data, 'audio/wav'))
        ]
        
        response = requests.request("POST", url, headers=headers, data=payload, files=files)
        response.raise_for_status()
        
        result = response.json()
        # Get language code from STT response
        detected_language = result.get('language_code', 'en-IN')
        
        logger.info(f"Raw STT response: {result}")
        logger.info(f"Detected language code from STT: {detected_language}")
        
        return detected_language
        
    except Exception as e:
        logger.error(f"Language detection error: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response content: {e.response.text}")
        return None

# Add this route near the top of your routes
@app.route('/status', methods=['GET'])
def check_status():
    """Endpoint to check if voice service is available"""
    return jsonify({
        "status": "online",
        "message": "Travel Guide voice service is available",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/locations', methods=['GET'])
def get_locations():
    """Endpoint to get available locations"""
    locations = []
    for key, data in SAMPLE_TRAVEL_DATA.items():
        locations.append({
            "id": key,
            "name": data["name"],
            "location": data["location"],
            "description": data["description"]
        })
    return jsonify(locations)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

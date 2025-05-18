import os
import logging
import groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Groq API key
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

# Initialize Groq client
client = groq.Client(api_key=GROQ_API_KEY)

def get_evacuation_advice(query: str) -> str:
    """Get evacuation advice from Groq API"""
    try:
        # Create system prompt for evacuation assistant
        system_prompt = """
        You are an Evacuation Assistant chatbot that provides helpful, accurate, and concise information about 
        evacuation procedures, emergency preparedness, and safety tips. Your responses should be:
        
        1. Factual and accurate
        2. Concise (no more than 3-4 paragraphs)
        3. Focused on practical advice
        4. Calm and reassuring in tone
        5. Formatted for easy reading on a mobile device
        
        When answering questions about evacuation procedures, prioritize safety and official guidance.
        """
        
        # Call Groq API
        response = client.chat.completions.create(
            model="llama3-8b-8192",  # or another appropriate model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        # Extract and return the response
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        logger.error(f"Error getting advice from Groq: {str(e)}")
        return "I'm having trouble connecting to my knowledge base right now. For emergency evacuation information, please contact your local emergency services or visit ready.gov for official guidance."

def get_safety_tips() -> str:
    """Get general safety tips for emergencies"""
    try:
        # Create system prompt for safety tips
        system_prompt = """
        You are an Evacuation Assistant chatbot. Provide a concise list of the most important 
        general safety tips for emergency evacuations. Format the response as a numbered list 
        with brief explanations. Keep the entire response under 500 characters for easy reading 
        on a mobile device.
        """
        
        # Call Groq API
        response = client.chat.completions.create(
            model="llama3-8b-8192",  # or another appropriate model
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Give me the most important emergency evacuation safety tips."}
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        # Extract and return the response
        return response.choices[0].message.content.strip()
    
    except Exception as e:
        logger.error(f"Error getting safety tips from Groq: {str(e)}")
        return """
        🚨 EMERGENCY EVACUATION TIPS 🚨
        
        1. Stay calm and follow official instructions
        2. Grab your emergency kit if immediately available
        3. Know multiple evacuation routes from your location
        4. If driving, keep gas tank at least half full
        5. Help those with special needs
        6. Turn off utilities if time permits
        7. Avoid flooded areas - 6 inches of water can knock you down
        8. Stay informed through emergency broadcasts
        """
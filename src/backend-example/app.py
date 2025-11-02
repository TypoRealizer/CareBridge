"""
CareBridge Backend Server - Ollama Integration
Python/Flask implementation

Requirements:
- Flask
- flask-cors
- ollama-python

Install:
pip install flask flask-cors ollama-python

Run:
python app.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import ollama
import json
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
OLLAMA_MODEL = "mistral"  # or "llama2", "llama3.1"

# ============================================
# HEALTH CHECK
# ============================================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        # Check if Ollama is available
        ollama.list()
        return jsonify({
            "status": "ok",
            "model": OLLAMA_MODEL,
            "message": "Backend is healthy"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Ollama not available: {str(e)}"
        }), 503

# ============================================
# SUMMARIZATION
# ============================================

@app.route('/api/summarize', methods=['POST'])
def summarize():
    """
    Simplify medical text using Ollama
    
    Body:
    {
        "text": "original medical document",
        "options": {
            "tone": "patient-friendly",
            "format": "structured"
        }
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        options = data.get('options', {})
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        # Create prompt for medical simplification
        prompt = f"""You are a medical text simplification expert. Your task is to convert complex medical discharge summaries into clear, patient-friendly language.

Guidelines:
- Use simple, everyday words instead of medical jargon
- Organize information clearly with sections
- Maintain medical accuracy
- Be compassionate and encouraging
- Explain medical terms when necessary

Original Medical Document:
{text}

Please provide a simplified, patient-friendly version:"""
        
        logger.info("Generating simplified summary...")
        
        # Call Ollama
        response = ollama.generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            options={
                'temperature': 0.7,
                'top_p': 0.9,
                'top_k': 40,
            }
        )
        
        simplified_text = response['response'].strip()
        
        return jsonify({
            "simplified_text": simplified_text,
            "model": OLLAMA_MODEL,
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Summarization error: {str(e)}")
        return jsonify({
            "error": str(e),
            "success": False
        }), 500

# ============================================
# FAQ GENERATION
# ============================================

@app.route('/api/generate-faq', methods=['POST'])
def generate_faq():
    """
    Generate patient-oriented FAQs
    
    Body:
    {
        "text": "medical summary",
        "num_questions": 6
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        num_questions = data.get('num_questions', 6)
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        prompt = f"""Based on this medical summary, generate {num_questions} frequently asked questions that a patient might have, along with clear, helpful answers.

Medical Summary:
{text}

Create {num_questions} FAQs. For each FAQ, provide:
- question: The patient's question
- answer: Clear, helpful answer
- category: One of [Medication, Treatment, Lifestyle, Symptoms, Follow-up, Emergency]

Return ONLY a valid JSON array in this exact format:
[
  {{
    "question": "What medications should I take?",
    "answer": "Clear answer here",
    "category": "Medication"
  }}
]

JSON FAQs:"""
        
        logger.info("Generating FAQs...")
        
        response = ollama.generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            options={'temperature': 0.7}
        )
        
        # Parse JSON response
        response_text = response['response'].strip()
        
        # Try to extract JSON if it's wrapped in markdown
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        faqs = json.loads(response_text)
        
        # Add IDs
        for i, faq in enumerate(faqs):
            faq['id'] = f'faq-{i+1}'
        
        return jsonify({
            "faqs": faqs,
            "success": True
        })
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        logger.error(f"Response: {response['response']}")
        return jsonify({
            "error": "Failed to parse FAQs",
            "raw_response": response.get('response', ''),
            "success": False
        }), 500
    except Exception as e:
        logger.error(f"FAQ generation error: {str(e)}")
        return jsonify({
            "error": str(e),
            "success": False
        }), 500

# ============================================
# CARE GUIDANCE
# ============================================

@app.route('/api/care-guidance', methods=['POST'])
def care_guidance():
    """
    Generate care guidance tasks
    
    Body:
    {
        "text": "medical summary",
        "num_items": 7
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        num_items = data.get('num_items', 7)
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        prompt = f"""Based on this medical summary, create {num_items} specific, actionable care guidance tasks for the patient.

Medical Summary:
{text}

Create {num_items} care tasks. For each task, provide:
- title: Brief task title
- description: Detailed, clear instructions
- priority: One of [High, Medium, Low]
- category: One of [Medication, Appointment, Monitoring, Lifestyle, Emergency]

Return ONLY a valid JSON array in this exact format:
[
  {{
    "title": "Take Medications as Prescribed",
    "description": "Detailed instructions here",
    "priority": "High",
    "category": "Medication"
  }}
]

JSON Care Guidance:"""
        
        logger.info("Generating care guidance...")
        
        response = ollama.generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            options={'temperature': 0.7}
        )
        
        # Parse JSON response
        response_text = response['response'].strip()
        
        # Try to extract JSON if it's wrapped in markdown
        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()
        
        guidance = json.loads(response_text)
        
        # Add IDs
        for i, item in enumerate(guidance):
            item['id'] = i + 1
        
        return jsonify({
            "care_guidance": guidance,
            "success": True
        })
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        logger.error(f"Response: {response['response']}")
        return jsonify({
            "error": "Failed to parse care guidance",
            "raw_response": response.get('response', ''),
            "success": False
        }), 500
    except Exception as e:
        logger.error(f"Care guidance error: {str(e)}")
        return jsonify({
            "error": str(e),
            "success": False
        }), 500

# ============================================
# TRANSLATION
# ============================================

@app.route('/api/translate', methods=['POST'])
def translate():
    """
    Translate text to Hindi or Kannada
    
    Body:
    {
        "text": "english text",
        "target_language": "hi" or "kn",
        "preserve_medical_terms": true
    }
    """
    try:
        data = request.json
        text = data.get('text', '')
        target_lang = data.get('target_language', 'hi')
        preserve_medical = data.get('preserve_medical_terms', True)
        
        if not text:
            return jsonify({"error": "No text provided"}), 400
        
        lang_names = {
            'hi': 'Hindi',
            'kn': 'Kannada'
        }
        
        lang_name = lang_names.get(target_lang, 'Hindi')
        
        medical_note = "Keep important medical terms in English (in parentheses if needed) to avoid confusion." if preserve_medical else ""
        
        prompt = f"""Translate the following medical discharge summary from English to {lang_name}. 
Maintain a patient-friendly tone and ensure accuracy. {medical_note}

English Text:
{text}

{lang_name} Translation:"""
        
        logger.info(f"Translating to {lang_name}...")
        
        response = ollama.generate(
            model=OLLAMA_MODEL,
            prompt=prompt,
            options={'temperature': 0.3}  # Lower temperature for more accurate translation
        )
        
        translated_text = response['response'].strip()
        
        return jsonify({
            "translated_text": translated_text,
            "target_language": target_lang,
            "success": True
        })
        
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return jsonify({
            "error": str(e),
            "success": False
        }), 500

# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        "error": "Endpoint not found",
        "available_endpoints": [
            "GET /health",
            "POST /api/summarize",
            "POST /api/generate-faq",
            "POST /api/care-guidance",
            "POST /api/translate"
        ]
    }), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        "error": "Internal server error",
        "message": str(e)
    }), 500

# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    logger.info("=" * 50)
    logger.info("CareBridge Backend Server")
    logger.info("=" * 50)
    logger.info(f"Model: {OLLAMA_MODEL}")
    logger.info("Starting server on http://localhost:3001")
    logger.info("=" * 50)
    
    app.run(
        host='0.0.0.0',
        port=3001,
        debug=True
    )

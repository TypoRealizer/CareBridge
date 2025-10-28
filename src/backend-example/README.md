# CareBridge Backend Server

This is a sample backend implementation for CareBridge using Python Flask and Ollama.

## 🚀 Quick Start

### Prerequisites

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Windows: Download from ollama.com
   ```

2. **Pull the Model**
   ```bash
   ollama pull mistral
   # or
   ollama pull llama2
   # or
   ollama pull llama3.1
   ```

### Setup

1. **Install Python Dependencies**
   ```bash
   cd backend-example
   pip install -r requirements.txt
   ```

2. **Run the Server**
   ```bash
   python app.py
   ```

   Server will start on `http://localhost:3001`

3. **Test the Server**
   ```bash
   # Health check
   curl http://localhost:3001/health
   
   # Should return: {"status":"ok","model":"mistral","message":"Backend is healthy"}
   ```

## 📡 API Endpoints

### Health Check
```bash
GET /health

Response:
{
  "status": "ok",
  "model": "mistral",
  "message": "Backend is healthy"
}
```

### Summarize Medical Text
```bash
POST /api/summarize
Content-Type: application/json

{
  "text": "Patient admitted with acute myocardial infarction...",
  "options": {
    "tone": "patient-friendly"
  }
}

Response:
{
  "simplified_text": "You were admitted to the hospital because...",
  "model": "mistral",
  "success": true
}
```

### Generate FAQs
```bash
POST /api/generate-faq
Content-Type: application/json

{
  "text": "Medical summary text here...",
  "num_questions": 6
}

Response:
{
  "faqs": [
    {
      "id": "faq-1",
      "question": "What medications should I take?",
      "answer": "You should take...",
      "category": "Medication"
    }
  ],
  "success": true
}
```

### Generate Care Guidance
```bash
POST /api/care-guidance
Content-Type: application/json

{
  "text": "Medical summary text here...",
  "num_items": 7
}

Response:
{
  "care_guidance": [
    {
      "id": 1,
      "title": "Take Medications as Prescribed",
      "description": "Follow your medication schedule...",
      "priority": "High",
      "category": "Medication"
    }
  ],
  "success": true
}
```

### Translate
```bash
POST /api/translate
Content-Type: application/json

{
  "text": "You were admitted to the hospital...",
  "target_language": "hi",
  "preserve_medical_terms": true
}

Response:
{
  "translated_text": "आपको अस्पताल में...",
  "target_language": "hi",
  "success": true
}
```

## 🔧 Configuration

### Change the Model

Edit `app.py`:
```python
OLLAMA_MODEL = "mistral"  # Change to "llama2", "llama3.1", etc.
```

### Change the Port

Edit `app.py`:
```python
app.run(port=3001)  # Change to your preferred port
```

Then update frontend `.env`:
```
VITE_BACKEND_URL=http://localhost:YOUR_PORT
```

## 🐛 Troubleshooting

### "Ollama not available"
- Make sure Ollama is installed: `ollama --version`
- Check if Ollama is running: `ollama list`
- Pull the model: `ollama pull mistral`

### CORS errors
- Make sure `flask-cors` is installed
- Check that CORS is enabled in `app.py`

### Port already in use
- Change the port in `app.py`
- Or kill the process: `lsof -ti:3001 | xargs kill`

### JSON parsing errors
- The LLM sometimes returns markdown-wrapped JSON
- The code handles this, but you may need to adjust the prompt

## 📝 Notes

- This is a **sample implementation** - customize as needed
- For production, add authentication, rate limiting, error handling
- Consider using async operations for better performance
- Add caching to reduce redundant LLM calls
- Monitor Ollama resource usage (RAM/CPU)

## 🔗 Resources

- [Ollama Documentation](https://ollama.com/docs)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Mistral Model](https://ollama.com/library/mistral)

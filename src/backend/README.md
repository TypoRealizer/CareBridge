# CareBridge Backend Server

Node.js/Express backend integrating **Mistral model via Ollama** for medical document simplification, care guidance, FAQ generation, and translation.

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Ollama** - Install from [ollama.ai](https://ollama.ai)
3. **Mistral Model** - Pull the model using Ollama

### Installation

```bash
# 1. Navigate to backend directory
cd backend

# 2. Install dependencies
npm install

# 3. Install and start Ollama (if not already installed)
# macOS/Linux:
curl https://ollama.ai/install.sh | sh
ollama serve

# Windows: Download from https://ollama.ai

# 4. Pull Mistral model
ollama pull mistral

# 5. Configure environment
cp .env.example .env
# Edit .env if needed (defaults should work)

# 6. Start the server
npm start

# For development with auto-reload:
npm run dev
```

## 📋 API Endpoints

### Health Check
```http
GET /health
```

Returns server status and Ollama availability.

**Response:**
```json
{
  "status": "healthy",
  "ollama": {
    "available": true,
    "model": "mistral",
    "models": ["mistral"]
  },
  "server": {
    "uptime": 123.45,
    "activeRequests": 0,
    "maxConcurrent": 3
  }
}
```

---

### Summarization
```http
POST /api/summarize
```

Converts complex medical text into patient-friendly summaries.

**Request Body:**
```json
{
  "text": "<extracted medical document text>",
  "options": {
    "max_length": 800
  }
}
```

**Response:**
```json
{
  "summary": "<patient-friendly summary>",
  "confidence": 0.85,
  "reviewSuggested": false,
  "tokensConsumed": 450,
  "processingTime": 3200,
  "metadata": {
    "chunked": false,
    "chunks": 1,
    "medicationValidation": {
      "valid": true,
      "issues": [],
      "dosagesFound": 3
    }
  }
}
```

**Features:**
- Automatic chunking for documents > 5000 characters
- Confidence scoring with medical keyword coverage
- Medication validation with safety checks
- Flags ambiguous medications as `[CONFIRM MED]`

---

### Care Guidance
```http
POST /api/care
```

Generates structured care instructions.

**Request Body:**
```json
{
  "summary": "<patient-friendly summary>"
}
```

**Response:**
```json
{
  "daily_routine": [
    "Take medications at the same time each day",
    "Monitor blood pressure twice daily"
  ],
  "medication_schedule": [
    {
      "drug": "Aspirin",
      "dose": "81mg",
      "when": "Once daily with breakfast"
    }
  ],
  "red_flags": [
    "Severe chest pain - call 911 immediately",
    "Difficulty breathing"
  ],
  "follow_up": [
    "Schedule cardiology appointment within 2 weeks",
    "Blood work in 30 days"
  ]
}
```

---

### FAQ Generation
```http
POST /api/faqs
```

Generates patient-oriented Q&A pairs.

**Request Body:**
```json
{
  "summary": "<patient-friendly summary>"
}
```

**Response:**
```json
{
  "faqs": [
    {
      "q": "What medications should I take?",
      "a": "Take aspirin 81mg daily with breakfast and atorvastatin 40mg at bedtime."
    },
    {
      "q": "When should I call the doctor?",
      "a": "Call immediately if you experience chest pain, severe shortness of breath, or irregular heartbeat."
    }
  ]
}
```

---

### Translation
```http
POST /api/translate
```

Translates medical summaries to Hindi or Kannada.

**Request Body:**
```json
{
  "text": "<summary or care text>",
  "lang": "hi"
}
```

**Parameters:**
- `lang`: `"hi"` (Hindi), `"kn"` (Kannada), or `"en"` (English)

**Response:**
```json
{
  "translatedText": "<translated text>",
  "targetLanguage": "hi",
  "processingTime": 2500
}
```

---

### Text-to-Speech (TTS)
```http
POST /api/tts
```

*Placeholder endpoint - TTS not yet implemented*

**Request Body:**
```json
{
  "text": "<text to speak>",
  "lang": "hi"
}
```

**Response:**
```json
{
  "audioUrl": null,
  "message": "TTS not yet implemented",
  "text": "<original text>",
  "lang": "hi"
}
```

---

## 🏗️ Architecture

```
Frontend (React)
    ↓
Backend (Express)
    ↓
Ollama HTTP API (localhost:11434)
    ↓
Mistral Model (Local)
```

### Key Features

1. **Chunking Strategy**: Automatically splits documents > 5000 chars into manageable chunks
2. **Confidence Scoring**: Validates summary quality with medical keyword coverage
3. **Safety Checks**: Validates medication dosages and flags ambiguities
4. **Concurrency Control**: Limits concurrent requests to prevent overload
5. **Error Handling**: Comprehensive timeout and retry logic
6. **Privacy First**: All PHI stays local, no external API calls

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
PORT=3001
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
REQUEST_TIMEOUT=60000
MAX_CONCURRENT_REQUESTS=3
LOG_LEVEL=info
LOG_PHI=false
```

### Changing Models

To use a different Ollama model:

```bash
# Pull the model
ollama pull llama3.1

# Update .env
OLLAMA_MODEL=llama3.1

# Restart server
npm start
```

Supported models:
- `mistral` (recommended)
- `llama2`
- `llama3.1`
- `phi3`
- `gemma2`

---

## 🧪 Testing

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3001/health

# Test summarization
curl -X POST http://localhost:3001/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Patient admitted with chest pain..."}'

# Test care guidance
curl -X POST http://localhost:3001/api/care \
  -H "Content-Type: application/json" \
  -d '{"summary": "Diagnosis: Heart attack..."}'
```

### Load Testing

```bash
# Install apache bench
# macOS: brew install httpd
# Linux: apt-get install apache2-utils

# Test with 10 concurrent requests
ab -n 10 -c 3 -p test.json -T application/json http://localhost:3001/api/summarize
```

---

## 📊 Performance

### Typical Response Times (Mistral on Apple M1)

- **Short document** (< 1000 words): 2-4 seconds
- **Medium document** (1000-3000 words): 4-8 seconds  
- **Long document** (> 3000 words, chunked): 10-20 seconds
- **Care guidance**: 3-5 seconds
- **FAQ generation**: 3-6 seconds
- **Translation**: 2-5 seconds

### Optimization Tips

1. **Use SSD**: Ollama models load faster from SSD
2. **Increase RAM**: Allocate more RAM to Ollama
3. **Use GPU**: Enable GPU acceleration for 2-5x speedup
4. **Adjust concurrency**: Lower `MAX_CONCURRENT_REQUESTS` if system struggles

---

## 🔒 Security & Privacy

### Data Privacy

- ✅ All processing happens **locally**
- ✅ No data sent to external APIs
- ✅ No PHI logged to disk (unless `LOG_PHI=true`)
- ✅ No persistent storage of medical data

### Network Security

- Backend only accepts requests from trusted origins (CORS configured)
- Ollama API is not exposed to public network
- Use HTTPS in production
- Consider firewall rules to restrict access

---

## 🐛 Troubleshooting

### Ollama Not Available

**Error:** `ollama_unavailable`

**Solution:**
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

### Model Not Found

**Error:** `model not found: mistral`

**Solution:**
```bash
# Pull the model
ollama pull mistral

# List available models
ollama list
```

### Timeout Errors

**Error:** `summarization_timeout`

**Solutions:**
1. Increase timeout: Set `REQUEST_TIMEOUT=120000` in `.env`
2. Use smaller model: Switch to `phi3` or `gemma2`
3. Enable GPU acceleration for Ollama

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find and kill process using port 3001
# macOS/Linux:
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
```

### High Memory Usage

**Solution:**
1. Reduce concurrent requests: `MAX_CONCURRENT_REQUESTS=2`
2. Use smaller model: `ollama pull phi3`
3. Restart Ollama periodically: `ollama serve`

---

## 📝 Development

### Project Structure

```
backend/
├── server.js           # Main Express server
├── ollamaClient.js     # Ollama HTTP client
├── prompts.js          # Prompt templates
├── utils.js            # Chunking, confidence, validation
├── package.json        # Dependencies
├── .env.example        # Environment template
└── README.md           # This file
```

### Adding New Endpoints

1. Add prompt template to `prompts.js`
2. Add handler in `server.js`
3. Update error handling
4. Test with curl
5. Update this README

### Code Style

- Use async/await (no callbacks)
- Log metadata only (no PHI)
- Handle errors gracefully
- Return consistent JSON structure

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use process manager (PM2 or systemd)
- [ ] Enable HTTPS (nginx reverse proxy)
- [ ] Configure firewall rules
- [ ] Set up monitoring (CPU, memory, response times)
- [ ] Regular Ollama model updates
- [ ] Backup `.env` configuration

### Example PM2 Setup

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name carebridge-backend

# Enable startup script
pm2 startup
pm2 save

# Monitor
pm2 monit
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Support

For issues, questions, or feature requests, please open an issue on GitHub.

**Key Points:**
- Ollama must be running before starting the backend
- Mistral model must be pulled: `ollama pull mistral`
- Default port is 3001 (configurable)
- All processing is local and private

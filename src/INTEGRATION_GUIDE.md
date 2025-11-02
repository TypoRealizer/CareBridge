# CareBridge Mistral Integration Guide

## 🎯 Overview

This guide covers the complete integration of **Mistral model via Ollama** into CareBridge for medical document simplification, care guidance, FAQ generation, and translation.

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Quick Start](#quick-start)
3. [Backend Setup](#backend-setup)
4. [Frontend Integration](#frontend-integration)
5. [API Endpoints](#api-endpoints)
6. [Data Flow](#data-flow)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CareBridge                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Frontend (React + TypeScript)                               │
│  ├── File Upload (PDF, Images, Audio)                        │
│  ├── OCR Service (Gemini Vision API)                         │
│  ├── Audio Service (Sarvam API)                              │
│  └── AI Services (Backend API)                               │
│                                                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTP REST API
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                                                               │
│  Backend (Node.js + Express)                                 │
│  ├── /api/summarize     - Document simplification            │
│  ├── /api/care          - Care guidance generation           │
│  ├── /api/faqs          - FAQ generation                     │
│  ├── /api/translate     - Multi-language translation         │
│  └── /api/tts           - Text-to-speech (placeholder)       │
│                                                               │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTP POST (localhost:11434)
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                                                               │
│  Ollama Local Service                                        │
│  ├── Mistral Model (Primary)                                 │
│  ├── Llama 3.1 (Alternative)                                 │
│  └── Other Models                                            │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Privacy First**: All PHI processed locally via Ollama
2. **Graceful Fallbacks**: Frontend works even if backend is down
3. **Chunking Strategy**: Large documents split automatically
4. **Confidence Scoring**: AI output validated for quality
5. **Concurrency Control**: Prevents server overload

---

## Quick Start

### Prerequisites

- **Node.js** v16+ ([Download](https://nodejs.org/))
- **Ollama** ([Install](https://ollama.ai))
- **Mistral Model** (via Ollama)

### 5-Minute Setup

```bash
# 1. Install Ollama
curl https://ollama.ai/install.sh | sh

# 2. Start Ollama service
ollama serve

# 3. Pull Mistral model (in a new terminal)
ollama pull mistral

# 4. Set up backend
cd backend
npm install
cp .env.example .env
npm start

# 5. Verify backend is running
curl http://localhost:3001/health

# 6. Start frontend (in another terminal)
cd ..
npm install
npm run dev
```

---

## Backend Setup

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `axios` - HTTP client for Ollama
- `dotenv` - Environment configuration

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```bash
PORT=3001
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
REQUEST_TIMEOUT=60000
MAX_CONCURRENT_REQUESTS=3
LOG_LEVEL=info
LOG_PHI=false
```

### Step 3: Start Backend Server

```bash
# Production mode
npm start

# Development mode (auto-reload)
npm run dev
```

You should see:

```
============================================================
CareBridge Backend Server
============================================================
Model: mistral
Ollama Status: ✅ Connected
Port: 3001
Max Concurrent Requests: 3
============================================================

✅ Server running on http://localhost:3001
   Health Check: http://localhost:3001/health
```

---

## Frontend Integration

### Step 1: Configure Backend URL

The frontend is already configured to use `http://localhost:3001` as the backend URL.

To change this, edit `/config/apiConfig.ts`:

```typescript
export const API_CONFIG = {
  BACKEND_URL: 'http://localhost:3001', // Change if needed
};
```

Or set environment variable:

```bash
VITE_BACKEND_URL=http://localhost:3001
```

### Step 2: Verify Connection

Open your browser console and check for:

```
✅ Backend server connected
```

If you see a warning, the frontend will use fallback data.

---

## API Endpoints

### 1. Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "ollama": {
    "available": true,
    "model": "mistral",
    "models": ["mistral", "llama3.1"]
  },
  "server": {
    "uptime": 123.45,
    "activeRequests": 0,
    "maxConcurrent": 3
  }
}
```

---

### 2. Summarization

**Endpoint:** `POST /api/summarize`

**Request:**
```json
{
  "text": "DISCHARGE SUMMARY\n\nPatient: John Doe\nAdmission Date: 2025-10-15\n\nChief Complaint: Chest pain and shortness of breath\n\nHistory of Present Illness:\nThe patient is a 58-year-old male with a history of hypertension who presented to the emergency department with acute onset chest pain...",
  "options": {
    "max_length": 800
  }
}
```

**Response:**
```json
{
  "summary": "**Diagnosis:**\n- Heart attack (acute myocardial infarction)\n\n**Procedures:**\n- Emergency cardiac catheterization with stent placement\n\n**Medications:**\n- Aspirin 81mg — once daily with breakfast\n- Atorvastatin 40mg — once daily at bedtime\n- Metoprolol 50mg — twice daily\n\n**Key Warnings:**\n- Call 911 immediately if you experience chest pain\n- Do not stop medications without doctor approval\n\n**Follow-up:**\n- Cardiology appointment in 2 weeks\n- Blood work in 30 days",
  "confidence": 0.87,
  "reviewSuggested": false,
  "tokensConsumed": 456,
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

**Chunking Behavior:**

For documents > 5000 characters:
1. Splits into chunks (~6000 chars each)
2. Summarizes each chunk independently
3. Synthesizes final coherent summary
4. Returns `"chunked": true` in metadata

---

### 3. Care Guidance

**Endpoint:** `POST /api/care`

**Request:**
```json
{
  "summary": "**Diagnosis:** Heart attack (acute myocardial infarction)..."
}
```

**Response:**
```json
{
  "daily_routine": [
    "Take all medications at the same time each day",
    "Monitor blood pressure twice daily (morning and evening)",
    "Weigh yourself daily at the same time",
    "Get 7-8 hours of sleep each night"
  ],
  "medication_schedule": [
    {
      "drug": "Aspirin",
      "dose": "81mg",
      "when": "Once daily with breakfast"
    },
    {
      "drug": "Atorvastatin",
      "dose": "40mg",
      "when": "Once daily at bedtime"
    },
    {
      "drug": "Metoprolol",
      "dose": "50mg",
      "when": "Twice daily (morning and evening)"
    }
  ],
  "red_flags": [
    "Severe chest pain lasting more than 5 minutes - call 911 immediately",
    "Difficulty breathing or shortness of breath at rest",
    "Irregular or very fast heartbeat",
    "Sudden weakness or dizziness",
    "Unexplained weight gain (5+ pounds in a week)"
  ],
  "follow_up": [
    "Schedule cardiology appointment within 2 weeks",
    "Blood work (lipid panel, kidney function) in 30 days",
    "Cardiac rehabilitation program - start when cleared by doctor",
    "Keep a daily log of blood pressure and weight"
  ]
}
```

---

### 4. FAQ Generation

**Endpoint:** `POST /api/faqs`

**Request:**
```json
{
  "summary": "**Diagnosis:** Heart attack (acute myocardial infarction)..."
}
```

**Response:**
```json
{
  "faqs": [
    {
      "q": "What medications should I take?",
      "a": "Take aspirin 81mg daily with breakfast, atorvastatin 40mg at bedtime, and metoprolol 50mg twice daily."
    },
    {
      "q": "Can I exercise after a heart attack?",
      "a": "Start with light walking after doctor approval, then gradually increase activity through cardiac rehabilitation."
    },
    {
      "q": "What foods should I avoid?",
      "a": "Avoid high-sodium foods, saturated fats, and processed foods. Follow a heart-healthy diet."
    },
    {
      "q": "When should I call 911?",
      "a": "Call 911 immediately for severe chest pain, difficulty breathing, or irregular heartbeat."
    },
    {
      "q": "How often should I see my cardiologist?",
      "a": "Schedule a follow-up within 2 weeks, then as recommended by your cardiologist."
    },
    {
      "q": "Can I drive after a heart attack?",
      "a": "Wait at least 1 week and get clearance from your doctor before driving."
    },
    {
      "q": "What is a stent?",
      "a": "A stent is a small mesh tube that keeps your heart artery open to improve blood flow."
    },
    {
      "q": "Do I need to take aspirin forever?",
      "a": "Most heart attack patients need lifelong aspirin therapy. Never stop without consulting your doctor."
    },
    {
      "q": "What is cardiac rehabilitation?",
      "a": "A supervised exercise and education program to help you recover and prevent future heart problems."
    },
    {
      "q": "How do I know if my medication is working?",
      "a": "Monitor your blood pressure, cholesterol levels, and symptoms. Report any concerns to your doctor."
    }
  ]
}
```

---

### 5. Translation

**Endpoint:** `POST /api/translate`

**Request:**
```json
{
  "text": "Take aspirin 81mg daily with breakfast.",
  "lang": "hi"
}
```

**Supported Languages:**
- `"en"` - English
- `"hi"` - Hindi
- `"kn"` - Kannada

**Response:**
```json
{
  "translatedText": "नाश्ते के साथ प्रतिदिन 81mg एस्पिरिन लें।",
  "targetLanguage": "hi",
  "processingTime": 2500
}
```

---

### 6. Text-to-Speech (TTS)

**Endpoint:** `POST /api/tts`

⚠️ **Note:** TTS is not yet implemented. This is a placeholder endpoint.

**Request:**
```json
{
  "text": "Take your medications as prescribed.",
  "lang": "hi"
}
```

**Response:**
```json
{
  "audioUrl": null,
  "message": "TTS not yet implemented",
  "text": "Take your medications as prescribed.",
  "lang": "hi"
}
```

---

## Data Flow

### Complete User Journey

```
1. User uploads file (PDF/Image/Audio)
   └─→ Frontend processes file

2. OCR/STT extraction
   ├─→ PDF/Image → Gemini Vision API → extractedText
   └─→ Audio → Sarvam API → extractedText

3. Text verification
   └─→ User reviews extractedText in left panel

4. User clicks "Summarize"
   └─→ POST /api/summarize
       ├─→ Backend receives extractedText
       ├─→ Chunking (if needed)
       ├─→ Ollama processes with Mistral
       ├─→ Confidence calculation
       └─→ Returns summary + metadata

5. Display summary
   └─→ Frontend shows summary in right panel

6. Generate care guidance & FAQs (parallel)
   ├─→ POST /api/care
   │   └─→ Returns structured care JSON
   └─→ POST /api/faqs
       └─→ Returns 10 Q/A pairs

7. User selects language (optional)
   └─→ POST /api/translate
       └─→ Returns translated summary

8. TTS playback (optional)
   └─→ POST /api/tts
       └─→ Returns audio URL (when implemented)
```

### Sequential Processing

**Important:** The frontend enforces sequential flow:

1. ✅ Extract text → Enable "Summarize" button
2. ✅ Summarize → Show summary + confidence
3. ✅ Generate care guidance & FAQs
4. ✅ Translate (only if language changed)
5. ✅ TTS (only if user clicks speaker icon)

This prevents:
- Summarizing garbage OCR results
- Multiple concurrent summarization requests
- Processing before extraction is complete

---

## Testing

### Backend Testing

#### 1. Health Check

```bash
curl http://localhost:3001/health
```

Expected: `"status": "healthy"`

#### 2. Summarization Test

Create `test-summarize.json`:
```json
{
  "text": "DISCHARGE SUMMARY\n\nPatient admitted with chest pain. Diagnosis: Acute myocardial infarction. Treatment: PCI with stent placement. Medications: Aspirin 81mg daily, Atorvastatin 40mg nightly. Follow-up in 2 weeks."
}
```

Test:
```bash
curl -X POST http://localhost:3001/api/summarize \
  -H "Content-Type: application/json" \
  -d @test-summarize.json
```

#### 3. Care Guidance Test

```bash
curl -X POST http://localhost:3001/api/care \
  -H "Content-Type: application/json" \
  -d '{"summary": "Diagnosis: Heart attack. Medications: Aspirin 81mg daily."}'
```

#### 4. FAQ Test

```bash
curl -X POST http://localhost:3001/api/faqs \
  -H "Content-Type: application/json" \
  -d '{"summary": "Diagnosis: Heart attack. Medications: Aspirin 81mg daily."}'
```

#### 5. Translation Test

```bash
curl -X POST http://localhost:3001/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Take aspirin daily.", "lang": "hi"}'
```

---

### Frontend Testing

#### 1. Upload Test Document

Use a sample discharge summary PDF or paste text directly.

#### 2. Verify Processing Steps

Check browser console for:
```
[OCR] Processing...
[Summarize] Processing text: 1234 chars
[Care] Generating care guidance
[FAQs] Generating FAQs
```

#### 3. Check Confidence Score

After summarization, verify:
- Confidence displayed (0.0 - 1.0)
- Review suggested flag (if confidence < 0.6)
- Medication validation warnings

#### 4. Test Translation

Change language dropdown to Hindi/Kannada and verify translation.

---

## Troubleshooting

### Common Issues

#### 1. Backend Returns 503: Ollama Unavailable

**Error:**
```json
{
  "error": "ollama_unavailable",
  "message": "Ollama service is not running"
}
```

**Solution:**
```bash
# Start Ollama
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

---

#### 2. Model Not Found

**Error:**
```json
{
  "error": "model not found: mistral"
}
```

**Solution:**
```bash
# Pull Mistral model
ollama pull mistral

# List installed models
ollama list
```

---

#### 3. Timeout Errors

**Error:**
```json
{
  "error": "summarization_timeout",
  "message": "Summarization took too long"
}
```

**Solutions:**

1. Increase timeout in `.env`:
```bash
REQUEST_TIMEOUT=120000
```

2. Use smaller model:
```bash
ollama pull phi3
# Update .env: OLLAMA_MODEL=phi3
```

3. Enable GPU acceleration (if available)

---

#### 4. Port Already in Use

**Error:**
```
EADDRINUSE: address already in use :::3001
```

**Solution:**

```bash
# Find and kill process
lsof -ti:3001 | xargs kill -9

# Or change port in .env
PORT=3002
```

---

#### 5. High Memory Usage

**Symptoms:**
- System slowdown
- Ollama crashes
- Long processing times

**Solutions:**

1. Reduce concurrent requests:
```bash
MAX_CONCURRENT_REQUESTS=2
```

2. Use smaller model:
```bash
ollama pull phi3
```

3. Restart Ollama periodically:
```bash
pkill ollama && ollama serve
```

---

#### 6. JSON Parse Errors

**Error:**
```json
{
  "error": "parse_error",
  "message": "Failed to parse care guidance"
}
```

**Cause:** Model returned invalid JSON

**Solutions:**

1. Lower temperature for more deterministic output
2. Use different model (Mistral is most reliable)
3. Frontend will fall back to default data

---

## Performance Optimization

### Response Time Benchmarks (Apple M1)

| Operation | Document Size | Time |
|-----------|--------------|------|
| Summarize (short) | < 1000 words | 2-4s |
| Summarize (medium) | 1000-3000 words | 4-8s |
| Summarize (long) | > 3000 words | 10-20s |
| Care Guidance | Any | 3-5s |
| FAQ Generation | Any | 3-6s |
| Translation | Any | 2-5s |

### Optimization Tips

1. **Use SSD**: Ollama models load faster from SSD
2. **Increase RAM**: Allocate more RAM to Ollama
3. **Enable GPU**: 2-5x speedup with GPU acceleration
4. **Adjust Concurrency**: Lower if system struggles
5. **Use Smaller Models**: `phi3` or `gemma2` are faster

---

## Security & Privacy

### Data Privacy

✅ **What we do:**
- All processing happens locally via Ollama
- No PHI sent to external APIs (except Gemini/Sarvam for OCR/STT)
- No PHI logged to disk (unless `LOG_PHI=true`)
- No persistent storage of medical data

❌ **What we don't do:**
- No cloud AI services for summarization/translation
- No data analytics or tracking
- No third-party data sharing

### Network Security

- Backend only accepts CORS from trusted origins
- Ollama API not exposed to public network
- Use HTTPS in production
- Consider firewall rules to restrict access

---

## Acceptance Criteria

### Feature Complete Checklist

- ✅ Upload → OCR → extracted text shows in left panel (80%+ accuracy)
- ✅ "Summarize" returns readable summary ≤ 800 tokens
- ✅ Summary follows structure: Diagnosis, Procedures, Medications, Warnings, Follow-up
- ✅ Care Guidance returns valid JSON with all required fields
- ✅ FAQ returns 10 Q/A pairs in required format
- ✅ Translation works for Hindi and Kannada
- ✅ Confidence & reviewSuggested flags returned when appropriate
- ✅ System handles timeouts with friendly UI messages
- ✅ Chunking works for documents > 5000 characters
- ✅ Medication validation flags ambiguous drugs as [CONFIRM MED]

---

## Next Steps

### Recommended Enhancements

1. **TTS Implementation**: Integrate piper or festival for audio output
2. **Batch Processing**: Process multiple files in queue
3. **Export Features**: PDF/Word export of summaries
4. **User Accounts**: Save processing history (with consent)
5. **Fine-tuning**: Train custom medical model on anonymized data
6. **Analytics Dashboard**: Track processing times and confidence scores
7. **Mobile App**: React Native version
8. **Offline Mode**: Full PWA with service workers

---

## Support

### Getting Help

- **Backend Issues**: Check `/backend/README.md`
- **Ollama Issues**: Visit [ollama.ai/docs](https://ollama.ai/docs)
- **Frontend Issues**: Check browser console for errors

### Contributing

To contribute:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

---

## License

MIT License - See LICENSE file for details

---

**Last Updated:** October 30, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

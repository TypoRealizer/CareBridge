# 🏥 CareBridge - AI-Powered Medical Document Simplification Platform

<div align="center">

![CareBridge Logo](https://img.shields.io/badge/CareBridge-Healthcare_AI-10B981?style=for-the-badge)
![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

**Transforming Complex Medical Documents into Patient-Friendly Instructions**

[Features](#-features) • [Architecture](#-architecture) • [Installation](#-installation) • [Usage](#-usage) • [API Documentation](#-api-documentation) • [Team](#-team)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
- [API Configuration](#-api-configuration)
- [Project Structure](#-project-structure)
- [Development Team](#-development-team)
- [License](#-license)

---

## 🎯 Overview

**CareBridge** is an intelligent web application that bridges the communication gap between healthcare providers and patients by simplifying complex medical discharge summaries into easy-to-understand language. The platform supports multiple input formats (PDF, images, audio, text) and provides comprehensive care guidance, medication instructions, and multilingual support.

### **Problem Statement**

Medical discharge summaries contain complex medical jargon that patients often struggle to understand, leading to:
- Medication non-compliance
- Missed follow-up appointments
- Confusion about care instructions
- Increased hospital readmissions

### **Solution**

CareBridge uses advanced AI to:
- ✅ Extract text from medical documents (OCR)
- ✅ Simplify medical terminology into plain language
- ✅ Generate personalized care guidance
- ✅ Create easy-to-follow FAQs
- ✅ Translate instructions to Hindi
- ✅ Provide interactive term explanations
- ✅ Support voice recording for accessibility

---

## ✨ Features

### **1. Multi-Format Input Support**

#### **📄 Document Upload**
- **Supported Formats:** PDF, JPG, PNG
- **Processing:** Gemini Vision API for OCR
- **Max Size:** 10MB per file
- **Features:** Drag-and-drop, click to upload, automatic text extraction

#### **🎤 Voice Recording**
- **Technology:** Browser MediaRecorder API → Sarvam AI
- **Supported:** Real-time voice recording (WebM format)
- **Languages:** English, Hindi, 9 Indian regional languages
- **Max Duration:** 5 minutes per recording
- **Features:** Visual recording indicator, automatic transcription

#### **📝 Direct Text Input**
- **Method:** Paste text directly into textarea
- **Max Length:** 50,000 characters
- **Features:** Character counter, real-time validation, instant processing

#### **🎧 Audio File Upload**
- **Formats:** MP3, WAV, OGG, FLAC, M4A
- **Max Size:** 25MB
- **Transcription:** Sarvam AI Speech-to-Text
- **Languages:** 11 Indian languages

### **2. AI-Powered Simplification**

#### **Medical Term Simplification**
- **Engine:** Mistral LLM (Local Ollama)
- **Process:** Context-aware simplification
- **Output:** Patient-friendly language at 6th-grade reading level
- **Features:**
  - Replaces complex medical terms with simple alternatives
  - Maintains clinical accuracy
  - Preserves critical information

#### **Interactive Glossary**
- **Database:** 500+ pre-loaded medical terms
- **Highlighting:** Automatic term detection in text
- **Interaction:** Click any highlighted term for instant explanation
- **Caching:** Terms cached for instant re-access
- **Features:**
  - Simple definition
  - Detailed explanation
  - Related terms

### **3. Care Guidance Generation**

Automatically generates comprehensive care instructions:

- **💊 Medications:** Dosage, timing, precautions
- **📅 Follow-up Care:** Appointment schedules, tests
- **🍽️ Diet Recommendations:** Food to eat/avoid
- **⚠️ Warning Signs:** When to seek immediate help
- **🏃 Activity Level:** Exercise and rest guidelines
- **🩺 Wound Care:** Specific care instructions (if applicable)

### **4. FAQ Generation**

Creates relevant frequently asked questions covering:
- Recovery timeline expectations
- Lifestyle modifications
- Medication side effects
- Emergency situations
- Follow-up care

### **5. Multilingual Translation**

#### **English → Hindi Translation**
- **API:** JigsawStack (High Accuracy)
- **Fallback:** Ollama Mistral (Offline mode)
- **Features:**
  - Batch processing for efficiency
  - Preserves formatting and structure
  - Translates summary, care guidance, and FAQs
  - Real-time progress indicators

### **6. Text-to-Speech (TTS)**

- **Technology:** Web Speech API
- **Voices:** Multiple voice options
- **Languages:** English, Hindi
- **Features:**
  - Play/pause controls
  - Stop functionality
  - Automatic voice selection
- **Limit:** 5,000 characters per TTS session

### **7. Download Options**

#### **📥 Download Simplified Text**
- **Format:** Plain text (.txt)
- **Content:** Complete simplified summary
- **Filename:** `carebridge-summary-YYYY-MM-DD.txt`

#### **📥 Download Full Report**
- **Format:** Markdown (.md)
- **Content:**
  - Simplified summary
  - Care guidance (all categories)
  - FAQs with answers
  - Glossary of terms
- **Filename:** `carebridge-full-report-YYYY-MM-DD.md`

### **8. Premium UI/UX**

#### **Design Elements**
- **Color Scheme:**
  - Medical Teal: `#10B981`
  - Medical Blue: `#3B82F6`
  - Gradients: Teal-blue transitions
- **Glass Morphism:** Frosted glass effects on cards
- **Animations:** Framer Motion for smooth transitions
- **Responsive:** Mobile-first design
- **Dark Mode:** Subtle dark background with bright accents

#### **Split Panel Display (40-60)**
- **Left Panel (40%):** Original/simplified text display
- **Right Panel (60%):** Care guidance and FAQs
- **Features:**
  - Resizable panels
  - Sticky headers
  - Smooth scrolling
  - Synchronized content

---

## 🛠️ Technology Stack

### **Frontend**

| Technology | Purpose | Version |
|------------|---------|---------|
| **React** | UI Framework | 18.3.x |
| **TypeScript** | Type Safety | 5.6.x |
| **Tailwind CSS v4** | Styling | 4.0.x |
| **Vite** | Build Tool | 6.0.x |
| **Framer Motion** | Animations | Latest |
| **React Router** | Navigation | 7.x |
| **Sonner** | Toast Notifications | 2.0.3 |
| **Lucide React** | Icons | Latest |

### **Backend**

| Technology | Purpose | Details |
|------------|---------|---------|
| **Node.js** | Runtime | 18.x+ |
| **Express.js** | API Server | 4.x |
| **Ollama** | Local LLM | Mistral Model |
| **Mistral** | AI Model | 7B Parameters |

### **AI Services**

| Service | Purpose | Tier | Limits |
|---------|---------|------|--------|
| **Google Gemini API** | OCR/Vision | Free | 20 RPD per model |
| **Sarvam AI** | Audio Transcription | Free | 1000 requests/month |
| **JigsawStack** | Translation | Free | 100 requests/day |
| **Ollama (Local)** | AI Processing | Free | Unlimited (local) |

---

## 🏗️ System Architecture

### **Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                       CAREBRIDGE FRONTEND                        │
│                    (React + TypeScript + Vite)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Gemini API │  │  Sarvam API  │  │    Backend   │
│   (Vision)   │  │   (Audio)    │  │    Server    │
│     OCR      │  │Transcription │  │  (Express)   │
└──────────────┘  └──────────────┘  └──────┬───────┘
                                            │
                                            ▼
                                   ┌──────────────┐
                                   │    Ollama    │
                                   │   (Mistral)  │
                                   │  Local LLM   │
                                   └──────┬───────┘
                                          │
                      ┌───────────────────┼───────────────────┐
                      ▼                   ▼                   ▼
              ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
              │Summarization │    │Care Guidance │   │ Translation  │
              │   Service    │    │   Service    │   │   Service    │
              └──────────────┘    └──────────────┘   └──────┬───────┘
                                                             │
                                                             ▼
                                                    ┌──────────────┐
                                                    │ JigsawStack  │
                                                    │     API      │
                                                    │ (Translation)│
                                                    └──────────────┘
```

### **Data Flow**

```
1. INPUT STAGE
   User uploads document/audio/text
   ↓
2. EXTRACTION STAGE
   - PDF/Image → Gemini Vision API → Extracted Text
   - Audio → Sarvam API → Transcribed Text
   - Text → Direct Processing
   ↓
3. VALIDATION STAGE
   - Text length check (50K max)
   - Medical document validation
   - Quality assurance
   ↓
4. AI PROCESSING STAGE (Backend - Ollama Mistral)
   - Simplification (Patient-friendly language)
   - Care Guidance Generation (6 categories)
   - FAQ Generation (5-7 questions)
   ↓
5. POST-PROCESSING STAGE
   - Remove OCR artifacts
   - Format medications
   - Clean repeated phrases
   ↓
6. TRANSLATION STAGE (Optional)
   - JigsawStack API (High quality)
   - Fallback: Ollama (Offline)
   - Batch processing for efficiency
   ↓
7. DISPLAY STAGE
   - 40-60 split panel
   - Interactive glossary highlighting
   - TTS & Download options
```

### **API Request Flow**

```javascript
// OCR Processing
Frontend → Gemini API → Extracted Text → Frontend

// Audio Processing
Frontend → Sarvam API → Transcribed Text → Frontend

// AI Simplification
Frontend → Backend (/api/summarize) → Ollama → Simplified Text → Backend → Frontend

// Care Guidance
Frontend → Backend (/api/care) → Ollama → Care Items → Backend → Frontend

// FAQ Generation
Frontend → Backend (/api/faqs) → Ollama → FAQ List → Backend → Frontend

// Translation
Frontend → Backend (/api/translate-batch) → JigsawStack API → Translated Text → Backend → Frontend
```

---

## 📦 Installation & Setup

### **Prerequisites**

- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **Ollama:** Latest version ([Install Guide](https://ollama.ai/download))
- **Mistral Model:** Downloaded via Ollama

### **Step 1: Clone Repository**

```bash
git clone https://github.com/your-username/carebridge.git
cd carebridge
```

### **Step 2: Install Frontend Dependencies**

```bash
npm install
```

### **Step 3: Install Backend Dependencies**

```bash
cd backend
npm install
cd ..
```

### **Step 4: Install Ollama & Mistral Model**

```bash
# Download and install Ollama from https://ollama.ai/download

# Pull Mistral model
ollama pull mistral

# Verify installation
ollama list
```

### **Step 5: Configure API Keys**

Create `.env` file in project root:

```env
# Frontend Environment Variables
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_SARVAM_API_KEY=your_sarvam_api_key_here
VITE_BACKEND_URL=http://localhost:3001

# Backend Environment Variables (create backend/.env)
PORT=3001
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
MAX_CONCURRENT_REQUESTS=5
JIGSAWSTACK_API_KEY=your_jigsawstack_api_key_here
```

**Get API Keys:**

1. **Gemini API:** https://aistudio.google.com/app/apikey (Free tier available)
2. **Sarvam API:** https://www.sarvam.ai/ (Sign up for free)
3. **JigsawStack:** https://jigsawstack.com/ (Free tier: 100 req/day)

### **Step 6: Start Development Servers**

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd ..
npm run dev
```

**Access Application:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

---

## 📖 Usage Guide

### **1. Upload Document**

1. Navigate to homepage
2. Choose upload method:
   - **Drag & Drop:** Drop PDF/image onto upload zone
   - **Click to Upload:** Click upload area and select file
   - **Paste Text:** Click "Paste Text" tab and paste content
   - **Voice Record:** Click microphone icon and record
   - **Audio Upload:** Upload MP3/WAV file

3. Wait for processing (progress bar shows status)

### **2. View Results**

#### **Left Panel - Simplified Summary**
- Original text in patient-friendly language
- Medical terms highlighted in teal
- Click any highlighted term for explanation

#### **Right Panel - Care Guidance**
- **Medications Tab:** Dosage and timing
- **Follow-up Tab:** Appointments and tests
- **Diet Tab:** Nutrition recommendations
- **Warnings Tab:** Red flags to watch
- **Activity Tab:** Exercise guidelines
- **FAQs Tab:** Common questions

### **3. Translate to Hindi**

1. Click language dropdown (top-right)
2. Select "हिंदी (Hindi)"
3. Wait for translation (10-30 seconds)
4. All content translates (summary, care guidance, FAQs)

### **4. Listen to Summary (TTS)**

1. Click **"Listen to Summary"** button
2. Audio plays automatically
3. Controls: Play/Pause, Stop
4. Limit: First 5,000 characters

### **5. Download Reports**

- **Download Summary:** Plain text file (.txt)
- **Download Full Report:** Markdown with all sections (.md)

---

## 🔧 API Configuration

### **API Endpoints**

#### **Frontend API Calls**

```typescript
// Gemini Vision API (OCR)
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash:generateContent
Headers: { Content-Type: 'application/json' }
URL Param: ?key=GEMINI_API_KEY
Body: { contents: [{ parts: [{ text, inline_data }] }] }

// Sarvam Audio API
POST https://api.sarvam.ai/speech-to-text
Headers: { 'API-Subscription-Key': SARVAM_API_KEY }
Body: FormData { file, language_code }
```

#### **Backend API Endpoints**

```typescript
// Summarization
POST /api/summarize
Body: { text: string, options?: object }
Response: { summary: string, processingTime: number }

// Care Guidance
POST /api/care
Body: { text: string }
Response: { careGuidance: CareGuidanceItem[] }

// FAQ Generation
POST /api/faqs
Body: { text: string }
Response: { faqs: FAQ[] }

// Translation (Batch)
POST /api/translate-batch
Body: { texts: string[], targetLanguage: 'hi' }
Response: { translations: string[], method: string }

// Health Check
GET /health
Response: { status: string, services: object }
```

### **Rate Limits**

| Service | Free Tier Limit | Current Usage |
|---------|----------------|---------------|
| Gemini (gemini-3-flash) | 20 RPD | ~1-2 per upload |
| Gemini (gemini-2.5-flash-lite) | 20 RPD | Fallback |
| Sarvam AI | 1000 requests/month | 1 per audio upload |
| JigsawStack | 100 requests/day | 1-3 per translation |
| Ollama (Local) | Unlimited | All AI processing |

---

## 📁 Project Structure

```
carebridge/
├── src/
│   ├── components/           # React components
│   │   ├── HomePage.tsx      # Landing page with upload options
│   │   ├── ResultsPage.tsx   # Results display with split panel
│   │   ├── MedicalTermModal.tsx  # Term explanation popup
│   │   ├── Header.tsx        # Navigation header
│   │   ├── Footer.tsx        # Footer component
│   │   └── ui/               # Reusable UI components (40+ components)
│   ├── services/             # API service modules
│   │   ├── ocrService.ts     # Gemini Vision OCR
│   │   ├── audioService.ts   # Sarvam audio transcription
│   │   ├── simplificationService.ts  # Mistral summarization
│   │   ├── careGuidanceService.ts    # Care guidance generation
│   │   ├── faqService.ts     # FAQ generation
│   │   ├── translationService.ts     # Translation (Ollama)
│   │   ├── batchTranslationService.ts  # Batch translation (JigsawStack)
│   │   └── medicalTermsService.ts    # Glossary management
│   ├── utils/                # Utility functions
│   │   └── fileProcessing.ts # File handling and processing
│   ├── data/                 # Static data
│   │   └── medicalTerms.json # Medical glossary (500+ terms)
│   ├── config/               # Configuration
│   │   └── apiConfig.ts      # API keys and endpoints
│   ├── types/                # TypeScript types
│   │   └── index.ts          # Type definitions
│   ├── styles/               # Global styles
│   │   └── globals.css       # Tailwind CSS v4 + custom styles
│   └── App.tsx               # Main app component
├── backend/                  # Node.js backend server
│   ├── server.js             # Express server
│   ├── ollamaClient.js       # Ollama API client
│   ├── prompts_mistral_optimized.js  # Mistral prompts
│   ├── postProcessSummary.js # Post-processing logic
│   ├── outputValidator.js    # Output validation
│   ├── documentParser.js     # Document parsing utilities
│   └── utils.js              # Backend utilities
├── public/                   # Static assets
├── .env                      # Environment variables
├── package.json              # Frontend dependencies
├── backend/package.json      # Backend dependencies
├── tsconfig.json             # TypeScript config
├── vite.config.ts            # Vite configuration
└── tailwind.config.js        # Tailwind CSS v4 config
```

---

## 👥 Development Team

**4-Member Team** working on CareBridge:

| Member | Role | Responsibilities |
|--------|------|------------------|
| **Person 1** | Frontend UI/UX Lead | UI design, animations, component architecture, TTS, download features |
| **Person 2** | Audio Processing Engineer | Sarvam API integration, voice recording, audio transcription pipeline |
| **Person 3** | OCR & Glossary Specialist | Gemini API integration, OCR implementation, glossary system, term highlighting |
| **Person 4** | AI/LLM Integration Lead | Mistral implementation, backend architecture, translation, care guidance/FAQ generation |

---

## 🎓 Academic Project Information

**Institution:** [Your University/College Name]  
**Course:** [Course Name/Code]  
**Semester:** [Semester/Year]  
**Submission Date:** [Date]

### **Project Objectives**

1. ✅ Simplify medical discharge summaries for patients
2. ✅ Support multiple input formats (document, audio, text)
3. ✅ Provide personalized care guidance and FAQs
4. ✅ Enable multilingual support (English/Hindi)
5. ✅ Implement cost-effective AI architecture
6. ✅ Ensure data privacy and security

### **Key Achievements**

- 🎯 **96% Cost Reduction:** Free-tier APIs + local LLM
- 🎯 **Multi-format Support:** 6 input methods
- 🎯 **High Accuracy:** JigsawStack translation quality
- 🎯 **Interactive Glossary:** 500+ medical terms
- 🎯 **Responsive Design:** Mobile-first approach
- 🎯 **Type Safety:** Full TypeScript implementation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Google Gemini Team** - For free OCR API
- **Sarvam AI** - For Indian language audio support
- **Ollama** - For enabling local LLM deployment
- **Mistral AI** - For powerful open-source model
- **JigsawStack** - For high-quality translation API

---

## 📞 Support & Contact

For questions or issues:
- **Email:** carebridge.support@example.com
- **GitHub Issues:** [Create an issue](https://github.com/your-username/carebridge/issues)
- **Documentation:** See individual team member documentation files

---

<div align="center">

**Built with ❤️ by the CareBridge Team**

[⬆ Back to Top](#-carebridge---ai-powered-medical-document-simplification-platform)

</div>

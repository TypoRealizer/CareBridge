# 🏥 CareBridge

**Simplifying Medical Documents with AI for Better Patient Understanding**

CareBridge is an innovative healthcare application that leverages AI to transform complex medical documents into easy-to-understand language, making healthcare more accessible to everyone.

---

## 🌟 Features

### 📄 Document Processing
- **Multiple Input Methods**: Upload PDF/DOC files or paste text directly
- **AI-Powered Simplification**: Uses Mistral AI to convert complex medical jargon into plain language
- **Medical Term Highlighting**: Interactive highlighting of medical terms with detailed explanations
- **Side-by-Side Comparison**: View original and simplified documents simultaneously

### 🔊 Multilingual Support
- **Text-to-Speech**: Listen to simplified documents in multiple languages
- **Language Options**: 
  - 🇺🇸 English
  - 🇮🇳 हिंदी (Hindi)
  - 🇮🇳 ಕನ್ನಡ (Kannada)
- **Real-time Translation**: Convert output to your preferred language

### 📋 Care Guidance
- **Interactive Task List**: Track your post-discharge care activities
- **Priority-Based Organization**: Tasks categorized by High, Medium priority
- **Progress Tracking**: Visual progress bar showing completion percentage
- **Detailed Instructions**: Clear, actionable guidance for each care task

### ❓ Smart FAQ System
- **Contextual Questions**: Common questions related to your condition
- **Searchable Database**: Quick search to find relevant answers
- **Categorized Topics**: Organized by Medication, Diet, Emergency, Lifestyle, etc.
- **Detailed Explanations**: Comprehensive answers with additional information

### 🎨 Modern User Experience
- **Glassmorphism Design**: Beautiful, modern UI with glass-card effects
- **Smooth Animations**: Framer Motion powered transitions and interactions
- **Responsive Layout**: Seamless experience across desktop, tablet, and mobile
- **Dark Mode Support**: Eye-friendly interface for all lighting conditions

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: 
  - Tailwind CSS
  - Custom CSS with Glassmorphism effects
- **UI Components**: 
  - Radix UI (Accordion, Select, Tabs, Progress)
  - Lucide React (Icons)
- **Animations**: Framer Motion
- **Routing**: React Router DOM
- **File Handling**: 
  - React Dropzone
  - Tesseract.js (OCR)
  - PDF.js (PDF parsing)
  - Mammoth.js (DOC/DOCX parsing)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **AI Integration**: Mistral AI API
- **CORS**: Enabled for cross-origin requests
- **Body Parser**: JSON request handling

### AI & Language Processing
- **Primary AI**: Mistral AI (mistral-large-latest model)
- **OCR**: Tesseract.js for image text extraction
- **Speech**: Web Speech API for text-to-speech
- **Translation**: Mistral AI for multilingual output

---

## 📁 Project Structure

```
CareBridge/
├── src/
│   ├── components/
│   │   ├── HomePage.tsx          # Main landing page
│   │   ├── ResultsPage.tsx       # Document analysis results
│   │   ├── MedicalTermModal.tsx  # Term explanation popup
│   │   └── Footer.tsx            # Footer component
│   ├── services/
│   │   ├── audioService.ts       # Text-to-speech functionality
│   │   └── mistralService.ts     # Mistral AI integration
│   ├── utils/
│   │   └── fileProcessing.ts     # File parsing utilities
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # App entry point
│   └── index.css                 # Global styles
├── backend/
│   ├── server.js                 # Express server
│   └── .env                      # Environment variables (gitignored)
├── public/                       # Static assets
├── .gitignore                    # Git ignore rules
├── package.json                  # Frontend dependencies
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Mistral AI API Key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TypoRealizer/CareBridge.git
   cd CareBridge
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up environment variables**
   
   Create a `.env` file in the `backend` directory:
   
   **If using Mistral API (Cloud):**
   ```env
   MISTRAL_API_KEY=your_mistral_api_key_here
   PORT=3001
   ```
   
   **If using Mistral Locally (Ollama/LM Studio):**
   ```env
   MISTRAL_LOCAL_URL=http://localhost:11434
   MISTRAL_MODEL=mistral:latest
   USE_LOCAL_MISTRAL=true
   PORT=3001
   ```
   
   **Note**: 
   - For local setup, you need to have Ollama or LM Studio running with Mistral model
   - The default Ollama URL is `http://localhost:11434`
   - Make sure the Mistral model is downloaded: `ollama pull mistral`
   
### Running the Application

1. **Start the backend server**
   ```bash
   cd backend
   npm start
   ```
   The backend will run on `http://localhost:3001`

2. **Start the frontend development server** (in a new terminal)
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000`

---

## 📖 Usage Guide

### Uploading Documents

1. **Drag & Drop**: Drag PDF or DOC files onto the upload zone
2. **Click to Browse**: Click the upload area to select files from your device
3. **Paste Text**: Alternatively, paste medical text directly into the text area

### Viewing Results

1. **Simplified View Tab**: 
   - See original and simplified documents side-by-side
   - Click highlighted medical terms for detailed explanations
   - Use Listen/Stop button for audio playback
   - Download simplified version

2. **Care Guidance Tab**:
   - Review post-discharge care tasks
   - Check off completed tasks
   - Track your progress with the visual progress bar

3. **FAQ Tab**:
   - Search for specific questions
   - Browse categorized frequently asked questions
   - Read detailed answers with additional context

---

## 🔑 Key Features Explained

### AI-Powered Simplification
CareBridge uses Mistral AI's large language model to analyze medical documents and create patient-friendly versions while maintaining accuracy.

### Interactive Medical Terms
Medical jargon is automatically detected and highlighted. Clicking any term opens a modal with:
- Original medical term
- Simplified version
- Detailed explanation in plain language

### Multilingual Support
The application can output simplified text in multiple languages, making healthcare accessible to diverse populations.

### Progress Tracking
The Care Guidance tab helps patients stay on top of their recovery with:
- Checklist of important tasks
- Visual progress indicators
- Priority-based organization

---

Made with ❤️ for better healthcare accessibility

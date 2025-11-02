/**
 * API Configuration File - Updated Architecture
 * 
 * CareBridge uses a hybrid architecture:
 * 1. Google Gemini Vision API (Frontend → Gemini) for OCR
 * 2. Ollama Local Models (Frontend → Backend → Ollama) for AI processing
 * 3. Sarvam API (Frontend → Sarvam) for audio transcription
 * 
 * CONFIGURATION OPTIONS:
 * 
 * Option 1 (Recommended for Development):
 * - Create a .env file in the project root
 * - Copy .env.example and fill in your keys
 * - Environment variables will be used automatically
 * 
 * Option 2 (Quick Start):
 * - Replace the placeholder values below with your actual API keys
 * - This works but is less secure
 * 
 * HOW TO GET YOUR API KEYS:
 * 
 * 1. Google Gemini API (for OCR):
 *    - Go to https://aistudio.google.com/app/apikey
 *    - Click "Get API Key" or "Create API Key"
 *    - Copy the API key and add it below or to .env as VITE_GEMINI_API_KEY
 *    - Note: Free tier available, no credit card required
 * 
 * 2. Sarvam API (for audio transcription):
 *    - Go to https://www.sarvam.ai/
 *    - Sign up and get your API key
 *    - Add it below or to .env as VITE_SARVAM_API_KEY
 * 
 * 3. Backend URL (for Ollama services):
 *    - Set up your Ollama backend server
 *    - Update BACKEND_URL below (default: http://localhost:3001)
 *    - The backend handles: summarization, FAQ generation, care guidance, translation
 */

// Safe GEMINI key resolution that works in browser (vite) and Node
const GEMINI_API_KEY =
  (typeof process !== 'undefined' && (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)) ||
  (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GEMINI_API_KEY)) ||
  'YOUR_GEMINI_API_KEY_HERE';

export default { GEMINI_API_KEY };

export const API_CONFIG = {
  // Google Gemini API for OCR/Vision
  // Priority: 1. Environment variable, 2. Hard-coded value
  GEMINI_API_KEY: GEMINI_API_KEY,
  
  // Sarvam API for Audio-to-Text transcription
  SARVAM_API_KEY: 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SARVAM_API_KEY) || 
    'YOUR_SARVAM_API_KEY_HERE',
  
  // Backend Server URL (Ollama endpoints)
  BACKEND_URL: 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 
    'http://localhost:3001',
};

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Google Gemini Generative Language API (v1)
  // Use a '-latest' alias to avoid 404s when specific revisions change
  GEMINI_VISION: 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent',
  
  // Sarvam API for Speech-to-Text
  SARVAM_SPEECH_TO_TEXT: 'https://api.sarvam.ai/speech-to-text',
  
  // Backend Ollama endpoints
  BACKEND: {
    SUMMARIZE: `${API_CONFIG.BACKEND_URL}/api/summarize`,
    GENERATE_FAQ: `${API_CONFIG.BACKEND_URL}/api/faqs`,
    CARE_GUIDANCE: `${API_CONFIG.BACKEND_URL}/api/care`,
    TRANSLATE: `${API_CONFIG.BACKEND_URL}/api/translate`,
    TTS: `${API_CONFIG.BACKEND_URL}/api/tts`,
  }
};

/**
 * Validate if API keys are configured
 */
export const validateApiKeys = () => {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Critical: Gemini API for OCR
  if (API_CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    errors.push('🔴 Gemini API key not configured. OCR functionality will not work.');
  } else {
    console.log('✅ Gemini API key configured');
  }
  
  // Optional but recommended: Sarvam API for audio
  if (API_CONFIG.SARVAM_API_KEY === 'YOUR_SARVAM_API_KEY_HERE') {
    warnings.push('⚠️ Sarvam API key not configured. Audio transcription will not work.');
  } else {
    console.log('✅ Sarvam API key configured');
  }
  
  return { errors, warnings };
};

/**
 * Check if backend is available
 */
export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (response.ok) {
      console.log('✅ Backend server connected');
      return true;
    } else {
      console.warn('⚠️ Backend server responded with error:', response.status);
      return false;
    }
  } catch (error) {
    console.warn('⚠️ Backend server not reachable. AI features will use fallback data.');
    return false;
  }
};

/**
 * Supported languages for translation
 */
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'हिंदी (Hindi)',
  kn: 'ಕನ್ನಡ (Kannada)',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;
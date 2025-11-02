import { API_CONFIG, API_ENDPOINTS, SupportedLanguage, SUPPORTED_LANGUAGES } from '../config/apiConfig';

/**
 * Translation Service
 * 
 * Uses Ollama (Local LLM) via backend endpoint for translation
 * to Kannada and Hindi
 * 
 * Architecture:
 * English Summary → Backend API → Ollama (or HF model) → Translated Text
 * 
 * Benefits:
 * - Offline translation
 * - No API costs
 * - Medical context preserved
 */

/**
 * Translate text to target language using Ollama backend
 * @param text - Text to translate
 * @param targetLanguage - Target language code ('en', 'hi', 'kn')
 * @param sourceLanguage - Source language code (default: 'en')
 * @returns Translated text
 */
export const translateText = async (
  text: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage: SupportedLanguage = 'en'
): Promise<string> => {
  // If target is same as source, return original
  if (targetLanguage === sourceLanguage) {
    return text;
  }

  // If source is not English, return original for now
  if (sourceLanguage !== 'en') {
    console.warn(`Translation from ${sourceLanguage} not yet supported. Returning original text.`);
    return text;
  }

  try {
    const response = await fetch(API_ENDPOINTS.BACKEND.TRANSLATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        lang: targetLanguage
      })
    });

    if (!response.ok) {
      // If backend not available, return original text
      if (response.status === 404 || response.status === 503) {
        console.warn(`Backend translation service not available. Showing original text.`);
        return text;
      }
      
      throw new Error('Translation failed');
    }

    const data = await response.json();
    return data.translatedText || data.translation || text;
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // Fallback to original text
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Backend server not reachable. Translation unavailable.');
    }
    
    return text;
  }
};

/**
 * Translate full document data to target language
 * @param simplified - Simplified text to translate
 * @param targetLanguage - Target language
 * @returns Translated text
 */
export const translateDocument = async (
  simplified: string,
  targetLanguage: SupportedLanguage
): Promise<string> => {
  if (targetLanguage === 'en') {
    return simplified;
  }

  return await translateText(simplified, targetLanguage);
};

/**
 * Batch translate multiple text segments
 * Useful for translating FAQ answers, care guidance, etc.
 */
export const batchTranslate = async (
  texts: string[],
  targetLanguage: SupportedLanguage
): Promise<string[]> => {
  if (targetLanguage === 'en') {
    return texts;
  }

  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/batch-translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        texts: texts,
        target_language: targetLanguage
      })
    });

    if (!response.ok) {
      // Fallback: translate one by one
      return await Promise.all(
        texts.map(text => translateText(text, targetLanguage))
      );
    }

    const data = await response.json();
    return data.translations || texts;
    
  } catch (error) {
    console.error('Batch translation error:', error);
    // Return original texts on error
    return texts;
  }
};

/**
 * Detect language of text
 * @param text - Text to detect language for
 * @returns Detected language code
 */
export const detectLanguage = async (text: string): Promise<SupportedLanguage> => {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/detect-language`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text.substring(0, 500) // Only send first 500 chars for detection
      })
    });

    if (!response.ok) {
      return 'en'; // Default to English
    }

    const data = await response.json();
    const detectedLang = data.language || 'en';
    
    // Ensure it's a supported language
    if (detectedLang in SUPPORTED_LANGUAGES) {
      return detectedLang as SupportedLanguage;
    }
    
    return 'en';
    
  } catch (error) {
    console.error('Language detection error:', error);
    return 'en'; // Default to English on error
  }
};

/**
 * Get language name for display
 */
export const getLanguageName = (code: SupportedLanguage): string => {
  return SUPPORTED_LANGUAGES[code] || 'Unknown';
};

/**
 * Check if translation is available for a language pair
 */
export const isTranslationAvailable = (
  source: SupportedLanguage,
  target: SupportedLanguage
): boolean => {
  // Currently only support English to Hindi/Kannada
  if (source === 'en' && (target === 'hi' || target === 'kn')) {
    return true;
  }
  
  // Same language = always available
  if (source === target) {
    return true;
  }
  
  return false;
};
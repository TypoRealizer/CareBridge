import { API_CONFIG, API_ENDPOINTS, SupportedLanguage, SUPPORTED_LANGUAGES } from '../config/apiConfig';

/**
 * Translation Service
 * 
 * Uses JigsawStack Translation API via backend endpoint for translation
 * from English to Hindi
 * 
 * Architecture:
 * English Summary → Backend API → JigsawStack API → Translated Text
 * 
 * Benefits:
 * - High-quality translation
 * - Medical terminology handling
 * - Cost-effective API
 * 
 * Note: The backend /api/translate endpoint handles the JigsawStack API call
 * and returns { translatedText: "...", lang: "hi" }
 */

/**
 * Translate text from English to Hindi using JigsawStack API via backend
 * @param text - Text to translate
 * @param targetLanguage - Target language code ('en' or 'hi')
 * @param sourceLanguage - Source language code (default: 'en')
 * @returns Object containing translated text and translation method used
 */
export const translateText = async (
  text: string,
  targetLanguage: SupportedLanguage,
  sourceLanguage: SupportedLanguage = 'en'
): Promise<{ translatedText: string; method?: string }> => {
  // If target is same as source, return original
  if (targetLanguage === sourceLanguage) {
    return { translatedText: text, method: 'passthrough' };
  }

  // Only support English to Hindi translation
  if (sourceLanguage !== 'en' || targetLanguage !== 'hi') {
    console.warn(`Translation only supports English to Hindi. Returning original text.`);
    return { translatedText: text, method: 'unsupported' };
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
        return { translatedText: text, method: 'unavailable' };
      }
      
      throw new Error('Translation failed — try again');
    }

    const data = await response.json();
    return {
      translatedText: data.translatedText || data.translation || text,
      method: data.method || 'unknown'
    };
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // Fallback to original text
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Backend server not reachable. Translation unavailable.');
    }
    
    throw error; // Throw error so UI can show toast
  }
};

/**
 * Translate full document data to target language
 * @param simplified - Simplified text to translate
 * @param targetLanguage - Target language
 * @returns Object containing translated text and method used
 */
export const translateDocument = async (
  simplified: string,
  targetLanguage: SupportedLanguage
): Promise<{ translatedText: string; method?: string }> => {
  if (targetLanguage === 'en') {
    return { translatedText: simplified, method: 'passthrough' };
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
  // Only support English to Hindi via JigsawStack
  if (source === 'en' && target === 'hi') {
    return true;
  }
  
  // Same language = always available
  if (source === target) {
    return true;
  }
  
  return false;
};
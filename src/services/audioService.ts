import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * Audio Processing Service - Updated for Sarvam API
 * 
 * Uses Sarvam API for Speech-to-Text transcription
 * Converts doctor/patient conversation audio to text for preprocessing
 * 
 * Architecture:
 * Audio File → Sarvam API → Transcribed Text → (then to Ollama for summarization)
 * 
 * Sarvam API Documentation:
 * - Endpoint: https://api.sarvam.ai/speech-to-text
 * - Method: POST with multipart/form-data
 * - Authentication: api-subscription-key header
 * - Models: saarika:flash (latest), saarika:v2.5, saarika:v2, saarika:v1
 * - Supported formats: MP3, WAV, FLAC, OGG
 * - Max file size: 25MB
 */

/**
 * Map language codes to Sarvam API format
 */
const mapToSarvamLanguage = (languageCode: string): string => {
  // Sarvam API accepts: en-IN, hi-IN, bn-IN, kn-IN, ml-IN, mr-IN, od-IN, pa-IN, ta-IN, te-IN, gu-IN
  const languageMap: { [key: string]: string } = {
    'en': 'en-IN',
    'en-IN': 'en-IN',
    'hi': 'hi-IN',
    'hi-IN': 'hi-IN',
    'kn': 'kn-IN',
    'kn-IN': 'kn-IN',
    'ta': 'ta-IN',
    'ta-IN': 'ta-IN',
    'te': 'te-IN',
    'te-IN': 'te-IN',
    'ml': 'ml-IN',
    'ml-IN': 'ml-IN',
    'mr': 'mr-IN',
    'mr-IN': 'mr-IN',
    'bn': 'bn-IN',
    'bn-IN': 'bn-IN',
    'gu': 'gu-IN',
    'gu-IN': 'gu-IN',
    'pa': 'pa-IN',
    'pa-IN': 'pa-IN',
    'od': 'od-IN',
    'od-IN': 'od-IN',
  };
  
  return languageMap[languageCode] || 'en-IN';
};

/**
 * Convert audio to text using Sarvam API
 * @param audioFile - Audio file (MP3, WAV, WebM, FLAC, OGG)
 * @param language - Language code (default: 'en-IN' for Indian English)
 * @returns Transcribed text
 */
export const transcribeAudio = async (
  audioFile: File,
  language: string = 'en-IN'
): Promise<string> => {
  // Check if API key is configured
  if (API_CONFIG.SARVAM_API_KEY === 'YOUR_SARVAM_API_KEY_HERE') {
    throw new Error(
      'Sarvam API key not configured. Please add your API key in /config/apiConfig.ts or .env file.\n\n' +
      'Get your API key at: https://www.sarvam.ai/'
    );
  }

  try {
    // Prepare FormData for Sarvam API (uses multipart/form-data, not JSON)
    const formData = new FormData();
    formData.append('file', audioFile);
    
    // Try newer models first (they support language_code), fallback to v1 without language
    // saarika:flash is the latest and fastest model
    formData.append('model', 'saarika:flash');
    
    // Map language to Sarvam format
    const sarvamLanguage = mapToSarvamLanguage(language);
    formData.append('language_code', sarvamLanguage);

    console.log(`🎤 Transcribing audio with Sarvam API (model: saarika:flash, language: ${sarvamLanguage})...`);

    const response = await fetch(API_ENDPOINTS.SARVAM_SPEECH_TO_TEXT, {
      method: 'POST',
      headers: {
        // DO NOT set Content-Type - browser will set it automatically with boundary for FormData
        'api-subscription-key': API_CONFIG.SARVAM_API_KEY,
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid Sarvam API key. Please check your configuration.');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a few moments.');
      }
      
      throw new Error(
        `Sarvam API Error: ${errorData.error?.message || errorData.message || response.statusText}`
      );
    }

    const data = await response.json();
    
    // Sarvam API response format: { transcript: "..." }
    const transcript = data.transcript;

    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No speech detected in audio file. Please ensure the audio is clear.');
    }

    console.log('✅ Audio transcribed successfully');
    return transcript.trim();
    
  } catch (error) {
    console.error('Audio transcription error:', error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to transcribe audio. Please try again.');
  }
};

/**
 * Transcribe audio with language detection
 * Useful when you don't know the language of the audio
 */
export const transcribeAudioWithDetection = async (
  audioFile: File
): Promise<{ text: string; language: string }> => {
  try {
    // Use English as default and let Sarvam handle detection
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'saarika:flash');
    // Don't specify language_code to enable auto-detection

    const response = await fetch(API_ENDPOINTS.SARVAM_SPEECH_TO_TEXT, {
      method: 'POST',
      headers: {
        'api-subscription-key': API_CONFIG.SARVAM_API_KEY,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe audio');
    }

    const data = await response.json();
    
    return {
      text: data.transcript || '',
      language: data.language_code || 'en-IN'
    };
    
  } catch (error) {
    console.error('Audio transcription with detection error:', error);
    throw error;
  }
};

/**
 * Detect language in audio file
 * @param audioFile - Audio file to analyze
 * @returns Detected language code
 */
export const detectAudioLanguage = async (audioFile: File): Promise<string> => {
  try {
    const result = await transcribeAudioWithDetection(audioFile);
    return result.language;
  } catch (error) {
    console.error('Audio language detection error:', error);
    return 'en-IN'; // Default to Indian English
  }
};

/**
 * Check if audio file is valid
 */
export const validateAudioFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size (max 25MB for Sarvam API)
  const maxSize = 25 * 1024 * 1024; // 25MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Audio file is too large. Maximum size is 25MB.'
    };
  }

  // Check file type
  const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac', 'audio/x-m4a'];
  const validExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.flac', '.m4a'];
  
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const hasValidType = validTypes.some(type => fileType.includes(type));
  const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidType && !hasValidExtension) {
    return {
      valid: false,
      error: 'Invalid audio format. Supported formats: MP3, WAV, WebM, OGG, FLAC, M4A'
    };
  }

  return { valid: true };
};

/**
 * Get supported audio languages for Sarvam API
 */
export const getSupportedLanguages = (): { code: string; name: string }[] => {
  return [
    { code: 'en-IN', name: 'English (India)' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'kn-IN', name: 'Kannada' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'te-IN', name: 'Telugu' },
    { code: 'ml-IN', name: 'Malayalam' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'bn-IN', name: 'Bengali' },
    { code: 'gu-IN', name: 'Gujarati' },
    { code: 'pa-IN', name: 'Punjabi' },
    { code: 'od-IN', name: 'Odia' },
  ];
};

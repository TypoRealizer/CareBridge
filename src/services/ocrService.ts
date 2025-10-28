import { OCRResponse } from '../types';
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * Google Gemini Vision API Service
 * Handles OCR text extraction from images and PDF documents
 * 
 * Updated to use Gemini 1.5 Flash model for:
 * - Better OCR accuracy on medical documents
 * - Support for both structured and unstructured documents
 * - Free tier with generous limits
 * - No credit card required
 */

/**
 * Converts a file to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data:image/png;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Gemini model candidates and helper to try multiple endpoints (v1 and v1beta) to avoid 404s.
 * This tries modern 2.5 and 2.0 experimental names first, then 1.5 stable aliases.
 */
const GEMINI_BASE = 'https://generativelanguage.googleapis.com';
const MODEL_CANDIDATES: Array<{ version: 'v1' | 'v1beta'; model: string }> = [
  // Newer models (availability varies by account/region)
  { version: 'v1beta', model: 'gemini-2.5-flash' },
  { version: 'v1beta', model: 'gemini-2.5-pro' },
  { version: 'v1beta', model: 'gemini-2.0-flash-exp' },
  { version: 'v1beta', model: 'gemini-2.0-flash-thinking-exp' },
  // Stable 1.5 models
  { version: 'v1', model: 'gemini-1.5-flash-latest' },
  { version: 'v1', model: 'gemini-1.5-pro-latest' },
  // Fallback to v1beta 1.5 names
  { version: 'v1beta', model: 'gemini-1.5-flash' },
  { version: 'v1beta', model: 'gemini-1.5-pro' },
];

const buildGeminiUrl = (version: 'v1' | 'v1beta', model: string, apiKey: string) =>
  `${GEMINI_BASE}/${version}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

const tryGeminiModels = async (requestBody: any): Promise<Response> => {
  const errors: string[] = [];
  for (const candidate of MODEL_CANDIDATES) {
    const url = buildGeminiUrl(candidate.version, candidate.model, API_CONFIG.GEMINI_API_KEY!);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      if (res.ok) return res;
      // Collect error message for this candidate and continue for 404/400 not supported
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || res.statusText;
      errors.push(`${candidate.version}/${candidate.model}: ${res.status} ${msg}`);
      if (res.status === 403) {
        // Invalid key or permission; no point in trying more models
        throw new Error(`Gemini API key/permission error: ${msg}`);
      }
      // For 404/400 continue to next model
      continue;
    } catch (e: any) {
      errors.push(`${candidate.version}/${candidate.model}: ${(e && e.message) || 'network error'}`);
      // try next
    }
  }
  throw new Error(`No Gemini model succeeded. Tried: ${errors.join(' | ')}`);
};

/**
 * Get MIME type for Gemini API
 */
const getMimeType = (file: File): string => {
  const fileType = file.type.toLowerCase();
  
  if (fileType === 'application/pdf') {
    return 'application/pdf';
  } else if (fileType.startsWith('image/')) {
    return fileType;
  }
  
  // Default to JPEG for images
  return 'image/jpeg';
};

/**
 * Performs OCR on an image or PDF using Google Gemini Vision API
 */
export const performOCR = async (file: File): Promise<OCRResponse> => {
  try {
    // Check if API key is configured
    if (API_CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error(
        'Gemini API key not configured. Please add your API key in /config/apiConfig.ts or .env file.\n\n' +
        'Get your free API key at: https://aistudio.google.com/app/apikey'
      );
    }

    // Convert file to base64
    const base64Content = await fileToBase64(file);
    const mimeType = getMimeType(file);

    // Prepare Gemini API request
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "Extract all text from this medical document. Preserve the structure, formatting, and organization. Return only the extracted text without any additional commentary."
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Content
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1, // Low temperature for accurate extraction
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      }
    };

    // Try multiple Gemini model endpoints until one succeeds
    const response = await tryGeminiModels(requestBody);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle specific errors
      if (response.status === 403) {
        throw new Error('Invalid Gemini API key or permissions. Please check your API key configuration.');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a few moments.');
      }
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Extract text from Gemini response
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text found in the document. Please ensure the image is clear and contains readable text.');
    }

    // Calculate confidence (Gemini doesn't provide this, so we estimate)
    // If we got text, assume high confidence
    const confidence = extractedText.length > 50 ? 0.95 : 0.85;

    return {
      text: extractedText.trim(),
      confidence: confidence,
      language: 'en' // Gemini auto-detects language, defaulting to English
    };
  } catch (error) {
    console.error('OCR Error:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error('Failed to process document. Please try again.');
  }
};

/**
 * Process PDF file for OCR
 * Gemini Vision can handle PDFs directly
 */
export const processPDF = async (file: File): Promise<OCRResponse> => {
  try {
    // Check if API key is configured
    if (API_CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error(
        'Gemini API key not configured. Please add your API key in /config/apiConfig.ts or .env file.\n\n' +
        'Get your free API key at: https://aistudio.google.com/app/apikey'
      );
    }

    const base64Pdf = await fileToBase64(file);

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "Extract all text from this PDF medical document. Preserve the structure and formatting. Include all pages. Return only the extracted text."
            },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: base64Pdf
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topK: 32,
        topP: 1,
        maxOutputTokens: 8192,
      }
    };

    const response = await tryGeminiModels(requestBody);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `PDF OCR Error: ${errorData.error?.message || response.statusText}`
      );
    }

  const data = await response.json();
  const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text found in the PDF. Please ensure the PDF contains readable text.');
    }

    return {
      text: extractedText.trim(),
      confidence: 0.9
    };
  } catch (error) {
    console.error('PDF OCR Error:', error);
    throw error;
  }
};

/**
 * Determine which OCR method to use based on file type
 */
export const processDocument = async (file: File): Promise<OCRResponse> => {
  const fileType = file.type.toLowerCase();

  if (fileType === 'application/pdf') {
    return processPDF(file);
  } else if (fileType.startsWith('image/')) {
    return performOCR(file);
  } else {
    throw new Error(
      `Unsupported file type: ${file.type}. Please upload a PDF or image file (JPG, PNG, etc.)`
    );
  }
};

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

// ⚡ UPDATED: Use ACTUAL models available in Google AI Studio (as of Jan 2026)
// Each model has its own daily limit
// WARNING: These models have LOWER limits (20 RPD) compared to older models (1,500 RPD)
const MODEL_CANDIDATES: Array<{ version: 'v1' | 'v1beta'; model: string }> = [
  // Lite version (separate quota)
  { version: 'v1beta', model: 'gemini-2.5-flash-lite' }, // Lite - 20 RPD limit
  { version: 'v1', model: 'gemini-2.5-flash-lite' }, // Try v1 API too

  // Try newest models first (separate quotas)
  { version: 'v1beta', model: 'gemini-3-flash' }, // Newest - 20 RPD limit
  { version: 'v1', model: 'gemini-3-flash' }, // Try v1 API too
  
  // Original model (likely exhausted, but try as last resort)
  { version: 'v1beta', model: 'gemini-2.0-flash-exp' },
  { version: 'v1beta', model: 'gemini-exp-1206' },
];

const buildGeminiUrl = (version: 'v1' | 'v1beta', model: string, apiKey: string) =>
  `${GEMINI_BASE}/${version}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

/**
 * Sleep helper for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Try Gemini models with exponential backoff for rate limits
 * ⚡ OPTIMIZED: maxRetries = 0 (fail fast instead of burning quota)
 */
const tryGeminiModels = async (requestBody: any, maxRetries = 0): Promise<Response> => {
  const errors: string[] = [];
  
  for (const candidate of MODEL_CANDIDATES) {
    const url = buildGeminiUrl(candidate.version, candidate.model, API_CONFIG.GEMINI_API_KEY!);
    
    // Try this model with retries for rate limits
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
        
        if (res.ok) {
          console.log(`✅ Gemini OCR succeeded with ${candidate.version}/${candidate.model}`);
          return res;
        }
        
        // Get error details
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson?.error?.message || res.statusText;
        
        // Handle 429 Rate Limit
        if (res.status === 429) {
          // Check if it's DAILY quota (not per-minute rate limit)
          const isDailyQuota = msg.includes('generate_content_free_tier_requests') && 
                              (msg.includes('limit: 0') || msg.includes('1500'));
          
          if (isDailyQuota) {
            // Don't throw immediately - this model is exhausted, try next model
            console.warn(`⚠️ Daily quota exhausted for ${candidate.model}, trying next model...`);
            errors.push(`${candidate.version}/${candidate.model}: Daily quota exhausted`);
            break; // Skip to next model
          }
          
          // It's a per-minute rate limit - can retry
          const retryMatch = msg.match(/retry in ([\d.]+)s/i);
          let retryDelay = retryMatch 
            ? Math.ceil(parseFloat(retryMatch[1]) * 1000) 
            : Math.min(2000 * Math.pow(2, attempt), 60000);
          
          // Fail fast on long waits (save user time)
          if (retryDelay > 50000 || attempt >= maxRetries) {
            console.warn(`⚠️ Rate limit on ${candidate.model}, trying next model...`);
            errors.push(`${candidate.version}/${candidate.model}: Rate limited`);
            break; // Skip to next model
          }
          
          if (attempt < maxRetries) {
            console.warn(`⏳ Rate limit. Waiting ${retryDelay}ms before retry ${attempt + 1}/${maxRetries}...`);
            await sleep(retryDelay);
            continue;
          } else {
            errors.push(`${candidate.version}/${candidate.model}: Rate limited (max retries)`);
            break;
          }
        }
        
        // Handle 403 (invalid API key)
        if (res.status === 403) {
          throw new Error(
            `❌ INVALID API KEY\n\n` +
            `Please check:\n` +
            `1. API key is correct in /config/apiConfig.ts\n` +
            `2. Gemini API is enabled: https://aistudio.google.com/\n` +
            `3. Account is verified (phone number)\n` +
            `4. API key has proper permissions\n\n` +
            `Get a new key: https://aistudio.google.com/app/apikey\n\n` +
            `Error: ${msg}`
          );
        }
        
        // Handle 404 (model not found) - try next model immediately
        if (res.status === 404) {
          console.warn(`⚠️ Model ${candidate.model} not available, trying next...`);
          errors.push(`${candidate.version}/${candidate.model}: Not available (404)`);
          break;
        }
        
        // Other errors
        errors.push(`${candidate.version}/${candidate.model}: ${res.status} ${msg}`);
        break;
        
      } catch (e: any) {
        // If it's our custom error (rate limit or quota), re-throw it
        if (e instanceof Error && (e.message.includes('RATE LIMIT') || e.message.includes('QUOTA'))) {
          throw e;
        }
        errors.push(`${candidate.version}/${candidate.model}: ${(e && e.message) || 'network error'}`);
        break;
      }
    }
  }
  
  throw new Error(
    `❌ OCR FAILED\n\n` +
    `Common issues:\n` +
    `1. ⏰ Rate limit: Wait 60 seconds (15 requests/minute)\n` +
    `2. 🚫 Daily quota: Wait until midnight PT (1,500 requests/day)\n` +
    `3. ✅ API key invalid: Check /config/apiConfig.ts\n` +
    `4. 🔑 Account not verified: Visit https://aistudio.google.com/\n\n` +
    `Check usage: https://aistudio.google.com/app/apikey\n\n` +
    `Technical details:\n${errors.join('\n')}`
  );
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
 * Validates if the extracted text appears to be meaningful medical content
 * Returns an object with validation result and reason
 */
const validateExtractedText = (text: string): { valid: boolean; reason?: string } => {
  // Remove extra whitespace for analysis
  const cleanText = text.trim().replace(/\s+/g, ' ');
  
  // ✅ CHECK 0: Completely empty or nearly empty
  if (cleanText.length === 0) {
    return {
      valid: false,
      reason: 'NO_CHARACTER_FOUND'
    };
  }
  
  // Check 1: Minimum length (medical documents should have substantive content)
  if (cleanText.length < 50) {
    return { 
      valid: false, 
      reason: 'NO_CHARACTER_FOUND'
    };
  }
  
  // Check 2: Check for actual words (not just random characters)
  const wordCount = cleanText.split(/\s+/).filter(word => word.length >= 3).length;
  if (wordCount < 10) {
    return { 
      valid: false, 
      reason: 'NO_CHARACTER_FOUND'
    };
  }
  
  // Check 3: Check for medical document indicators
  // Common keywords that should appear in discharge summaries
  const medicalKeywords = [
    'patient', 'diagnosis', 'treatment', 'medication', 'discharge', 
    'admitted', 'hospital', 'condition', 'doctor', 'medical', 
    'test', 'result', 'procedure', 'symptom', 'advice', 'follow',
    'name', 'age', 'date', 'history', 'examination'
  ];
  
  const lowerText = cleanText.toLowerCase();
  const foundKeywords = medicalKeywords.filter(keyword => lowerText.includes(keyword));
  
  // Should have at least 2 medical keywords for a valid medical document
  if (foundKeywords.length < 2) {
    return { 
      valid: false, 
      reason: 'NOT_MEDICAL_DOCUMENT' 
    };
  }
  
  // Check 4: Detect if it's just repetitive or gibberish text
  // Count unique words
  const words = cleanText.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const uniqueRatio = uniqueWords.size / words.length;
  
  // If less than 30% unique words, it's likely repetitive/gibberish
  if (uniqueRatio < 0.3 && words.length > 20) {
    return { 
      valid: false, 
      reason: 'CORRUPTED_TEXT'
    };
  }
  
  // All checks passed
  return { valid: true };
};

/**
 * Performs OCR on an image or PDF using Google Gemini Vision API
 */
export const performOCR = async (file: File): Promise<OCRResponse> => {
  try {
    // Check if API key is configured
    if (API_CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
      throw new Error(
        'Gemini API key not configured. Please add your API key in /config/apiConfig.ts or .env file.\\n\\n' +
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

    // ✅ CRITICAL: Validate the extracted text quality
    const validation = validateExtractedText(extractedText);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid or blank document detected.');
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
        'Gemini API key not configured. Please add your API key in /config/apiConfig.ts or .env file.\\n\\n' +
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

    // ✅ CRITICAL: Validate the extracted text quality for PDFs too
    const validation = validateExtractedText(extractedText);
    if (!validation.valid) {
      throw new Error(validation.reason || 'Invalid or blank PDF document detected.');
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
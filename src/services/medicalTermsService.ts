import { API_ENDPOINTS } from '../config/apiConfig';

/**
 * Medical Terms Service
 * 
 * Handles medical term lookups, explanations, and caching
 * Uses hardcoded glossary (300+ terms) with dynamic fallback via Mistral
 */

// In-memory cache for dynamically fetched terms
const termCache: { [key: string]: { simple: string; explanation: string } } = {};

// In-memory cache for the glossary
let glossaryCache: { [key: string]: { simple: string; explanation: string } } | null = null;

/**
 * Load medical terms glossary from backend
 * @returns Promise<object> - Glossary object
 */
export const loadMedicalTermsGlossary = async (): Promise<{
  [key: string]: { simple: string; explanation: string };
}> => {
  // Return cached glossary if available
  if (glossaryCache) {
    console.log('[MedicalTerms] Using cached glossary');
    return glossaryCache;
  }

  try {
    console.log('[MedicalTerms] Loading glossary from backend...');
    
    const response = await fetch(API_ENDPOINTS.BACKEND.MEDICAL_TERMS, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error('Failed to load medical terms glossary');
    }

    const data = await response.json();
    glossaryCache = data.terms || {};
    
    console.log(`[MedicalTerms] Loaded ${Object.keys(glossaryCache).length} terms from glossary`);
    
    return glossaryCache;
  } catch (error) {
    console.error('[MedicalTerms] Failed to load glossary:', error);
    
    // Return minimal fallback glossary
    glossaryCache = getFallbackGlossary();
    return glossaryCache;
  }
};

/**
 * Get explanation for a medical term
 * First checks hardcoded glossary, then cache, then queries Mistral dynamically
 * 
 * @param term - Medical term to explain
 * @returns Promise<object> - { simple, explanation }
 */
export const explainMedicalTerm = async (
  term: string
): Promise<{ simple: string; explanation: string }> => {
  const normalizedTerm = term.trim().toLowerCase();

  // 1. Check hardcoded glossary first
  if (!glossaryCache) {
    await loadMedicalTermsGlossary();
  }

  if (glossaryCache && glossaryCache[normalizedTerm]) {
    console.log(`[MedicalTerms] Found "${normalizedTerm}" in glossary`);
    return glossaryCache[normalizedTerm];
  }

  // 2. Check dynamic cache
  if (termCache[normalizedTerm]) {
    console.log(`[MedicalTerms] Found "${normalizedTerm}" in dynamic cache`);
    return termCache[normalizedTerm];
  }

  // 3. Query Mistral for dynamic explanation
  try {
    console.log(`[MedicalTerms] Fetching dynamic explanation for "${normalizedTerm}"`);
    
    const response = await fetch(API_ENDPOINTS.BACKEND.EXPLAIN_TERM, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ term: normalizedTerm }),
      signal: AbortSignal.timeout(15000) // 15s timeout
    });

    if (!response.ok) {
      throw new Error('Failed to get term explanation');
    }

    const data = await response.json();
    
    // Cache the result
    termCache[normalizedTerm] = {
      simple: data.simple,
      explanation: data.explanation
    };

    console.log(`[MedicalTerms] Cached explanation for "${normalizedTerm}"`);
    
    return termCache[normalizedTerm];
  } catch (error) {
    console.error(`[MedicalTerms] Failed to explain "${normalizedTerm}":`, error);
    
    // Return generic fallback
    return {
      simple: term,
      explanation: 'This is a medical term. Please consult your healthcare provider for more information.'
    };
  }
};

/**
 * Extract and highlight medical terms in text
 * Only highlights terms found in the glossary
 * 
 * @param text - Original medical text
 * @returns Array of found terms with positions
 */
export const extractMedicalTerms = async (
  text: string
): Promise<string[]> => {
  if (!glossaryCache) {
    await loadMedicalTermsGlossary();
  }

  if (!glossaryCache) {
    return [];
  }

  const foundTerms: Set<string> = new Set();
  const lowerText = text.toLowerCase();

  // Search for each glossary term in the text
  Object.keys(glossaryCache).forEach(term => {
    // Use word boundary regex to match whole words/phrases only
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    if (regex.test(lowerText)) {
      foundTerms.add(term);
    }
  });

  console.log(`[MedicalTerms] Found ${foundTerms.size} medical terms in text`);
  
  return Array.from(foundTerms);
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    glossarySize: glossaryCache ? Object.keys(glossaryCache).length : 0,
    dynamicCacheSize: Object.keys(termCache).length,
    glossaryLoaded: !!glossaryCache
  };
};

/**
 * Clear dynamic cache (useful for testing)
 */
export const clearDynamicCache = () => {
  Object.keys(termCache).forEach(key => delete termCache[key]);
  console.log('[MedicalTerms] Dynamic cache cleared');
};

/**
 * Minimal fallback glossary if backend is unavailable
 */
const getFallbackGlossary = (): { [key: string]: { simple: string; explanation: string } } => {
  return {
    'hypertension': {
      simple: 'High blood pressure',
      explanation: 'A condition where the force of blood against artery walls is too high.'
    },
    'diabetes': {
      simple: 'High blood sugar disease',
      explanation: 'A chronic condition affecting how the body processes blood sugar.'
    },
    'myocardial infarction': {
      simple: 'Heart attack',
      explanation: 'Occurs when blood flow to the heart is blocked, damaging heart muscle.'
    },
    'stroke': {
      simple: 'Brain attack',
      explanation: 'When blood supply to the brain is interrupted, causing brain damage.'
    },
    'pneumonia': {
      simple: 'Lung infection',
      explanation: 'An infection that inflames air sacs in the lungs, causing breathing difficulty.'
    },
    'asthma': {
      simple: 'Breathing disorder',
      explanation: 'A condition where airways narrow and swell, making breathing difficult.'
    },
    'arthritis': {
      simple: 'Joint inflammation',
      explanation: 'Inflammation of joints causing pain and stiffness.'
    },
    'anemia': {
      simple: 'Low red blood cells',
      explanation: 'A condition where blood lacks enough healthy red blood cells to carry oxygen.'
    },
    'fracture': {
      simple: 'Broken bone',
      explanation: 'A partial or complete break in a bone.'
    },
    'ecg': {
      simple: 'Heart electrical test',
      explanation: 'A test that records the heart\'s electrical activity.'
    },
    'mri': {
      simple: 'Magnetic body scan',
      explanation: 'An imaging technique using magnetic fields to create detailed body images.'
    },
    'ct scan': {
      simple: 'X-ray body scan',
      explanation: 'A computerized X-ray that produces cross-sectional body images.'
    },
    'biopsy': {
      simple: 'Tissue sample test',
      explanation: 'Removal of tissue for examination to diagnose disease.'
    },
    'antibiotic': {
      simple: 'Bacteria-killing medicine',
      explanation: 'Medication that kills bacteria or stops their growth.'
    },
    'aspirin': {
      simple: 'Pain reliever and blood thinner',
      explanation: 'A medication used to relieve pain and prevent blood clots.'
    }
  };
};

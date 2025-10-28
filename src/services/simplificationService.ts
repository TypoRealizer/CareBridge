import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * Medical Text Simplification Service
 * 
 * Uses Ollama (Local LLM - Mistral/Llama) via backend endpoint
 * for medical discharge summary interpretation and simplification
 * 
 * Architecture:
 * Frontend → Backend API → Ollama Local Model → Simplified Text
 * 
 * Benefits:
 * - No API costs
 * - Data stays offline (important for healthcare)
 * - Customizable with prompts
 * - No rate limits
 */

/**
 * Simplify medical text using Ollama backend
 * @param originalText - The original medical document text
 * @returns Simplified, patient-friendly text
 */
export const simplifyMedicalText = async (originalText: string): Promise<string> => {
  try {
    // Call backend endpoint
    const response = await fetch(API_ENDPOINTS.BACKEND.SUMMARIZE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: originalText,
        options: {
          tone: 'patient-friendly',
          format: 'structured',
          preserve_medical_accuracy: true
        }
      })
    });

    if (!response.ok) {
      // If backend is not available, fallback to original text
      if (response.status === 404 || response.status === 503) {
        console.warn('Backend not available. Using original text as fallback.');
        return originalText;
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to simplify text');
    }

    const data = await response.json();
    
    // Return simplified text from Ollama
    return data.simplified_text || data.summary || originalText;
    
  } catch (error) {
    console.error('Simplification error:', error);
    
    // If network error or backend down, fallback gracefully
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Backend server not reachable. Using original text.');
      return originalText;
    }
    
    // For other errors, still return original text as fallback
    return originalText;
  }
};

/**
 * Extract and simplify medical terms using Ollama
 * @param text - Medical document text
 * @returns Object mapping medical terms to simplified versions
 */
export const extractAndSimplifyTerms = async (
  text: string
): Promise<{ [key: string]: string }> => {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/extract-terms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text
      })
    });

    if (!response.ok) {
      throw new Error('Failed to extract medical terms');
    }

    const data = await response.json();
    return data.terms || getMockTerms();
    
  } catch (error) {
    console.error('Term extraction error:', error);
    // Fallback to mock terms
    return getMockTerms();
  }
};

/**
 * Mock medical terms for fallback
 */
const getMockTerms = (): { [key: string]: string } => {
  return {
    'acute myocardial infarction': 'heart attack - when blood flow to the heart is blocked',
    'hypertension': 'high blood pressure - when blood pushes too hard against artery walls',
    'type 2 diabetes mellitus': 'diabetes - high blood sugar disease affecting insulin use',
    'dyspnea': 'difficulty breathing or shortness of breath',
    'electrocardiogram': 'ECG/EKG - a test that measures heart electrical activity',
    'percutaneous coronary intervention': 'PCI - procedure to open blocked heart arteries using a catheter',
    'stent': 'small mesh tube placed in artery to keep it open',
    'antiplatelet therapy': 'medication to prevent blood clots',
    'beta-blocker': 'heart medication that slows heart rate and reduces blood pressure',
    'ace inhibitor': 'blood pressure medication that relaxes blood vessels',
  };
};

/**
 * Health check for backend
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
};

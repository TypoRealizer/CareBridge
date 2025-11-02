import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * Care Guidance Generation Service
 * 
 * Uses Ollama (Local LLM) via backend endpoint
 * to generate easy-to-understand care instructions and medication guidance
 * 
 * Architecture:
 * Medical Summary → Backend API → Ollama → Patient-friendly Care Guidance
 */

export interface CareGuidanceItem {
  id: number;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  category: 'Medication' | 'Appointment' | 'Monitoring' | 'Lifestyle' | 'Emergency';
}

export interface BackendCareItem {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  category: 'Medication' | 'Appointment' | 'Monitoring' | 'Lifestyle' | 'Emergency';
}

/**
 * Generate personalized care guidance from medical summary using Ollama backend
 * @param medicalText - The medical summary or discharge text
 * @returns Array of care guidance items or null to use defaults
 */
export const generateCareGuidance = async (
  medicalText: string
): Promise<BackendCareItem[] | null> => {
  try {
    const response = await fetch(API_ENDPOINTS.BACKEND.CARE_GUIDANCE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        summary: medicalText
      })
    });

    if (!response.ok) {
      // If backend not available, use default guidance
      if (response.status === 404 || response.status === 503) {
        console.warn('Backend not available for care guidance generation. Using defaults.');
        return null; // Will trigger default guidance in the UI
      }
      
      throw new Error('Failed to generate care guidance');
    }

    const data = await response.json();
    
    // Backend now returns array of care items directly
    if (Array.isArray(data)) {
      console.log(`✅ Generated ${data.length} care guidance items from Mistral via Ollama`);
      return data;
    }
    
    console.warn('Invalid care guidance format from backend');
    return null;
    
  } catch (error) {
    console.error('Care guidance generation error:', error);
    
    // Fallback to default guidance (return null to use UI defaults)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Backend server not reachable. Using default care guidance.');
    }
    
    return null;
  }
};

/**
 * Generate medication-specific guidance
 */
export const generateMedicationGuidance = async (
  medications: string[]
): Promise<CareGuidanceItem[] | null> => {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/medication-guidance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        medications: medications
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.guidance || null;
    
  } catch (error) {
    console.error('Medication guidance generation error:', error);
    return null;
  }
};

/**
 * Get default care guidance (fallback when backend is unavailable)
 * Note: This is now handled by the UI, but kept here for reference
 */
export const getDefaultCareGuidance = (): CareGuidanceItem[] => {
  return [
    {
      id: 1,
      title: 'Take Medications as Prescribed',
      description: 'Follow your medication schedule exactly. Take aspirin, clopidogrel, and atorvastatin daily. Set phone reminders if needed.',
      priority: 'High',
      category: 'Medication'
    },
    {
      id: 2,
      title: 'Schedule Follow-up Appointment',
      description: 'Book an appointment with your cardiologist within 2 weeks. Bring your medication list and symptom diary.',
      priority: 'High',
      category: 'Appointment'
    },
    {
      id: 3,
      title: 'Monitor Blood Pressure Daily',
      description: 'Check your blood pressure twice daily (morning and evening). Record the values and report any readings above 140/90.',
      priority: 'High',
      category: 'Monitoring'
    },
    {
      id: 4,
      title: 'Recognize Warning Signs',
      description: 'Call 911 immediately if you experience chest pain, severe shortness of breath, irregular heartbeat, or sudden weakness.',
      priority: 'High',
      category: 'Emergency'
    },
    {
      id: 5,
      title: 'Adopt Heart-Healthy Diet',
      description: 'Reduce salt intake, avoid saturated fats, eat more fruits and vegetables. Limit processed foods and added sugars.',
      priority: 'Medium',
      category: 'Lifestyle'
    },
    {
      id: 6,
      title: 'Start Light Physical Activity',
      description: 'Begin with short walks (10-15 minutes) after clearance from doctor. Gradually increase duration as tolerated.',
      priority: 'Medium',
      category: 'Lifestyle'
    },
    {
      id: 7,
      title: 'Track Your Weight',
      description: 'Weigh yourself daily at the same time. Report weight gain of more than 2-3 pounds in one day or 5 pounds in a week.',
      priority: 'Medium',
      category: 'Monitoring'
    }
  ];
};
import { API_CONFIG, API_ENDPOINTS } from '../config/apiConfig';

/**
 * FAQ Generation Service
 * 
 * Uses Ollama (Local LLM) via backend endpoint
 * to generate patient-oriented FAQs based on medical summary
 * 
 * Architecture:
 * Medical Summary → Backend API → Ollama → Patient FAQs
 */

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  additionalInfo?: string;
}

/**
 * Generate FAQs from medical summary using Ollama backend
 * @param medicalText - The medical summary or discharge text
 * @returns Array of FAQ items
 */
export const generateFAQs = async (medicalText: string): Promise<FAQ[] | null> => {
  try {
    const response = await fetch(API_ENDPOINTS.BACKEND.GENERATE_FAQ, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: medicalText  // ✅ FIXED: Changed from 'summary' to 'text' to match backend
      })
    });

    if (!response.ok) {
      // If backend not available, use mock data
      if (response.status === 404 || response.status === 503) {
        console.warn('Backend not available for FAQ generation. Using default FAQs.');
        return null; // Will trigger default FAQs in the UI
      }
      
      throw new Error('Failed to generate FAQs');
    }

    const data = await response.json();
    
    // Format response from backend (q/a format to question/answer format)
    const faqs = data.faqs || [];
    
    // Transform to expected format
    return faqs.map((item: any, index: number) => ({
      id: item.id || `faq-${index + 1}`,
      question: item.q || item.question,
      answer: item.a || item.answer,
      category: item.category || 'General',
      additionalInfo: item.additionalInfo || item.additional_info
    }));
    
  } catch (error) {
    console.error('FAQ generation error:', error);
    
    // Fallback to default FAQs (return null to use UI defaults)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.warn('Backend server not reachable. Using default FAQs.');
    }
    
    return null;
  }
};

/**
 * Generate contextual FAQ based on specific medical condition
 */
export const generateConditionFAQs = async (
  condition: string,
  medicalText: string
): Promise<FAQ[] | null> => {
  try {
    const response = await fetch(`${API_CONFIG.BACKEND_URL}/api/condition-faq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        condition: condition,
        context: medicalText
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.faqs || null;
    
  } catch (error) {
    console.error('Condition FAQ generation error:', error);
    return null;
  }
};

/**
 * Get default FAQs (fallback when backend is unavailable)
 * Note: This is now handled by the UI, but kept here for reference
 */
export const getDefaultFAQs = (): FAQ[] => {
  return [
    {
      id: 'faq-1',
      question: 'What medications should I take?',
      answer: 'Follow the medication schedule provided by your doctor. Take medications exactly as prescribed, even if you start feeling better.',
      category: 'Medication',
      additionalInfo: 'Set reminders to help you remember to take your medications on time.'
    },
    {
      id: 'faq-2',
      question: 'When should I schedule my follow-up appointment?',
      answer: 'Schedule a follow-up appointment within the timeframe recommended by your doctor, typically within 1-2 weeks after discharge.',
      category: 'Follow-up',
    },
    {
      id: 'faq-3',
      question: 'What activities should I avoid?',
      answer: 'Avoid strenuous activities, heavy lifting, and anything that causes discomfort. Gradually increase activity as recommended by your healthcare team.',
      category: 'Lifestyle',
    },
    {
      id: 'faq-4',
      question: 'What symptoms require immediate medical attention?',
      answer: 'Seek immediate help if you experience severe chest pain, difficulty breathing, sudden weakness, confusion, or any symptoms that concern you.',
      category: 'Emergency',
      additionalInfo: 'Call emergency services (911) immediately for life-threatening symptoms.'
    },
    {
      id: 'faq-5',
      question: 'How can I manage my diet?',
      answer: 'Follow a heart-healthy diet low in sodium, saturated fats, and cholesterol. Include plenty of fruits, vegetables, whole grains, and lean proteins.',
      category: 'Lifestyle',
    },
    {
      id: 'faq-6',
      question: 'What should I monitor at home?',
      answer: 'Monitor your blood pressure, heart rate, weight, and any symptoms. Keep a log and report any concerning changes to your doctor.',
      category: 'Monitoring',
    }
  ];
};
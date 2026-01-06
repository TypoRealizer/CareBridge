import { DocumentData, ProcessingStage, CareGuidanceItem } from '../types';
import { processDocument } from '../services/ocrService';
import { simplifyMedicalText, extractAndSimplifyTerms } from '../services/simplificationService';
import { transcribeAudio, validateAudioFile } from '../services/audioService';
import { generateFAQs } from '../services/faqService';
import { generateCareGuidance } from '../services/careGuidanceService';
import { Pill, Calendar, Activity, Utensils, Heart, AlertCircle, Stethoscope } from 'lucide-react';

/**
 * Utility functions for file processing and document handling
 */

/**
 * Validate file type and size
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const fileType = file.type.toLowerCase();
  
  // Audio files have their own validation logic
  if (fileType.startsWith('audio/')) {
    return validateAudioFile(file);
  }
  
  // For non-audio files
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'text/plain'
  ];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit'
    };
  }

  if (!allowedTypes.includes(fileType)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload PDF, image, audio, or text files.'
    };
  }

  return { valid: true };
};

/**
 * Extract text from uploaded file
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.type.toLowerCase();

  // Handle text files
  if (fileType === 'text/plain') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        resolve(text);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // Handle image and PDF files with OCR
  if (fileType.startsWith('image/') || fileType === 'application/pdf') {
    try {
      const ocrResult = await processDocument(file);
      return ocrResult.text;
    } catch (error: any) {
      // ✅ CRITICAL: Handle "NO_CHARACTER_FOUND" error with user-friendly message
      if (error.message === 'NO_CHARACTER_FOUND') {
        throw new Error('No text found in the document. The image appears to be blank or contains no readable text. Please upload a clear image of a medical document with visible text.');
      }
      if (error.message === 'NOT_MEDICAL_DOCUMENT') {
        throw new Error('This does not appear to be a medical document. Please upload a valid medical discharge summary, prescription, or health record.');
      }
      if (error.message === 'CORRUPTED_TEXT') {
        throw new Error('The extracted text appears to be corrupted or unreadable. Please upload a clearer image of the document.');
      }
      // Re-throw other errors as-is
      throw error;
    }
  }

  // Handle audio files with Sarvam API transcription
  if (fileType.startsWith('audio/')) {
    console.log('🎤 Processing audio file...');
    const transcript = await transcribeAudio(file, 'en-IN');
    return transcript;
  }

  throw new Error('Unsupported file type');
};

/**
 * Get processing stages based on input method
 */
export const getProcessingStages = (inputMethod: 'file' | 'text' | 'audio'): ProcessingStage[] => {
  const baseStages: ProcessingStage[] = [
    { message: 'Extracting medical terms...', duration: 1500 },
    { message: 'Generating simplified version...', duration: 2000 },
    { message: 'Creating care guidance...', duration: 1000 }
  ];

  if (inputMethod === 'file') {
    return [
      { message: 'Analyzing document...', duration: 1000 },
      { message: 'Extracting text with OCR...', duration: 1500 },
      ...baseStages
    ];
  }

  if (inputMethod === 'audio') {
    return [
      { message: 'Processing audio...', duration: 1200 },
      { message: 'Converting speech to text...', duration: 1500 },
      ...baseStages
    ];
  }

  // Text input
  return [
    { message: 'Processing text...', duration: 800 },
    ...baseStages
  ];
};

/**
 * Simplify medical text using AI service
 */
export const simplifyText = async (originalText: string): Promise<string> => {
  const result = await simplifyMedicalText(originalText);
  // Handle new response format from backend
  if (typeof result === 'object' && result.summary) {
    return result.summary;
  }
  return typeof result === 'string' ? result : originalText;
};

/**
 * Extract medical terms from text using AI service
 */
export const extractMedicalTerms = async (text: string): Promise<{ [key: string]: string }> => {
  return await extractAndSimplifyTerms(text);
};

/**
 * Transform backend care guidance response to UI format
 */
const transformCareGuidanceToUI = (backendData: any[]): CareGuidanceItem[] => {
  const iconMap: { [key: string]: any } = {
    'Medication': Pill,
    'Appointment': Calendar,
    'Monitoring': Activity,
    'Lifestyle': Utensils,
    'Emergency': AlertCircle
  };

  const colorMap: { [key: string]: string } = {
    'High': 'red',
    'Medium': 'orange',
    'Low': 'blue'
  };

  return backendData.map((item: any, index: number) => ({
    id: index + 1,
    title: item.title || 'Care Item',
    description: item.description || '',
    icon: iconMap[item.category] || Stethoscope,
    priority: item.priority || 'Medium',
    color: colorMap[item.priority] || 'blue'
  }));
};

/**
 * Get default care guidance items with icons
 */
const getDefaultCareGuidance = () => {
  return [
    {
      id: 1,
      title: 'Take Your Medications',
      description: 'Take all prescribed medications exactly as directed. Set reminders if needed and never skip doses.',
      icon: Pill,
      priority: 'High' as const,
      color: 'red'
    },
    {
      id: 2,
      title: 'Schedule Follow-up Appointments',
      description: 'Book all recommended follow-up appointments with your doctors as soon as possible.',
      icon: Calendar,
      priority: 'High' as const,
      color: 'blue'
    },
    {
      id: 3,
      title: 'Monitor Your Symptoms',
      description: 'Keep track of how you feel and watch for any warning signs mentioned in your discharge instructions.',
      icon: Activity,
      priority: 'Medium' as const,
      color: 'orange'
    },
    {
      id: 4,
      title: 'Follow Dietary Guidelines',
      description: 'Stick to the recommended diet plan to help manage your condition and support recovery.',
      icon: Utensils,
      priority: 'Medium' as const,
      color: 'yellow'
    },
    {
      id: 5,
      title: 'Know When to Seek Help',
      description: 'Contact your doctor or emergency services if you experience severe symptoms or feel worse.',
      icon: Heart,
      priority: 'High' as const,
      color: 'red'
    }
  ];
};

/**
 * Get default FAQs
 */
const getDefaultFAQs = () => {
  return [
    {
      id: 'item-1',
      question: 'How often should I take my blood pressure medication?',
      category: 'Medication',
      answer: 'Take your blood pressure medication exactly as prescribed, typically once daily at the same time each day. Never skip doses or stop taking it without consulting your doctor.',
      additionalInfo: 'If you miss a dose, take it as soon as you remember, but don\'t double up on doses.'
    },
    {
      id: 'item-2',
      question: 'What should I do if my blood sugar levels are too high or too low?',
      category: 'Blood Sugar',
      answer: 'If your blood sugar is above 180 mg/dL consistently, contact your doctor. For levels below 70 mg/dL, eat or drink 15 grams of fast-acting carbohydrates (like juice or glucose tablets) and recheck in 15 minutes.',
      additionalInfo: 'Keep a log of your blood sugar readings to share with your healthcare provider.'
    },
    {
      id: 'item-3',
      question: 'When should I call my doctor or go to the emergency room?',
      category: 'Emergency',
      answer: 'Call 911 immediately if you experience chest pain, severe shortness of breath, sudden weakness on one side of your body, severe headache, or loss of consciousness.',
      additionalInfo: 'For non-emergency concerns, contact your doctor during office hours or use the after-hours emergency line.'
    },
    {
      id: 'item-4',
      question: 'Can I exercise with my current medical conditions?',
      category: 'Lifestyle',
      answer: 'Light walking is generally safe and encouraged. However, avoid strenuous activity for 2 weeks as recommended. Always consult your doctor before starting any new exercise program.',
      additionalInfo: 'Cardiac rehabilitation programs can provide safe, supervised exercise tailored to your condition.'
    },
    {
      id: 'item-5',
      question: 'What foods should I avoid with diabetes and high blood pressure?',
      category: 'Diet',
      answer: 'Limit foods high in sodium (salt), saturated fats, and added sugars. Avoid processed foods, sugary drinks, and excessive red meat. Focus on fruits, vegetables, whole grains, and lean proteins.',
      additionalInfo: 'Consider meeting with a registered dietitian for a personalized meal plan.'
    },
    {
      id: 'item-6',
      question: 'How do I monitor my blood pressure at home?',
      category: 'Monitoring',
      answer: 'Use a validated home blood pressure monitor. Take readings at the same time each day, while seated and relaxed. Record your readings and bring them to your doctor appointments.',
      additionalInfo: 'Your doctor can recommend specific blood pressure monitors and target ranges for you.'
    },
    {
      id: 'item-7',
      question: 'What are the side effects of my medications?',
      category: 'Medication',
      answer: 'Common side effects may include dizziness, fatigue, or upset stomach. These often improve over time. Contact your doctor if you experience severe side effects like difficulty breathing, severe rash, or persistent symptoms.',
      additionalInfo: 'Never stop taking your medications without consulting your healthcare provider first.'
    }
  ];
};

/**
 * Process uploaded file and generate document data
 */
export const processUploadedFile = async (
  file: File,
  onProgress?: (stage: string, progress: number) => void
): Promise<DocumentData> => {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const stages = getProcessingStages('file');
  let currentProgress = 0;
  const progressIncrement = 100 / stages.length;

  // Stage 1: Extract text
  if (onProgress) onProgress(stages[0].message, currentProgress);
  const extractedText = await extractTextFromFile(file);
  currentProgress += progressIncrement;

  // Stage 2: Extract medical terms
  if (onProgress) onProgress(stages[1].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[1].duration));
  const terms = await extractMedicalTerms(extractedText);
  currentProgress += progressIncrement;

  // Stage 3: Simplify text
  if (onProgress) onProgress(stages[2].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[2].duration));
  const simplifiedText = await simplifyText(extractedText);
  currentProgress += progressIncrement;

  // Stage 4: Generate care guidance and FAQs
  if (onProgress) onProgress(stages[3].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[3].duration));
  
  // Try to generate dynamic care guidance and FAQs, fallback to defaults
  const careGuidanceData = await generateCareGuidance(extractedText);
  const faqData = await generateFAQs(extractedText);
  
  // Transform care guidance from backend format to UI format
  let careGuidance = getDefaultCareGuidance();
  if (careGuidanceData && Array.isArray(careGuidanceData)) {
    careGuidance = transformCareGuidanceToUI(careGuidanceData);
  }
  
  currentProgress = 100;

  return {
    original: extractedText,
    simplified: simplifiedText,
    terms: terms,
    extractedText: extractedText,
    inputMethod: 'file',
    fileName: file.name,
    fileType: file.type,
    careGuidance: careGuidance,
    faqs: faqData || getDefaultFAQs()
  };
};

/**
 * Process pasted text and generate document data
 */
export const processPastedText = async (
  text: string,
  onProgress?: (stage: string, progress: number) => void
): Promise<DocumentData> => {
  const stages = getProcessingStages('text');
  let currentProgress = 0;
  const progressIncrement = 100 / stages.length;

  // Stage 1: Process text
  if (onProgress) onProgress(stages[0].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[0].duration));
  currentProgress += progressIncrement;

  // Stage 2: Extract medical terms
  if (onProgress) onProgress(stages[1].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[1].duration));
  const terms = await extractMedicalTerms(text);
  currentProgress += progressIncrement;

  // Stage 3: Simplify text
  if (onProgress) onProgress(stages[2].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[2].duration));
  const simplifiedText = await simplifyText(text);
  currentProgress += progressIncrement;

  // Stage 4: Generate care guidance and FAQs
  if (onProgress) onProgress(stages[3].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[3].duration));
  
  // Try to generate dynamic care guidance and FAQs, fallback to defaults
  const careGuidanceData = await generateCareGuidance(text);
  const faqData = await generateFAQs(text);
  
  // Transform care guidance from backend format to UI format
  let careGuidance = getDefaultCareGuidance();
  if (careGuidanceData && Array.isArray(careGuidanceData)) {
    careGuidance = transformCareGuidanceToUI(careGuidanceData);
  }
  
  currentProgress = 100;

  return {
    original: text,
    simplified: simplifiedText,
    terms: terms,
    extractedText: text,
    inputMethod: 'text',
    careGuidance: careGuidance,
    faqs: faqData || getDefaultFAQs()
  };
};
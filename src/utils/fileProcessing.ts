import { DocumentData, ProcessingStage } from '../types';
import { processDocument } from '../services/ocrService';
import { simplifyMedicalText, extractAndSimplifyTerms } from '../services/simplificationService';
import { transcribeAudio, validateAudioFile } from '../services/audioService';

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
    const ocrResult = await processDocument(file);
    return ocrResult.text;
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
  return await simplifyMedicalText(originalText);
};

/**
 * Extract medical terms from text using AI service
 */
export const extractMedicalTerms = async (text: string): Promise<{ [key: string]: string }> => {
  return await extractAndSimplifyTerms(text);
};

/**
 * Generate care guidance from text
 * This will be replaced with actual API call
 */
export const generateCareGuidance = async (text: string): Promise<any> => {
  // TODO: Implement actual API call for care guidance generation
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return null; // Will use default care guidance for now
};

/**
 * Generate FAQ from text
 * This will be replaced with actual API call
 */
export const generateFAQ = async (text: string): Promise<any> => {
  // TODO: Implement actual API call for FAQ generation
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return null; // Will use default FAQs for now
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

  // Stage 4: Generate care guidance
  if (onProgress) onProgress(stages[3].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[3].duration));
  await generateCareGuidance(extractedText);
  currentProgress = 100;

  return {
    original: extractedText,
    simplified: simplifiedText,
    terms: terms,
    extractedText: extractedText,
    inputMethod: 'file',
    fileName: file.name,
    fileType: file.type
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

  // Stage 4: Generate care guidance
  if (onProgress) onProgress(stages[3].message, currentProgress);
  await new Promise(resolve => setTimeout(resolve, stages[3].duration));
  await generateCareGuidance(text);
  currentProgress = 100;

  return {
    original: text,
    simplified: simplifiedText,
    terms: terms,
    extractedText: text,
    inputMethod: 'text'
  };
};

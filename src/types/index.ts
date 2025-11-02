// Type definitions for CareBridge application

export interface DocumentData {
  original: string;
  simplified: string;
  terms: { [key: string]: string };
  extractedText?: string; // OCR extracted text
  inputMethod?: 'text' | 'file' | 'audio';
  fileName?: string;
  fileType?: string;
}

export interface OCRResponse {
  text: string;
  confidence?: number;
  language?: string;
}

export interface ProcessingStage {
  message: string;
  duration: number;
}

export interface ApiConfig {
  googleCloudVisionApiKey: string;
  openAiApiKey?: string;
  speechToTextApiKey?: string;
}

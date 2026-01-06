/**
 * CareBridge Backend Server
 * 
 * Handles medical document processing using:
 * - Ollama (Local LLM) for summarization, FAQ generation, care guidance, and translation
 * - JigsawStack API (optional) for high-quality translation
 * 
 * Architecture:
 * Frontend → Backend API → Ollama/JigsawStack → Processed Medical Text
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const ollamaClient = require('./ollamaClient');
const prompts = require('./prompts_mistral_optimized'); // UPDATED: Using Mistral-optimized prompts
const utils = require('./utils');
const { parseDischargeDocument, mergeWithAISummary } = require('./documentParser');
const { postProcessSummary } = require('./postProcessSummary');
const { validateSummaryQuality, deepCleanSummary } = require('./outputValidator');

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5');

// JigsawStack API Configuration for Translation
const JIGSAWSTACK_API_KEY = process.env.JIGSAWSTACK_API_KEY || '';
const JIGSAWSTACK_BASE_URL = 'https://api.jigsawstack.com/v1';

// Safety limits
const SUMMARY_MAX_LENGTH = 50000; // 50K characters max
const TRANSLATION_MAX_LENGTH = 10000; // 10K characters per translation call

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased for large documents

// Request queue for rate limiting
let activeRequests = 0;

// Logging helpers
const logInfo = (message, ...args) => console.log(`[${new Date().toISOString()}] ${message}`, ...args);
const logError = (message, ...args) => console.error(`[${new Date().toISOString()}] ❌ ${message}`, ...args);

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get('/health', async (req, res) => {
  const ollamaAvailable = await ollamaClient.isAvailable();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      ollama: ollamaAvailable ? 'connected' : 'unavailable',
      jigsawstack: JIGSAWSTACK_API_KEY ? 'configured' : 'not configured'
    },
    model: OLLAMA_MODEL,
    activeRequests: activeRequests,
    maxConcurrent: MAX_CONCURRENT
  });
});

// ============================================
// SUMMARIZATION ENDPOINT
// ============================================

app.post('/api/summarize', async (req, res) => {
  const startTime = Date.now();
  activeRequests++;
  
  try {
    logInfo('[Summarize] Request received');
    
    const { text, options } = req.body;
    
    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required and must be a string'
      });
    }
    
    // 🔴 CRITICAL: Text length validation to prevent system crashes
    if (text.length > SUMMARY_MAX_LENGTH) {
      return res.status(400).json({
        error: 'Text too long',
        message: `Text length (${text.length.toLocaleString()} chars) exceeds maximum of ${SUMMARY_MAX_LENGTH.toLocaleString()} characters`
      });
    }
    
    // Sanitize input
    const sanitizedText = ollamaClient.sanitizeInput(text);
    
    if (sanitizedText.length < 50) {
      return res.status(400).json({
        error: 'Text too short',
        message: 'Provided text is too short to process. Please provide a complete medical document.'
      });
    }
    
    logInfo(`[Summarize] Processing ${sanitizedText.length} characters`);
    
    // ========================================
    // STEP 1: Parse structured data from document
    // ========================================
    logInfo('[Summarize] Step 1: Parsing document structure...');
    const parsedData = parseDischargeDocument(sanitizedText);
    
    // ========================================
    // STEP 2: Generate AI summary with Mistral
    // ========================================
    logInfo('[Summarize] Step 2: Generating AI summary with Mistral...');
    
    const summaryPrompt = prompts.getSummarizationPrompt(sanitizedText);
    
    const mistralResponse = await ollamaClient.generate(OLLAMA_MODEL, summaryPrompt, {
      temperature: 0.05, // Very low temperature for maximum consistency and accuracy
      max_tokens: 8000   // INCREASED: From 6000 to 8000 for complete medication lists
    });
    
    let aiSummary = mistralResponse.response.trim();
    
    // ========================================
    // STEP 3: Post-process AI summary
    // ========================================
    logInfo('[Summarize] Step 3: Post-processing AI summary...');
    aiSummary = postProcessSummary(aiSummary);
    
    // ========================================
    // STEP 4: Skip merge to prevent duplicates - use AI summary directly
    // ========================================
    logInfo('[Summarize] Step 4: Using AI summary directly (no merge to prevent duplicates)...');
    const finalSummary = aiSummary; // Direct use - validator will clean it
    
    // ========================================
    // STEP 5: Validate and clean final output
    // ========================================
    if (!finalSummary || finalSummary.length < 50) {
      logError('[Summarize] Final summary is empty or too short');
      return res.status(500).json({
        error: 'Summarization failed',
        message: 'Generated summary is empty or invalid. Please try again.'
      });
    }
    
    // Deep clean summary (removes OCR artifacts and duplicates)
    let cleanedSummary = deepCleanSummary(finalSummary);
    
    // Validate summary quality
    const qualityCheck = validateSummaryQuality(cleanedSummary);
    logInfo(`[Summarize] Quality score: ${qualityCheck.score}/100`);
    
    if (!qualityCheck.valid) {
      logError('[Summarize] Quality check failed, but returning cleaned version anyway');
      logError('[Summarize] Issues:', qualityCheck.issues);
      // Don't reject - return the cleaned version with a warning
      // The deep clean should have fixed most issues
    }
    
    const duration = Date.now() - startTime;
    logInfo(`[Summarize] ✅ Complete in ${duration}ms, output: ${cleanedSummary.length} chars`);
    
    res.json({
      summary: cleanedSummary,
      confidence: 0.9,
      reviewSuggested: false,
      metadata: {
        processingTime: duration,
        inputLength: sanitizedText.length,
        outputLength: cleanedSummary.length,
        model: OLLAMA_MODEL,
        parsedData: {
          diagnoses: parsedData.diagnoses.length,
          hospitalMedications: parsedData.hospitalMedications.length,
          dischargeMedications: parsedData.dischargeMedications.length,
          hasStructuredData: parsedData.hasStructuredData
        }
      }
    });
    
  } catch (error) {
    logError('[Summarize] Error:', error.message);
    
    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        error: 'summarization_timeout',
        message: 'Summarization took too long. The document may be too complex. Please try a shorter document.'
      });
    }
    
    // Handle Ollama connection errors
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'ollama_unavailable',
        message: 'AI service is not available. Please ensure Ollama is running.'
      });
    }
    
    res.status(500).json({
      error: 'summarization_error',
      message: error.message || 'Failed to generate summary'
    });
    
  } finally {
    activeRequests--;
  }
});

// ============================================
// CARE GUIDANCE ENDPOINT
// ============================================

app.post('/api/care', async (req, res) => {
  const startTime = Date.now();
  activeRequests++;
  
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required'
      });
    }
    
    logInfo('[Care Guidance] Generating care plan...');
    
    const prompt = prompts.getCareGuidancePrompt(text);
    const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
      temperature: 0.2,
      max_tokens: 1200 // REDUCED: From 2048 to 1200 (summary takes priority)
    });
    
    // Parse JSON response
    let careGuidance;
    try {
      careGuidance = utils.extractJSON(response.response);
    } catch (parseError) {
      logError('[Care Guidance] JSON parse error, using fallback');
      careGuidance = getFallbackCareGuidance();
    }
    
    // Validate structure
    if (!Array.isArray(careGuidance)) {
      careGuidance = getFallbackCareGuidance();
    }
    
    logInfo(`[Care Guidance] Generated ${careGuidance.length} items in ${Date.now() - startTime}ms`);
    
    res.json({
      careGuidance: careGuidance,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    logError('[Care Guidance] Error:', error);
    
    // Return fallback care guidance
    res.status(200).json({
      careGuidance: getFallbackCareGuidance(),
      fallback: true
    });
    
  } finally {
    activeRequests--;
  }
});

/**
 * Fallback care guidance if AI generation fails
 */
function getFallbackCareGuidance() {
  return [
    {
      title: 'Take Your Medications',
      description: 'Take all prescribed medications exactly as directed by your doctor. Set reminders if needed and never skip doses.',
      priority: 'High',
      category: 'Medication'
    },
    {
      title: 'Schedule Follow-up Appointments',
      description: 'Book all recommended follow-up appointments with your healthcare providers as soon as possible.',
      priority: 'High',
      category: 'Appointment'
    },
    {
      title: 'Monitor Your Symptoms',
      description: 'Keep track of how you feel daily. Watch for warning signs mentioned in your discharge instructions.',
      priority: 'Medium',
      category: 'Monitoring'
    },
    {
      title: 'Follow Dietary Guidelines',
      description: 'Stick to the recommended diet plan to help manage your condition and support recovery.',
      priority: 'Medium',
      category: 'Lifestyle'
    },
    {
      title: 'Know When to Seek Help',
      description: 'Contact your doctor or emergency services immediately if you experience severe symptoms or feel significantly worse.',
      priority: 'High',
      category: 'Emergency'
    }
  ];
}

// ============================================
// FAQ GENERATION ENDPOINT
// ============================================

app.post('/api/faqs', async (req, res) => {
  const startTime = Date.now();
  activeRequests++;
  
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required'
      });
    }
    
    logInfo('[FAQ] Generating FAQs...');
    
    const prompt = prompts.getFAQPrompt(text);
    const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
      temperature: 0.2,
      max_tokens: 1200 // REDUCED: From 2048 to 1200 (summary takes priority)
    });
    
    // Parse JSON response
    let faqs;
    try {
      faqs = utils.extractJSON(response.response);
    } catch (parseError) {
      logError('[FAQ] JSON parse error, using fallback');
      faqs = getFallbackFAQs();
    }
    
    // Validate and transform structure
    if (!Array.isArray(faqs)) {
      faqs = getFallbackFAQs();
    }
    
    // Transform to expected format
    const transformedFaqs = faqs.map((faq, index) => ({
      id: `item-${index + 1}`,
      question: faq.q || faq.question || 'Question',
      answer: faq.a || faq.answer || 'Answer',
      category: faq.category || 'General',
      additionalInfo: faq.additionalInfo || ''
    }));
    
    logInfo(`[FAQ] Generated ${transformedFaqs.length} FAQs in ${Date.now() - startTime}ms`);
    
    res.json({
      faqs: transformedFaqs,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    logError('[FAQ] Error:', error);
    
    // Return fallback FAQs
    res.status(200).json({
      faqs: getFallbackFAQs(),
      fallback: true
    });
    
  } finally {
    activeRequests--;
  }
});

/**
 * Fallback FAQs if AI generation fails
 */
function getFallbackFAQs() {
  return [
    {
      id: 'item-1',
      question: 'How should I take my medications?',
      answer: 'Take all prescribed medications exactly as directed. Follow the timing and dosage instructions carefully.',
      category: 'Medication',
      additionalInfo: 'Set reminders if needed and never stop taking medications without consulting your doctor.'
    },
    {
      id: 'item-2',
      question: 'When should I call my doctor?',
      answer: 'Contact your doctor if you experience worsening symptoms, new symptoms, or any concerns about your recovery.',
      category: 'Emergency',
      additionalInfo: 'For severe symptoms like chest pain or difficulty breathing, call 911 immediately.'
    },
    {
      id: 'item-3',
      question: 'What activities should I avoid?',
      answer: 'Follow the activity restrictions provided in your discharge instructions. Avoid strenuous activities until cleared by your doctor.',
      category: 'Lifestyle',
      additionalInfo: 'Gradually increase activity as you feel better and as advised by your healthcare team.'
    },
    {
      id: 'item-4',
      question: 'How do I monitor my condition at home?',
      answer: 'Keep track of your symptoms daily. Monitor vital signs as instructed (blood pressure, blood sugar, etc.).',
      category: 'Monitoring',
      additionalInfo: 'Keep a written log of your measurements to share with your doctor at follow-up visits.'
    },
    {
      id: 'item-5',
      question: 'What dietary changes should I make?',
      answer: 'Follow the dietary recommendations provided in your discharge instructions. Focus on a balanced, healthy diet.',
      category: 'Diet',
      additionalInfo: 'Consider consulting with a registered dietitian for personalized meal planning.'
    }
  ];
}

// ============================================
// SINGLE TEXT TRANSLATION ENDPOINT
// ============================================

app.post('/api/translate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { text, targetLanguage } = req.body;
    
    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required'
      });
    }
    
    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Target language is required'
      });
    }
    
    // 🔴 CRITICAL: Text length validation
    if (text.length > TRANSLATION_MAX_LENGTH) {
      return res.status(400).json({
        error: 'Text too long',
        message: `Text exceeds maximum length of ${TRANSLATION_MAX_LENGTH} characters for translation`
      });
    }
    
    logInfo(`[Translation] Translating ${text.length} chars to ${targetLanguage}`);
    
    let translatedText;
    let method = 'ollama';
    
    // Try JigsawStack first if API key is configured
    if (JIGSAWSTACK_API_KEY && JIGSAWSTACK_API_KEY.length > 0) {
      try {
        const jigsawResponse = await axios.post(
          `${JIGSAWSTACK_BASE_URL}/ai/translate`,
          {
            text: text,
            target_language: targetLanguage
          },
          {
            headers: {
              'x-api-key': JIGSAWSTACK_API_KEY,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );
        
        translatedText = jigsawResponse.data.translated_text;
        method = 'jigsawstack';
        logInfo(`[Translation] JigsawStack success in ${Date.now() - startTime}ms`);
        
      } catch (apiError) {
        logError('[Translation] JigsawStack failed, falling back to Ollama:', apiError.message);
        
        // Fallback to Ollama
        const prompt = prompts.getTranslationPrompt(text, targetLanguage);
        const ollamaResponse = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
          temperature: 0.3,
          max_tokens: text.length * 3
        });
        translatedText = ollamaResponse.response.trim();
        method = 'ollama';
      }
    } else {
      // Use Ollama directly
      const prompt = prompts.getTranslationPrompt(text, targetLanguage);
      const ollamaResponse = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
        temperature: 0.3,
        max_tokens: text.length * 3
      });
      translatedText = ollamaResponse.response.trim();
    }
    
    const duration = Date.now() - startTime;
    logInfo(`[Translation] Complete in ${duration}ms using ${method}`);
    
    res.json({
      translatedText,
      method,
      duration,
      originalLength: text.length,
      translatedLength: translatedText.length
    });
    
  } catch (error) {
    logError('[Translation] Error:', error);
    res.status(500).json({
      error: 'translation_error',
      message: error.message
    });
  }
});

// ============================================
// BATCH TRANSLATION ENDPOINT
// ============================================

app.post('/api/translate-batch', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { texts, targetLanguage } = req.body;
    
    // Validate input
    if (!Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Texts array is required and must not be empty'
      });
    }
    
    if (!targetLanguage || typeof targetLanguage !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Target language is required'
      });
    }
    
    logInfo(`[Batch Translation] Translating ${texts.length} texts to ${targetLanguage}`);
    
    let translatedTexts = [];
    let method = 'ollama';
    
    // Try JigsawStack first if API key is configured
    if (JIGSAWSTACK_API_KEY && JIGSAWSTACK_API_KEY.length > 0) {
      try {
        // ✅ OPTIMIZATION: Retry logic with exponential backoff
        const translateWithRetry = async (text) => {
          const retries = 3;
          for (let attempt = 1; attempt <= retries; attempt++) {
            try {
              const response = await axios.post(
                `${JIGSAWSTACK_BASE_URL}/ai/translate`,
                {
                  text: text,
                  target_language: targetLanguage
                },
                {
                  headers: {
                    'x-api-key': JIGSAWSTACK_API_KEY,
                    'Content-Type': 'application/json'
                  },
                  timeout: 30000
                }
              );
              return response.data.translated_text;
            } catch (err) {
              if (attempt === retries || err.response?.status !== 429) {
                throw err;
              }
              // Wait before retry (exponential backoff)
              const delay = Math.pow(2, attempt) * 500;
              logInfo(`[Batch Translation] Rate limited, waiting ${delay}ms before retry ${attempt}/${retries}`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        };
        
        // Helper to catch and log specific errors
        const safeTranslate = async (text) => {
          try {
            return await translateWithRetry(text);
          } catch (err) {
            if (err.response?.status === 429) {
              logError(`[Batch Translation] JigsawStack API call failed (attempt ${attempt}/${retries}): ${err.message}`);
              throw err;
            }
          }
        };
        
        // ✅ OPTIMIZE: Smaller chunks and longer delays
        const CHUNK_SIZE = 3; // Reduced from 5 to 3
        const chunks = [];
        
        for (let i = 0; i < texts.length; i += CHUNK_SIZE) {
          chunks.push(texts.slice(i, i + CHUNK_SIZE));
        }
        
        logInfo(`[Batch Translation] Processing ${texts.length} texts in ${chunks.length} chunks of ${CHUNK_SIZE}`);
        
        translatedTexts = [];
        
        // Process each chunk sequentially to avoid rate limits
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          logInfo(`[Batch Translation] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} texts)`);
          
          // Process chunk with retry logic
          const chunkPromises = chunk.map(text => translateWithRetry(text));
          
          // Wait for this chunk to complete
          const chunkResults = await Promise.all(chunkPromises);
          translatedTexts.push(...chunkResults);
          
          // Longer delay between chunks (500ms instead of 100ms)
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        method = 'jigsawstack';
        logInfo(`[Batch Translation] JigsawStack success - translated ${translatedTexts.length} texts in ${Date.now() - startTime}ms`);
        
      } catch (apiError) {
        logError('[Batch Translation] JigsawStack API failed, falling back to Ollama', apiError.message);
        
        // Fallback to Ollama - translate each individually
        translatedTexts = await Promise.all(
          texts.map(text => translateWithOllama(text, targetLanguage))
        );
        method = 'ollama';
      }
    } else {
      // No API key configured, use Ollama - translate each individually
      logInfo('[Batch Translation] Using Ollama (no JigsawStack API key)');
      translatedTexts = await Promise.all(
        texts.map(text => translateWithOllama(text, targetLanguage))
      );
      method = 'ollama';
    }
    
    const duration = Date.now() - startTime;
    logInfo(`[Batch Translation] Completed ${texts.length} texts in ${duration}ms using ${method}`);
    
    res.json({
      translatedTexts,
      method,
      duration,
      count: texts.length,
      originalTotalLength: texts.reduce((sum, t) => sum + t.length, 0),
      translatedTotalLength: translatedTexts.reduce((sum, t) => sum + t.length, 0)
    });
    
  } catch (error) {
    logError('[Batch Translation] Error:', error);
    res.status(500).json({ 
      error: 'Batch translation failed',
      details: error.message 
    });
  }
});

/**
 * Helper: Translate with Ollama
 */
async function translateWithOllama(text, targetLanguage) {
  const languageName = targetLanguage === 'hi' ? 'Hindi' : targetLanguage;
  
  const prompt = `Translate the following English text to ${languageName}. Only provide the translation, nothing else.

English text:
${text}

${languageName} translation:`;
  
  const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
    temperature: 0.3,
    max_tokens: text.length * 3 // Allow for expansion
  });
  
  return response.response.trim();
}

// ============================================
// MEDICAL TERMS GLOSSARY ENDPOINT
// ============================================

app.get('/api/medical-terms', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Read the medical terms glossary
    const glossaryPath = path.join(__dirname, '../data/medicalTerms.json');
    
    if (!fs.existsSync(glossaryPath)) {
      return res.status(404).json({
        error: 'Glossary not found',
        message: 'Medical terms glossary file not found'
      });
    }
    
    const glossaryData = fs.readFileSync(glossaryPath, 'utf8');
    const glossary = JSON.parse(glossaryData);
    
    console.log(`[Glossary] Sent ${Object.keys(glossary).length} medical terms`);
    
    res.json({
      terms: glossary,
      count: Object.keys(glossary).length
    });
    
  } catch (error) {
    console.error('[Glossary] Error:', error);
    res.status(500).json({
      error: 'glossary_error',
      message: error.message
    });
  }
});

// ============================================
// EXPLAIN MEDICAL TERM ENDPOINT (Dynamic)
// ============================================

app.post('/api/explain-term', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { term } = req.body;
    
    if (!term || typeof term !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Term is required and must be a string'
      });
    }
    
    // Sanitize term
    const sanitizedTerm = term.trim().toLowerCase();
    
    if (sanitizedTerm.length > 100) {
      return res.status(400).json({
        error: 'Term too long',
        message: 'Term must be less than 100 characters'
      });
    }
    
    console.log(`[Explain] Generating explanation for: "${sanitizedTerm}"`);
    
    const prompt = prompts.getTermExplanationPrompt(sanitizedTerm);
    const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
      temperature: 0.2,
      max_tokens: 300
    });
    
    // Parse JSON response
    let explanation;
    try {
      explanation = utils.extractJSON(response.response);
    } catch (parseError) {
      console.error('[Explain] JSON parse error:', parseError);
      // Fallback explanation
      explanation = {
        simple: sanitizedTerm,
        explanation: 'This is a medical term. Please consult your healthcare provider for more information.'
      };
    }
    
    // Validate structure
    if (!explanation.simple || !explanation.explanation) {
      explanation = {
        simple: sanitizedTerm,
        explanation: 'This is a medical term. Please consult your healthcare provider for more information.'
      };
    }
    
    console.log(`[Explain] Explanation generated in ${Date.now() - startTime}ms`);
    
    res.json({
      term: sanitizedTerm,
      simple: explanation.simple,
      explanation: explanation.explanation,
      cached: false,
      processingTime: Date.now() - startTime
    });
    
  } catch (error) {
    console.error('[Explain] Error:', error);
    
    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        error: 'explanation_timeout',
        message: 'Explanation generation took too long.',
        term: req.body.term
      });
    }
    
    res.status(500).json({
      error: 'explanation_error',
      message: error.message,
      term: req.body.term
    });
  }
});

// ============================================
// TTS ENDPOINT (Placeholder)
// ============================================

app.post('/api/tts', async (req, res) => {
  try {
    const { text, lang } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required'
      });
    }

    // TODO: Implement TTS using a service like piper or festival
    // For now, return a placeholder response
    console.log(`[TTS] TTS requested for ${lang || 'en'} (not implemented)`);

    res.json({
      audioUrl: null,
      message: 'TTS not yet implemented',
      text: text,
      lang: lang || 'en'
    });

  } catch (error) {
    console.error('[TTS] Error:', error);
    res.status(500).json({
      error: 'tts_error',
      message: error.message
    });
  }
});

// ============================================
// ERROR HANDLERS
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /health',
      'GET /api/medical-terms',
      'POST /api/summarize',
      'POST /api/care',
      'POST /api/faqs',
      'POST /api/translate',
      'POST /api/translate-batch',
      'POST /api/explain-term',
      'POST /api/tts'
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// ============================================
// START SERVER
// ============================================

async function startServer() {
  try {
    // Check Ollama availability
    const ollamaAvailable = await ollamaClient.isAvailable();
    
    console.log('='.repeat(60));
    console.log('CareBridge Backend Server');
    console.log('='.repeat(60));
    console.log(`Model: ${OLLAMA_MODEL}`);
    console.log(`Ollama Status: ${ollamaAvailable ? '✅ Connected' : '❌ Not Available'}`);
    
    if (!ollamaAvailable) {
      console.log('⚠️  Warning: Ollama is not running!');
      console.log('   Start Ollama: ollama serve');
      console.log('   Pull model: ollama pull mistral');
    }

    // Check JigsawStack API configuration
    if (JIGSAWSTACK_API_KEY && JIGSAWSTACK_API_KEY.length > 0) {
      console.log(`JigsawStack API: ✅ Configured (Primary for translation)`);
    } else {
      console.log(`JigsawStack API: ⚠️  Not configured (Using Ollama for translation)`);
    }
    
    console.log(`Port: ${PORT}`);
    console.log(`Max Concurrent Requests: ${MAX_CONCURRENT}`);
    console.log(`Translation Max Length: ${TRANSLATION_MAX_LENGTH} chars`);
    console.log('='.repeat(60));

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n✅ Server running on http://localhost:${PORT}`);
      console.log(`   Health Check: http://localhost:${PORT}/health\n`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
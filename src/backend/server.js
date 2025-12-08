/**
 * CareBridge Backend Server
 * 
 * Node.js/Express backend integrating Mistral model via Ollama
 * for medical document simplification, care guidance, and FAQ generation.
 * 
 * Setup:
 * 1. Install dependencies: npm install
 * 2. Install Ollama: https://ollama.ai
 * 3. Pull Mistral model: ollama pull mistral
 * 4. Copy .env.example to .env and configure
 * 5. Start server: npm start
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const prompts = require('./prompts');
const utils = require('./utils');
const ollamaClient = require('./ollamaClient');
const postProcess = require('./postProcessSummary');
const documentParser = require('./documentParser');

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const JIGSAWSTACK_API_KEY = process.env.JIGSAWSTACK_API_KEY || '';
const TRANSLATION_MAX_LENGTH = parseInt(process.env.TRANSLATION_MAX_LENGTH) || 10000;
const TRANSLATION_TIMEOUT = parseInt(process.env.TRANSLATION_TIMEOUT) || 15000;

// 🔧 Increased concurrency limit for translation workload
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10; // Increased from 3 to 10

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware (metadata only, no PHI)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Concurrency control
let activeRequests = 0;

function checkConcurrency(req, res, next) {
  if (activeRequests >= MAX_CONCURRENT) {
    return res.status(429).json({
      error: 'Too many concurrent requests',
      message: 'Please wait — processing previous file',
      retryAfter: 5
    });
  }
  activeRequests++;
  res.on('finish', () => {
    activeRequests--;
  });
  next();
}

// ============================================
// HEALTH CHECK
// ============================================

// Logging helpers
function logInfo(message, ...args) {
  console.log(`[INFO] ${message}`, ...args);
}

function logError(message, ...args) {
  console.error(`[ERROR] ${message}`, ...args);
}

app.get('/health', async (req, res) => {
  try {
    const ollamaAvailable = await ollamaClient.isAvailable();
    const models = await ollamaClient.listModels();
    
    res.json({
      status: ollamaAvailable ? 'healthy' : 'degraded',
      ollama: {
        available: ollamaAvailable,
        model: OLLAMA_MODEL,
        models: models.map(m => m.name || m.model)
      },
      server: {
        uptime: process.uptime(),
        activeRequests: activeRequests,
        maxConcurrent: MAX_CONCURRENT
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message
    });
  }
});

// ============================================
// SUMMARIZATION ENDPOINT
// ============================================

app.post('/api/summarize', checkConcurrency, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { text, options = {} } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required and must be a string'
      });
    }

    // 🔴 CRITICAL: Enforce maximum text length to prevent system crashes
    const MAX_TEXT_LENGTH = 50000; // 50K characters max
    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(413).json({
        error: 'Text too long',
        message: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters. Current length: ${text.length}. Please split into smaller documents.`,
        maxLength: MAX_TEXT_LENGTH,
        currentLength: text.length
      });
    }

    // Sanitize input
    const sanitizedText = ollamaClient.sanitizeInput(text);
    
    if (!sanitizedText) {
      return res.status(400).json({
        error: 'Invalid text',
        message: 'Text is empty after sanitization'
      });
    }

    console.log(`[Summarize] Processing text: ${sanitizedText.length} chars`);

    // ✅ PRE-PARSE: Extract structured data from original document
    console.log('[Summarize] Pre-parsing document for structured data extraction...');
    const parsedData = documentParser.parseDischargeDocument(sanitizedText);

    let summary;
    let tokensConsumed = 0;

    // Check if chunking is needed
    const estimatedTokens = utils.estimateTokens(sanitizedText);
    const needsChunking = sanitizedText.length > 5000 || estimatedTokens > 2500;

    if (needsChunking) {
      console.log(`[Summarize] Large document detected. Using chunking strategy.`);
      
      // Split into chunks
      const chunks = utils.chunkText(sanitizedText, 6000);
      console.log(`[Summarize] Split into ${chunks.length} chunks`);

      // Process each chunk
      const chunkSummaries = [];
      
      for (let i = 0; i < chunks.length; i++) {
        console.log(`[Summarize] Processing chunk ${i + 1}/${chunks.length}...`);
        
        const chunkPrompt = prompts.getSummarizationPrompt(chunks[i], true);
        const response = await ollamaClient.generate(OLLAMA_MODEL, chunkPrompt, {
          temperature: 0.1,
          max_tokens: 2048  // Increased from 500 to 2048 for detailed chunk summaries
        });

        chunkSummaries.push(response.response);
        tokensConsumed += (response.eval_count || 0);
      }

      // Combine chunk summaries
      console.log(`[Summarize] Synthesizing final summary`);
      const synthesisPrompt = prompts.getFinalSynthesisPrompt(chunkSummaries.join('\n\n---\n\n'));
      const finalResponse = await ollamaClient.generate(OLLAMA_MODEL, synthesisPrompt, {
        temperature: 0.1,
        max_tokens: 4096  // Increased from 1000 to 4096 for complete final summaries
      });

      summary = finalResponse.response;
      tokensConsumed += (finalResponse.eval_count || 0);

    } else {
      // Process as single document
      console.log(`[Summarize] Processing as single document`);
      
      const prompt = prompts.getSummarizationPrompt(sanitizedText, false);
      const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
        temperature: 0.1,
        max_tokens: 4096  // Increased from 800 to 4096 for complete single-document summaries
      });

      summary = response.response;
      tokensConsumed = response.eval_count || 0;
    }

    // ✅ POST-PROCESS: Fix section structure issues
    console.log('[Summarize] Post-processing summary...');
    summary = postProcess.postProcessSummary(summary);

    // ✅ MERGE: Inject accurate structured data from parser
    if (parsedData.hasStructuredData) {
      console.log('[Summarize] Merging parsed structured data...');
      summary = documentParser.mergeWithAISummary(summary, parsedData);
    }

    // Calculate confidence
    const confidence = utils.calculateConfidence(sanitizedText, summary, {
      tokens: tokensConsumed,
      duration: Date.now() - startTime
    });

    // Check if review is suggested
    const reviewSuggested = utils.shouldReviewBeSuggested(confidence, summary);

    // Validate medications
    const medValidation = utils.validateMedications(summary);

    console.log(`[Summarize] Complete. Confidence: ${confidence.toFixed(2)}, Review: ${reviewSuggested}`);

    res.json({
      summary: summary,
      confidence: parseFloat(confidence.toFixed(2)),
      reviewSuggested: reviewSuggested || !medValidation.valid,
      tokensConsumed: tokensConsumed,
      processingTime: Date.now() - startTime,
      metadata: {
        chunked: needsChunking,
        chunks: needsChunking ? utils.chunkText(sanitizedText, 6000).length : 1,
        medicationValidation: medValidation
      }
    });

  } catch (error) {
    console.error('[Summarize] Error:', error);

    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        error: 'summarization_timeout',
        message: 'Summarization took too long. Please try again or download raw text.',
        processingTime: Date.now() - startTime
      });
    }

    // Handle Ollama not available
    if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
      return res.status(503).json({
        error: 'ollama_unavailable',
        message: 'Ollama service is not running. Please start Ollama and try again.',
        hint: 'Run: ollama serve'
      });
    }

    res.status(500).json({
      error: 'summarization_error',
      message: error.message,
      processingTime: Date.now() - startTime
    });
  }
});

// ============================================
// CARE GUIDANCE ENDPOINT
// ============================================

app.post('/api/care', checkConcurrency, async (req, res) => {
  const startTime = Date.now();

  try {
    const { summary } = req.body;

    if (!summary || typeof summary !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Summary text is required'
      });
    }

    // 🔴 CRITICAL: Limit input length
    if (summary.length > 20000) {
      return res.status(413).json({
        error: 'Summary too long',
        message: 'Summary exceeds 20,000 characters'
      });
    }

    console.log(`[Care] Generating care guidance from summary (${summary.length} chars)`);

    const prompt = prompts.getCareGuidancePrompt(summary);
    const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
      temperature: 0.2,
      max_tokens: 1500
    });

    // Parse JSON response - expecting array format now
    const careData = utils.extractJSON(response.response);

    // Validate structure - expecting array of care items
    if (!Array.isArray(careData)) {
      throw new Error('Invalid care guidance structure - expected array');
    }

    // Validate each item has required fields
    const validCareData = careData.filter(item => 
      item.title && item.description && item.priority && item.category
    );

    if (validCareData.length === 0) {
      throw new Error('No valid care guidance items');
    }

    console.log(`[Care] Generated ${validCareData.length} care guidance items successfully`);

    res.json(validCareData);

  } catch (error) {
    console.error('[Care] Error:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return res.status(500).json({
        error: 'parse_error',
        message: 'Failed to parse care guidance. Using fallback.',
        fallback: true
      });
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        error: 'care_timeout',
        message: 'Care guidance generation took too long.',
        processingTime: Date.now() - startTime
      });
    }

    res.status(500).json({
      error: 'care_generation_error',
      message: error.message,
      fallback: true
    });
  }
});

// ============================================
// FAQ GENERATION ENDPOINT
// ============================================

app.post('/api/faqs', checkConcurrency, async (req, res) => {
  const startTime = Date.now();

  try {
    const { summary } = req.body;

    if (!summary || typeof summary !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Summary text is required'
      });
    }

    // 🔴 CRITICAL: Limit input length
    if (summary.length > 20000) {
      return res.status(413).json({
        error: 'Summary too long',
        message: 'Summary exceeds 20,000 characters'
      });
    }

    console.log(`[FAQs] Generating FAQs from summary (${summary.length} chars)`);

    const prompt = prompts.getFAQPrompt(summary);
    const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
      temperature: 0.1, // Lower temperature for more consistent JSON
      max_tokens: 2000  // More tokens for detailed answers
    });

    console.log(`[FAQs] Raw response length: ${response.response.length} chars`);

    // Parse JSON response
    let faqs;
    try {
      faqs = utils.extractJSON(response.response);
    } catch (parseError) {
      console.error('[FAQs] JSON parse error:', parseError);
      console.error('[FAQs] Raw response:', response.response.substring(0, 500));
      throw new Error('Failed to parse FAQ JSON: ' + parseError.message);
    }

    // Validate structure
    if (!Array.isArray(faqs)) {
      console.error('[FAQs] Response is not an array:', typeof faqs);
      throw new Error('FAQs must be an array');
    }

    // Ensure each FAQ has q and a (more lenient validation)
    const validFaqs = faqs.filter(faq => {
      const hasQuestion = faq.q || faq.question;
      const hasAnswer = faq.a || faq.answer;
      return hasQuestion && hasAnswer;
    }).map(faq => ({
      q: faq.q || faq.question,
      a: faq.a || faq.answer,
      category: faq.category || 'General',
      additionalInfo: faq.additionalInfo || faq.additional_info
    }));

    if (validFaqs.length === 0) {
      console.error('[FAQs] No valid FAQs found in response');
      throw new Error('No valid FAQs generated');
    }

    console.log(`[FAQs] Generated ${validFaqs.length} valid FAQs successfully`);

    res.json({
      faqs: validFaqs
    });

  } catch (error) {
    console.error('[FAQs] Error:', error);

    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return res.status(500).json({
        error: 'parse_error',
        message: 'Failed to parse FAQs. Using fallback.',
        fallback: true
      });
    }

    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        error: 'faq_timeout',
        message: 'FAQ generation took too long.',
        processingTime: Date.now() - startTime
      });
    }

    res.status(500).json({
      error: 'faq_generation_error',
      message: error.message,
      fallback: true
    });
  }
});

// ============================================
// 6. TRANSLATION ENDPOINT
// ============================================

/**
 * POST /api/translate
 * Translates text from English to Hindi using JigsawStack API or Ollama fallback
 */
app.post('/api/translate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { text, targetLanguage = 'hi' } = req.body;
    
    // Validation
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ 
        error: 'Text is required and must be a string' 
      });
    }
    
    if (text.length > TRANSLATION_MAX_LENGTH) {
      return res.status(400).json({ 
        error: `Text exceeds maximum length of ${TRANSLATION_MAX_LENGTH} characters` 
      });
    }
    
    if (targetLanguage !== 'hi') {
      return res.status(400).json({ 
        error: 'Only Hindi (hi) translation is currently supported' 
      });
    }
    
    logInfo(`[Translation] Request for ${text.length} chars to ${targetLanguage}`);
    
    let translatedText = '';
    let method = 'unknown';
    
    // Try JigsawStack API first if configured
    if (JIGSAWSTACK_API_KEY) {
      try {
        logInfo('[Translation] Using JigsawStack API');
        
        const response = await axios.post(
          'https://api.jigsawstack.com/v1/ai/translate',
          {
            text: text,
            target_language: targetLanguage
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': JIGSAWSTACK_API_KEY
            },
            timeout: TRANSLATION_TIMEOUT
          }
        );
        
        if (response.data && response.data.translated_text) {
          translatedText = response.data.translated_text;
          method = 'jigsawstack';
          logInfo(`[Translation] JigsawStack success in ${Date.now() - startTime}ms`);
        } else {
          throw new Error('Invalid response from JigsawStack API');
        }
      } catch (apiError) {
        logError('[Translation] JigsawStack API failed, falling back to Ollama', apiError.message);
        
        // Fallback to Ollama
        translatedText = await translateWithOllama(text, targetLanguage);
        method = 'ollama';
      }
    } else {
      // No API key configured, use Ollama
      logInfo('[Translation] Using Ollama (no JigsawStack API key)');
      translatedText = await translateWithOllama(text, targetLanguage);
      method = 'ollama';
    }
    
    const duration = Date.now() - startTime;
    logInfo(`[Translation] Completed in ${duration}ms using ${method}`);
    
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
      error: 'Translation failed',
      details: error.message 
    });
  }
});

/**
 * POST /api/translate-batch
 * Translates multiple texts in a single request (OPTIMIZED for efficiency)
 */
app.post('/api/translate-batch', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { texts, targetLanguage = 'hi' } = req.body;
    
    // Validation
    if (!Array.isArray(texts)) {
      return res.status(400).json({ 
        error: 'texts must be an array' 
      });
    }
    
    if (texts.length === 0) {
      return res.status(400).json({ 
        error: 'texts array cannot be empty' 
      });
    }
    
    if (texts.length > 50) {
      return res.status(400).json({ 
        error: 'Maximum 50 texts per batch' 
      });
    }
    
    // Validate each text
    for (let i = 0; i < texts.length; i++) {
      if (typeof texts[i] !== 'string') {
        return res.status(400).json({ 
          error: `Text at index ${i} must be a string` 
        });
      }
      if (texts[i].length > TRANSLATION_MAX_LENGTH) {
        return res.status(400).json({ 
          error: `Text at index ${i} exceeds maximum length of ${TRANSLATION_MAX_LENGTH} characters` 
        });
      }
    }
    
    if (targetLanguage !== 'hi') {
      return res.status(400).json({ 
        error: 'Only Hindi (hi) translation is currently supported' 
      });
    }
    
    logInfo(`[Batch Translation] Request for ${texts.length} texts (${texts.reduce((sum, t) => sum + t.length, 0)} total chars)`);
    
    let translatedTexts = [];
    let method = 'unknown';
    
    // Try JigsawStack API first if configured
    if (JIGSAWSTACK_API_KEY) {
      try {
        logInfo('[Batch Translation] Using JigsawStack API');
        
        // ✅ FIX: Retry logic with exponential backoff
        const translateWithRetry = async (text, retries = 3) => {
          for (let attempt = 1; attempt <= retries; attempt++) {
            try {
              const response = await axios.post(
                'https://api.jigsawstack.com/v1/ai/translate',
                {
                  text: text,
                  target_language: targetLanguage
                },
                {
                  headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': JIGSAWSTACK_API_KEY
                  },
                  timeout: TRANSLATION_TIMEOUT * 2 // Increase timeout to 60s
                }
              );
              
              if (response.data && response.data.translated_text) {
                return response.data.translated_text;
              }
              throw new Error('Invalid response from JigsawStack API');
            } catch (err) {
              const isLastAttempt = attempt === retries;
              
              // Check for rate limiting (429) or server errors (500, 502, 503)
              const shouldRetry = err.response?.status === 429 || 
                                  err.response?.status >= 500 || 
                                  err.code === 'ECONNABORTED';
              
              if (shouldRetry && !isLastAttempt) {
                const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                logInfo(`[Batch Translation] Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
              }
              
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
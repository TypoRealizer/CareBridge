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
const ollamaClient = require('./ollamaClient');
const prompts = require('./prompts');
const utils = require('./utils');

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';

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
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT_REQUESTS || '3');

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
        console.log(`[Summarize] Processing chunk ${i + 1}/${chunks.length}`);
        
        const chunkPrompt = prompts.getSummarizationPrompt(chunks[i], true);
        const response = await ollamaClient.generate(OLLAMA_MODEL, chunkPrompt, {
          temperature: 0.1,
          max_tokens: 500
        });

        chunkSummaries.push(response.response);
        tokensConsumed += (response.eval_count || 0);
      }

      // Combine chunk summaries
      console.log(`[Summarize] Synthesizing final summary`);
      const synthesisPrompt = prompts.getFinalSynthesisPrompt(chunkSummaries.join('\n\n---\n\n'));
      const finalResponse = await ollamaClient.generate(OLLAMA_MODEL, synthesisPrompt, {
        temperature: 0.1,
        max_tokens: 1000
      });

      summary = finalResponse.response;
      tokensConsumed += (finalResponse.eval_count || 0);

    } else {
      // Process as single document
      console.log(`[Summarize] Processing as single document`);
      
      const prompt = prompts.getSummarizationPrompt(sanitizedText, false);
      const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
        temperature: 0.1,
        max_tokens: 800
      });

      summary = response.response;
      tokensConsumed = response.eval_count || 0;
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
// TRANSLATION ENDPOINT
// ============================================

app.post('/api/translate', checkConcurrency, async (req, res) => {
  const startTime = Date.now();

  try {
    const { text, lang } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Text is required'
      });
    }

    // 🔴 CRITICAL: Limit translation text length
    if (text.length > 15000) {
      return res.status(413).json({
        error: 'Text too long for translation',
        message: 'Text exceeds 15,000 characters. Please translate in smaller chunks.'
      });
    }

    if (!lang || !['hi', 'kn', 'en'].includes(lang)) {
      return res.status(400).json({
        error: 'Invalid language',
        message: 'Language must be one of: hi, kn, en'
      });
    }

    // If target is English, return as-is
    if (lang === 'en') {
      return res.json({
        translatedText: text,
        targetLanguage: 'en'
      });
    }

    console.log(`[Translate] Translating to ${lang}`);

    const prompt = prompts.getTranslationPrompt(text, lang);
    const response = await ollamaClient.generate(OLLAMA_MODEL, prompt, {
      temperature: 0.3, // Lower temp for more accurate translation
      max_tokens: 1500
    });

    console.log(`[Translate] Translation complete`);

    res.json({
      translatedText: response.response,
      targetLanguage: lang,
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    console.error('[Translate] Error:', error);

    // Handle timeout
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return res.status(504).json({
        error: 'translation_timeout',
        message: 'Translation took too long.',
        originalText: req.body.text // Fallback to original
      });
    }

    res.status(500).json({
      error: 'translation_error',
      message: error.message,
      originalText: req.body.text // Fallback to original
    });
  }
});

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
    
    console.log(`Port: ${PORT}`);
    console.log(`Max Concurrent Requests: ${MAX_CONCURRENT}`);
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

/**
 * Ollama HTTP Client
 * 
 * Centralized module for making calls to local Ollama API
 * Handles HTTP POST to http://localhost:11434/api/generate
 * Implements retry logic and error handling
 */

const axios = require('axios');

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
// 🔴 CRITICAL: Reduced from 60s to 30s to prevent system hangs
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000'); // 30 seconds max
const MAX_RETRIES = 1;

/**
 * Call Ollama API with given prompt and options
 * @param {string} model - Model name (e.g., 'mistral', 'llama2')
 * @param {string} prompt - The prompt to send
 * @param {object} options - Generation options (temperature, max_tokens, etc.)
 * @returns {Promise<object>} Response from Ollama
 */
async function generate(model, prompt, options = {}) {
  const requestBody = {
    model: model,
    prompt: prompt,
    stream: false,
    options: {
      temperature: options.temperature || 0.1,
      top_p: options.top_p || 0.9,
      top_k: options.top_k || 40,
      num_predict: options.max_tokens || 4096, // Increased from 800 to 4096 for full medical summaries
    }
  };

  let lastError;
  
  // Retry logic
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(
        `${OLLAMA_HOST}/api/generate`,
        requestBody,
        {
          timeout: REQUEST_TIMEOUT,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const duration = Date.now() - startTime;

      // Log metadata only (no PHI)
      if (process.env.LOG_LEVEL === 'debug') {
        console.log(`[Ollama] Model: ${model}, Duration: ${duration}ms, Attempt: ${attempt + 1}`);
      }

      return {
        response: response.data.response,
        model: response.data.model,
        created_at: response.data.created_at,
        done: response.data.done,
        total_duration: response.data.total_duration,
        eval_count: response.data.eval_count,
        prompt_eval_count: response.data.prompt_eval_count,
        duration: duration
      };

    } catch (error) {
      lastError = error;
      
      // Log error metadata
      console.error(`[Ollama] Attempt ${attempt + 1} failed:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status
      });

      // Don't retry on client errors (400-499)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  // All retries failed
  throw lastError;
}

/**
 * Check if Ollama is available
 * @returns {Promise<boolean>} True if Ollama is responsive
 */
async function isAvailable() {
  try {
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, {
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * List available models
 * @returns {Promise<Array>} List of available models
 */
async function listModels() {
  try {
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, {
      timeout: 5000
    });
    return response.data.models || [];
  } catch (error) {
    console.error('[Ollama] Failed to list models:', error.message);
    return [];
  }
}

/**
 * Sanitize input text before sending to model
 * Removes non-text binary artifacts
 * @param {string} text - Input text
 * @returns {string} Sanitized text
 */
function sanitizeInput(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove null bytes and other control characters
  let sanitized = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
}

module.exports = {
  generate,
  isAvailable,
  listModels,
  sanitizeInput
};
/**
 * Utility Functions
 * 
 * Handles chunking, confidence scoring, and safety checks
 */

/**
 * Estimate token count (rough approximation)
 * @param {string} text 
 * @returns {number} Approximate token count
 */
function estimateTokens(text) {
  // Rough estimate: ~4 characters per token for English
  // More conservative for medical text with technical terms
  return Math.ceil(text.length / 3.5);
}

/**
 * Split long text into chunks
 * @param {string} text - Text to chunk
 * @param {number} maxChunkSize - Maximum characters per chunk
 * @returns {Array<string>} Array of text chunks
 */
function chunkText(text, maxChunkSize = 6000) {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If single paragraph is too large, split by sentences
    if (paragraph.length > maxChunkSize) {
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
      }
    } else {
      // Normal paragraph processing
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
  }

  // Add remaining chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Calculate confidence score for summary
 * @param {string} originalText - Original medical text
 * @param {string} summary - Generated summary
 * @param {object} metadata - Additional metadata (tokens, duration, etc.)
 * @returns {number} Confidence score (0.0 - 1.0)
 */
function calculateConfidence(originalText, summary, metadata = {}) {
  let confidence = 0.8; // Base confidence

  // Check 1: Coverage - important medical keywords present
  const medicalKeywords = [
    'diagnosis', 'procedure', 'medication', 'treatment', 'condition',
    'symptom', 'discharge', 'follow-up', 'appointment', 'doctor'
  ];

  const originalLower = originalText.toLowerCase();
  const summaryLower = summary.toLowerCase();
  
  let keywordMatches = 0;
  let keywordsPresent = 0;

  for (const keyword of medicalKeywords) {
    if (originalLower.includes(keyword)) {
      keywordsPresent++;
      if (summaryLower.includes(keyword)) {
        keywordMatches++;
      }
    }
  }

  if (keywordsPresent > 0) {
    const keywordCoverage = keywordMatches / keywordsPresent;
    confidence *= (0.7 + (keywordCoverage * 0.3)); // Adjust confidence based on coverage
  }

  // Check 2: Length ratio (summary should be 10-40% of original)
  const lengthRatio = summary.length / originalText.length;
  if (lengthRatio < 0.05 || lengthRatio > 0.6) {
    confidence *= 0.85; // Penalize if too short or too long
  }

  // Check 3: Medication pattern presence
  const medicationPattern = /\b\d+\s*(mg|ml|units|iu|mcg)\b/gi;
  const originalMeds = originalText.match(medicationPattern) || [];
  const summaryMeds = summary.match(medicationPattern) || [];
  
  if (originalMeds.length > 0 && summaryMeds.length === 0) {
    confidence *= 0.7; // Significant penalty if meds are missing
  }

  // Check 4: Flag if [CONFIRM MED] present
  if (summary.includes('[CONFIRM MED]')) {
    confidence *= 0.8;
  }

  // Clamp between 0 and 1
  return Math.max(0.0, Math.min(1.0, confidence));
}

/**
 * Check if review is suggested based on confidence and content
 * @param {number} confidence - Confidence score
 * @param {string} summary - Generated summary
 * @returns {boolean} True if review is suggested
 */
function shouldReviewBeSuggested(confidence, summary) {
  // Low confidence threshold
  if (confidence < 0.6) {
    return true;
  }

  // Check for ambiguous medication flags
  if (summary.includes('[CONFIRM MED]')) {
    return true;
  }

  // Check for missing critical information
  const criticalSections = ['diagnosis', 'medication', 'follow-up'];
  const summaryLower = summary.toLowerCase();
  
  const missingSections = criticalSections.filter(
    section => !summaryLower.includes(section)
  );

  if (missingSections.length >= 2) {
    return true;
  }

  return false;
}

/**
 * Validate medication details in summary
 * @param {string} summary - Generated summary
 * @returns {object} Validation results
 */
function validateMedications(summary) {
  const issues = [];
  
  // Check for dosage patterns
  const dosagePattern = /\b\d+\s*(mg|ml|units|iu|mcg|g)\b/gi;
  const dosages = summary.match(dosagePattern) || [];

  // Check for numeric values without units (potential issue)
  const numbersWithoutUnits = /\b\d+\s*(?!mg|ml|units|iu|mcg|g|times|days|hours|weeks|months)\b/gi;
  const suspiciousNumbers = summary.match(numbersWithoutUnits) || [];

  if (suspiciousNumbers.length > 3) {
    issues.push('Some numeric values may be missing units');
  }

  // Check for medication timing keywords
  const timingKeywords = ['daily', 'twice', 'morning', 'evening', 'before', 'after', 'meal'];
  const hasTimingInfo = timingKeywords.some(keyword => 
    summary.toLowerCase().includes(keyword)
  );

  if (dosages.length > 0 && !hasTimingInfo) {
    issues.push('Medication timing information may be incomplete');
  }

  return {
    valid: issues.length === 0,
    issues: issues,
    dosagesFound: dosages.length
  };
}

/**
 * Extract JSON from text (handles markdown code blocks)
 * @param {string} text - Text containing JSON
 * @returns {object|array} Parsed JSON
 */
function extractJSON(text) {
  let jsonText = text.trim();

  // Remove markdown code blocks
  if (jsonText.includes('```json')) {
    jsonText = jsonText.split('```json')[1].split('```')[0].trim();
  } else if (jsonText.includes('```')) {
    jsonText = jsonText.split('```')[1].split('```')[0].trim();
  }

  // Try to find JSON object/array
  const jsonMatch = jsonText.match(/[\{\[][\s\S]*[\}\]]/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  return JSON.parse(jsonText);
}

module.exports = {
  estimateTokens,
  chunkText,
  calculateConfidence,
  shouldReviewBeSuggested,
  validateMedications,
  extractJSON
};

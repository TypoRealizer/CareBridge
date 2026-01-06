/**
 * Output Quality Validator
 * 
 * Validates AI-generated summaries to detect and reject poor quality output
 */

/**
 * Validate summary quality and detect common Mistral failures
 * @param {string} summary - The AI-generated summary
 * @returns {Object} - { valid: boolean, issues: string[], score: number }
 */
function validateSummaryQuality(summary) {
  console.log('[Validator] Checking summary quality...');
  
  const issues = [];
  let score = 100;
  
  // 1. Check for OCR artifacts
  const ocrArtifacts = [
    /artery walls["\']?>/i,
    /TOMBINU/i,
    /OLD MEDICATIONG/i,
    /www\.[a-z0-9\-]+\.(org|com|in)/i,
    /KMC\s*No\.?\s*\d{5,}/i,
    /RMHIP\/\d+/,
    /MH\d{8}/,
    /Prepared by:/i,
    /Sinus rhythm/i,
    /Abnormal R-wave/i
  ];
  
  for (const pattern of ocrArtifacts) {
    if (pattern.test(summary)) {
      issues.push(`OCR artifact detected: ${pattern.source}`);
      score -= 15;
    }
  }
  
  // 2. Check for header garbage in diagnoses section
  if (summary.match(/DIAGNOSES:[\s\S]{0,200}(DISCHARGE SUMMARY|76 Years|Months \/ Female)/i)) {
    issues.push('Header garbage in diagnoses section');
    score -= 20;
  }
  
  // 3. Check for mashed medications in Note field
  if (summary.match(/Note:[\s\S]{0,100}(TAB|CAP|INJ)[\s\S]{0,100}(TAB|CAP|INJ)/i)) {
    issues.push('Medications mashed together in Note field');
    score -= 25;
  }
  
  // 4. Check for duplicate sections
  const sectionHeaders = [
    'PATIENT HISTORY',
    'DIAGNOSIS AND TREATMENT GIVEN',
    'MEDICATIONS TO FOLLOW AFTER DISCHARGE',
    'FOLLOW-UP AND FUTURE CARE'
  ];
  
  for (const header of sectionHeaders) {
    const regex = new RegExp(`\\*\\*${header}\\*\\*`, 'gi');
    const matches = summary.match(regex);
    if (matches && matches.length > 1) {
      issues.push(`Duplicate section: ${header} (appears ${matches.length} times)`);
      score -= 10;
    }
  }
  
  // 5. Check for incomplete sections (cut-off mid-sentence)
  if (summary.match(/\*\*MEDICATIONS TO FOLLOW[\s\S]*Note:\s*$/i)) {
    issues.push('Incomplete medications section (ends with Note:)');
    score -= 20;
  }
  
  // 6. Check minimum length
  if (summary.length < 200) {
    issues.push('Summary too short');
    score -= 30;
  }
  
  // 7. Check for required sections
  const requiredSections = ['DIAGNOSIS AND TREATMENT GIVEN'];
  for (const section of requiredSections) {
    if (!summary.includes(section)) {
      issues.push(`Missing required section: ${section}`);
      score -= 20;
    }
  }
  
  // Final validation
  const valid = score >= 60; // Pass if score is 60 or above
  
  if (!valid) {
    console.log('[Validator] ❌ Summary FAILED validation');
    console.log(`[Validator] Score: ${score}/100`);
    console.log(`[Validator] Issues found:`, issues);
  } else {
    console.log(`[Validator] ✅ Summary passed validation (score: ${score}/100)`);
  }
  
  return {
    valid,
    score,
    issues
  };
}

/**
 * Deep clean summary - SUPER AGGRESSIVE cleaning
 * @param {string} summary - Summary to clean
 * @returns {string} - Cleaned summary
 */
function deepCleanSummary(summary) {
  console.log('[Validator] Performing SUPER AGGRESSIVE clean...');
  
  let cleaned = summary;
  
  // ========================================
  // PHASE 1: Remove all OCR garbage - MULTIPLE PASSES
  // ========================================
  
  for (let pass = 0; pass < 5; pass++) {
    // Remove "Prepared by" section and everything after
    cleaned = cleaned.replace(/\*\*PREPARED BY\*\*[\s\S]*/gi, '');
    cleaned = cleaned.replace(/PREPARED BY:[\s\S]*/gi, '');
    cleaned = cleaned.replace(/- Prepared by[\s\S]*/gi, '');
    cleaned = cleaned.replace(/Prepared by[\s\S]*/gi, '');
    
    // Remove "NOTE:" section
    cleaned = cleaned.replace(/\*\*NOTE:\*\*[\s\S]*?(?=\*\*[A-Z]|$)/gi, '');
    
    // Remove trailing "DISCHARGE SUMMARY" duplicate section
    cleaned = cleaned.replace(/\*\*DISCHARGE SUMMARY\*\*[\s\S]*/gi, '');
    
    // Remove header garbage from diagnoses
    cleaned = cleaned.replace(/DIAGNOSES:\s*-\s*DISCHARGE SUMMARY/gi, 'DIAGNOSES:');
    cleaned = cleaned.replace(/-\s*DISCHARGE SUMMARY\s*/gi, '');
    cleaned = cleaned.replace(/-\s*Months\s*\/\s*Female/gi, '');
    cleaned = cleaned.replace(/-\s*\d+\s*Years\s*\/?\s*(Male|Female)?/gi, '');
    
    // ========================================
    // AGGRESSIVE: Fix ALL "> patterns (OCR artifacts)
    // ========================================
    
    // Fix common medical term patterns
    cleaned = cleaned.replace(/Lymph gland cancer["']?\s*>\s*Lymphoma/gi, 'Lymphoma');
    cleaned = cleaned.replace(/systemic\s+artery\s+walls["']?\s*>\s*hypertension/gi, 'high blood pressure');
    cleaned = cleaned.replace(/artery\s+walls["']?\s*>\s*[Hh]ypertension/gi, 'high blood pressure');
    cleaned = cleaned.replace(/SYSTEMIC\s+artery\s+walls["']?\s*>\s*HYPERTENSION/gi, 'high blood pressure');
    cleaned = cleaned.replace(/ultrasound["']?\s*>\s*/gi, '');
    
    // Generic pattern: "word1 word2">word3 → just use word3
    // Match: any text followed by "> then a word, keep only the word after >
    cleaned = cleaned.replace(/[\w\s]+["']?\s*>\s*([A-Z][a-z]+)/g, '$1');
    
    // Medical abbreviation patterns
    cleaned = cleaned.replace(/Kidney function marker["']?\s*>\s*creatinine/gi, 'creatinine');
    cleaned = cleaned.replace(/Liver function marker["']?\s*>\s*bilirubin/gi, 'bilirubin');
    cleaned = cleaned.replace(/Infection fighters["']?\s*>\s*white blood cells/gi, 'white blood cells');
    
    // Generic: Remove any remaining "> patterns
    cleaned = cleaned.replace(/["']?\s*>\s*/g, ' ');
    
    // Remove RWMA, LVDD garbage
    cleaned = cleaned.replace(/RWMA,\s*GRADE\s*\d+LVDD,\s*PASP-\d+MMHG\.?\s*/gi, '');
    cleaned = cleaned.replace(/NO\s+RWMA,\s*GRADE\s*\d+LVDD,\s*PASP-\d+MMHG/gi, '');
    cleaned = cleaned.replace(/right ventricular pressure\s*\(RWMA\)/gi, 'right ventricle function (normal)');
    
    // Remove mashed medications in Note field
    cleaned = cleaned.replace(/\*\*Note:\*\*\s*FOLLOWED BY[\s\S]{50,500}?\s*\d{3}\s+\d{3}\s*\|/gi, '');
    cleaned = cleaned.replace(/Note:\s*FOLLOWED BY[\s\S]{50,500}?\s*\d{3}\s+\d{3}\s*\|/gi, '');
    
    // Remove trailing garbage
    cleaned = cleaned.replace(/\s+\d{3}\s+\d{3}\s*\|\s*/g, '');
    cleaned = cleaned.replace(/\s+\d{3,}\s*\|\s*/g, '');
    
    // Remove other OCR artifacts
    cleaned = cleaned.replace(/www\.[a-z0-9\-]+\.(org|com|in)[^\s]*/gi, '');
    cleaned = cleaned.replace(/KMC\s*No\.?\s*\d{5,}/gi, '');
  }
  
  // ========================================
  // PHASE 2: Remove duplicate sections
  // ========================================
  
  const sections = [
    'PATIENT HISTORY',
    'CONDITION WHEN ADMITTED',
    'DIAGNOSIS AND TREATMENT GIVEN',
    'CONDITION AT DISCHARGE',
    'MEDICATIONS TO FOLLOW AFTER DISCHARGE',
    'FOLLOW-UP AND FUTURE CARE',
    'ADDITIONAL INFORMATION'
  ];
  
  for (const section of sections) {
    // Find all occurrences
    const pattern = new RegExp(`\\*\\*${section}\\*\\*`, 'gi');
    const matches = [];
    let match;
    
    // Reset regex
    pattern.lastIndex = 0;
    while ((match = pattern.exec(cleaned)) !== null) {
      matches.push(match.index);
    }
    
    if (matches.length > 1) {
      console.log(`[Validator] Found ${matches.length} copies of "${section}", keeping only first`);
      
      // Keep everything up to and including first occurrence
      // Remove from second occurrence to the end
      const firstOccurrence = matches[0];
      const secondOccurrence = matches[1];
      
      // Keep: start -> first section + content
      // Remove: second section onwards
      cleaned = cleaned.substring(0, secondOccurrence);
    }
  }
  
  // ========================================
  // PHASE 3: Fix formatting and add proper spacing
  // ========================================
  
  // Fix broken section headers
  cleaned = cleaned.replace(/\*\*\s*TO FOLLOW AFTER DISCHARGE\s*\*\*/gi, '**MEDICATIONS TO FOLLOW AFTER DISCHARGE**');
  cleaned = cleaned.replace(/\*\* TO FOLLOW/gi, '**MEDICATIONS TO FOLLOW');
  
  // Add newlines BEFORE each section header (ensure spacing)
  const allSections = [
    'PATIENT HISTORY',
    'CONDITION WHEN ADMITTED',
    'DIAGNOSIS AND TREATMENT GIVEN',
    'CONDITION AT DISCHARGE',
    'MEDICATIONS TO FOLLOW AFTER DISCHARGE',
    'FOLLOW-UP AND FUTURE CARE',
    'ADDITIONAL INFORMATION'
  ];
  
  for (const section of allSections) {
    // Replace **SECTION** with \n\n**SECTION**\n (double newline before, single after)
    const regex = new RegExp(`([^\\n])\\*\\*${section}\\*\\*`, 'gi');
    cleaned = cleaned.replace(regex, `$1\n\n**${section}**\n`);
  }
  
  // Fix spacing after section headers that have dashes
  cleaned = cleaned.replace(/\*\*([A-Z\s]+)\*\*\s*-\s*/g, '**$1**\n- ');
  
  // Add spacing after subsections (DIAGNOSES:, TESTS:, etc.)
  cleaned = cleaned.replace(/(DIAGNOSES:|TESTS & PROCEDURES:|HOSPITAL MEDICATIONS)/g, '\n$1\n');
  
  // Remove excessive newlines (more than 3)
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
  
  // Remove blank ** markers
  cleaned = cleaned.replace(/^\*\*\s*\*\*$/gm, '');
  cleaned = cleaned.replace(/\*\*\s*\*\*/g, '');
  
  // Trim each line
  cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
  
  // Final trim
  cleaned = cleaned.trim();
  
  console.log('[Validator] SUPER AGGRESSIVE clean complete');
  return cleaned;
}

module.exports = {
  validateSummaryQuality,
  deepCleanSummary
};
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
 * Deep clean summary - more aggressive than postProcessSummary
 * @param {string} summary - Summary to clean
 * @returns {string} - Cleaned summary
 */
function deepCleanSummary(summary) {
  console.log('[Validator] Performing deep clean...');
  
  let cleaned = summary;
  
  // REMOVE: Everything before first section header
  const firstSection = cleaned.match(/\*\*PATIENT HISTORY\*\*|\*\*CONDITION WHEN ADMITTED\*\*|\*\*DIAGNOSIS AND TREATMENT/i);
  if (firstSection) {
    const startIndex = cleaned.indexOf(firstSection[0]);
    if (startIndex > 50) {
      console.log('[Validator] Removing garbage before first section');
      cleaned = cleaned.substring(startIndex);
    }
  }
  
  // REMOVE: Duplicate sections (keep only first occurrence)
  const sections = [
    'PATIENT HISTORY',
    'CONDITION WHEN ADMITTED',
    'DIAGNOSIS AND TREATMENT GIVEN',
    'TEST RESULTS',
    'CONDITION AT DISCHARGE',
    'MEDICATIONS TO FOLLOW AFTER DISCHARGE',
    'FOLLOW-UP AND FUTURE CARE',
    'ADDITIONAL INFORMATION'
  ];
  
  for (const section of sections) {
    const regex = new RegExp(`(\\*\\*${section}\\*\\*[\\s\\S]*?)(\\*\\*${section}\\*\\*)`, 'gi');
    let match;
    while ((match = regex.exec(cleaned)) !== null) {
      console.log(`[Validator] Removing duplicate section: ${section}`);
      // Remove the duplicate (second occurrence)
      cleaned = cleaned.substring(0, match.index + match[1].length) + cleaned.substring(match.index + match[0].length);
    }
  }
  
  // REMOVE: "Prepared by" and everything after it
  cleaned = cleaned.replace(/[\s\S]*Prepared by:[\s\S]*/i, '');
  cleaned = cleaned.replace(/[\s\S]*- Prepared by[\s\S]*/i, '');
  
  // REMOVE: Header garbage from diagnoses
  cleaned = cleaned.replace(/DIAGNOSES:\s*-\s*DISCHARGE SUMMARY\s*-\s*\d+\s*Years[\s\S]{0,100}Female\s*/i, 'DIAGNOSES:\n');
  
  // REMOVE: Mashed medications in Note field - extract and format properly
  const mashedMedsMatch = cleaned.match(/Note:\s*(TAB|CAP|INJ)[\s\S]{100,}/i);
  if (mashedMedsMatch) {
    console.log('[Validator] Extracting mashed medications from Note field');
    const mashedText = mashedMedsMatch[0];
    
    // Try to split by medication patterns
    const medPattern = /(TAB|CAP|INJ)\s+([A-Z\s]+)\s+(\d+(?:\.\d+)?(?:MG|GM|ML))\s+([\d\-]+)\s+X\s+(\d+)\s+DAYS/gi;
    let match;
    let extractedMeds = [];
    
    while ((match = medPattern.exec(mashedText)) !== null) {
      const [_, type, name, dose, timing, days] = match;
      extractedMeds.push(`• **${type} ${name.trim()} ${dose}**`);
      extractedMeds.push(`  - Timing: ${timing}`);
      extractedMeds.push(`  - Duration: ${days} days`);
    }
    
    if (extractedMeds.length > 0) {
      // Replace the mashed section with properly formatted medications
      cleaned = cleaned.replace(mashedMedsMatch[0], '\n' + extractedMeds.join('\n'));
    }
  }
  
  // REMOVE: All OCR artifacts
  cleaned = cleaned.replace(/artery walls["\']?>/gi, '');
  cleaned = cleaned.replace(/systemic\s+artery\s+walls["\']?>\s*hypertension/gi, 'high blood pressure');
  cleaned = cleaned.replace(/\(\s*systemic\s+artery\s+walls["\']?>\s*hypertension\s*\)/gi, '(high blood pressure)');
  cleaned = cleaned.replace(/TOMBINU/g, '');
  cleaned = cleaned.replace(/OLD MEDICATIONG/g, '');
  cleaned = cleaned.replace(/www\.[a-z0-9\-]+\.(org|com|in)[^\s]*/gi, '');
  cleaned = cleaned.replace(/KMC\s*No\.?\s*\d{5,}/gi, '');
  cleaned = cleaned.replace(/RMHIP\/\d+/g, '');
  cleaned = cleaned.replace(/MH\d{8}/g, '');
  
  // Clean up whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  
  console.log('[Validator] Deep clean complete');
  return cleaned;
}

module.exports = {
  validateSummaryQuality,
  deepCleanSummary
};

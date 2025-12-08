/**
 * Document Parser - Extracts structured data from discharge summaries
 * 
 * This parser uses SECTION-BASED logic:
 * - Hospital medications = From "Treatment Given", "Brief Course", "Diagnosis and Treatment" sections
 * - Discharge medications = From "Advice", "Advice on Discharge", "Follow Up", "Discharge Instructions" sections
 * 
 * This ensures accuracy regardless of medication type (IV, oral, etc.)
 */

/**
 * Parse a discharge summary and extract structured data
 * @param {string} rawText - The original OCR text
 * @returns {object} - Structured data extracted from the document
 */
function parseDischargeDocument(rawText) {
  console.log('[Parser] Analyzing discharge document structure...');
  
  const parsed = {
    diagnoses: [],
    hospitalMedications: [],
    dischargeMedications: [],
    tests: [],
    patientDetails: {},
    hasStructuredData: false
  };
  
  try {
    // ========================================
    // 1. EXTRACT DIAGNOSES
    // ========================================
    const diagnosisPatterns = [
      /Final Diagnosis[;\s:]*\n([\s\S]*?)(?=History of Present Illness|Brief Course|Procedures|Treatment Given|$)/i,
      /Diagnosis[;\s:]*\n([\s\S]*?)(?=History|Brief Course|Treatment|Procedures|$)/i,
      /Diagnoses[;\s:]*\n([\s\S]*?)(?=History|Brief Course|Treatment|$)/i
    ];
    
    for (const pattern of diagnosisPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        const diagnosisText = match[1].trim();
        const diagnosisLines = diagnosisText.split('\n')
          .map(line => line.trim())
          .filter(line => {
            if (!line) return false;
            if (line.match(/^(Patient Details|Name|IP No|Ward|Registration|Date|Age|Sex|Department|Years|Female|Male)/i)) return false;
            if (line.match(/^\d+\/\d+\/\d+/)) return false;
            if (line.match(/^(Admission|Discharge) Time/i)) return false;
            return true;
          });
        
        if (diagnosisLines.length > 0) {
          parsed.diagnoses = diagnosisLines;
          console.log(`[Parser] ✅ Extracted ${parsed.diagnoses.length} diagnoses from section`);
          break;
        }
      }
    }
    
    // ========================================
    // 2. EXTRACT HOSPITAL MEDICATIONS
    // From: "Treatment Given", "Brief Course of Admission", "During Hospital Stay"
    // ========================================
    const hospitalSectionPatterns = [
      /(?:Treatment Given|Brief Course of Admission|During Hospital Stay|Course in Hospital)[:\s]*\n([\s\S]*?)(?=Condition at Discharge|Advice|Follow Up|Discharge Instructions|$)/i,
      /(?:Brief Course)[:\s]*\n([\s\S]*?)(?=Condition at Discharge|Advice|Follow Up|$)/i
    ];
    
    for (const pattern of hospitalSectionPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        const sectionText = match[1];
        console.log('[Parser] ✅ Found hospital treatment section');
        
        // Extract medications mentioned in this section
        parsed.hospitalMedications = extractMedicationsFromText(sectionText, 'hospital');
        console.log(`[Parser] Extracted ${parsed.hospitalMedications.length} hospital medications`);
        break;
      }
    }
    
    // ========================================
    // 3. EXTRACT DISCHARGE MEDICATIONS
    // From: "Advice", "Advice on Discharge", "Follow Up", "Discharge Instructions"
    // ========================================
    const dischargeSectionPatterns = [
      /(?:Advice on Discharge|Discharge Advice|Discharge Instructions)[:\s]*\n([\s\S]*?)(?=Follow Up|Related Emergency|NOTE|Dr\.|Prepared By|Conslt\.|Junior Resident|Signature|$)/i,
      /(?:Advice)[:\s]*\n([\s\S]*?)(?=Follow Up|Related Emergency|NOTE|Dr\.|Prepared By|Conslt\.|Junior Resident|Signature|$)/i,
      /(?:Medications to Continue|Discharge Medications)[:\s]*\n([\s\S]*?)(?=Follow Up|Related Emergency|NOTE|$)/i
    ];
    
    for (const pattern of dischargeSectionPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        const sectionText = match[1].trim();
        console.log('[Parser] ✅ Found discharge advice section');
        console.log('[Parser] Section preview:', sectionText.substring(0, 300));
        
        // Extract medications from this section
        parsed.dischargeMedications = extractMedicationsFromText(sectionText, 'discharge');
        console.log(`[Parser] Extracted ${parsed.dischargeMedications.length} discharge medications`);
        break;
      }
    }
    
    // ========================================
    // 4. EXTRACT TEST RESULTS
    // ========================================
    const testSectionPatterns = [
      /(?:Brief Course of Admission|Treatment Given|Investigations)[:\s]*\n([\s\S]*?)(?=Condition at Discharge|Advice|$)/i,
      /(?:Test Results|Investigation Results)[:\s]*\n([\s\S]*?)(?=Condition at Discharge|Advice|$)/i
    ];
    
    for (const pattern of testSectionPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        const testText = match[1];
        
        // Extract individual test patterns
        const hbMatch = testText.match(/Hb\s*-?\s*[\d.]+/i);
        if (hbMatch) parsed.tests.push(hbMatch[0].trim());
        
        const tcMatch = testText.match(/Tc\s*-?\s*[\d.]+/i);
        if (tcMatch) parsed.tests.push(tcMatch[0].trim());
        
        const pltMatch = testText.match(/plt\s*-?\s*[\d.]+[A-Z]*/i);
        if (pltMatch) parsed.tests.push(pltMatch[0].trim());
        
        const echoMatch = testText.match(/2D\s*ECHO[^.]*?(?:MMHG|mmhg)/i);
        if (echoMatch) parsed.tests.push(echoMatch[0].trim());
        
        const fluMatch = testText.match(/COV[I\s]*FLU\s*PANEL[^.]*?(?:POSITIVE|NEGATIVE)/i);
        if (fluMatch) parsed.tests.push(fluMatch[0].trim());
        
        const walkMatch = testText.match(/6\s*M[W]*T[^.]*?\d+%/i);
        if (walkMatch) parsed.tests.push(walkMatch[0].trim());
        
        if (parsed.tests.length > 0) {
          console.log(`[Parser] ✅ Extracted ${parsed.tests.length} test results`);
          break;
        }
      }
    }
    
    // Mark as having structured data if we found anything
    parsed.hasStructuredData = parsed.diagnoses.length > 0 || 
                                parsed.hospitalMedications.length > 0 || 
                                parsed.dischargeMedications.length > 0;
    
    console.log(`[Parser] Final count: ${parsed.diagnoses.length} diagnoses, ${parsed.hospitalMedications.length} hospital meds, ${parsed.dischargeMedications.length} discharge meds`);
    console.log(`[Parser] Structured data extraction: ${parsed.hasStructuredData ? '✅ SUCCESS' : '❌ FAILED'}`);
    
  } catch (error) {
    console.error('[Parser] ❌ Error during parsing:', error);
  }
  
  return parsed;
}

/**
 * Extract medications from a section of text
 * @param {string} text - The text to extract from
 * @param {string} type - 'hospital' or 'discharge' for logging
 * @returns {array} - Array of medication strings
 */
function extractMedicationsFromText(text, type = 'unknown') {
  const medications = [];
  
  // Split into lines
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    
    // Check if this is a medication line
    const isMedLine = 
      line.match(/\b(HOME|TAB|CAP|INJ|SYR|SUSP|TABLET|CAPSULE|INJECTION|SYRUP)\b/i) || 
      line.match(/^\d+[\.\)]\s*(TAB|CAP|INJ|HOME)/) || // Numbered lists: "1. TAB...", "1) TAB..."
      line.match(/\d+-\d+-\d+/) || // Dosage timing
      line.match(/X\s*\d+\s*DAYS/i) || // Duration
      line.match(/OXYGEN/i) || // Oxygen therapy
      line.match(/NEBULI[SZ]ATION/i) || // Nebulization
      line.match(/\d+\s*(MG|GM|ML|MCG|LT\/MIN)\b/i); // Dosage units
    
    // Skip non-medication lines
    const isNonMedLine = 
      line.match(/^(CONTINUE|FOLLOW|REVIEW|AVOID|DIET|EXERCISE|LIFESTYLE|PLEASE|KINDLY|NOTE)/i) ||
      line.match(/^(Monitor|Check|Measure|Record)/i) ||
      line.match(/^-+$/) || // Separator lines
      line.match(/^Follow.*up/i) ||
      line.match(/Emergency/i) ||
      line.length < 5; // Too short
    
    if (isMedLine && !isNonMedLine) {
      let medEntry = line;
      
      // Remove leading numbering if present: "1. TAB..." -> "TAB..."
      medEntry = medEntry.replace(/^\d+[\.\)]\s*/, '');
      
      // Check for continuation lines
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        
        // Check if next line is a continuation
        const isContinuation = 
          nextLine.match(/^\s*(FOLLOWED BY|AND STOP|THEN|WITH|FOR|VIA|TO BE|AS|CONTINUE)/i) ||
          // If current line has "FOLLOWED BY", next line with TAB/CAP is part of it
          (nextLine.match(/^\s*(TAB|CAP|INJ)/i) && medEntry.match(/FOLLOWED BY/i)) ||
          // Multi-line dosage instructions
          (nextLine.match(/^\s*(FOR|VIA|WITH|TO)/) && !nextLine.match(/^(FOLLOW UP|FOR REVIEW)/i));
        
        if (isContinuation) {
          medEntry += ' ' + nextLine.trim();
          j++;
        } else {
          break;
        }
      }
      
      medications.push(medEntry);
      console.log(`[Parser] [${type}] Extracted: "${medEntry.substring(0, 80)}${medEntry.length > 80 ? '...' : ''}"`);
      i = j; // Skip the lines we merged
    } else {
      i++;
    }
  }
  
  return medications;
}

/**
 * Format medication for display with proper 1-0-1 format explanation
 */
function formatMedication(medText) {
  // Special handling for HOME OXYGEN
  if (medText.match(/HOME OXYGEN|OXYGEN SUPPORT|OXYGEN THERAPY/i)) {
    const details = medText.replace(/^(HOME\s+)?OXYGEN\s+(SUPPORT|THERAPY)\s*/i, '').trim();
    return `• **HOME OXYGEN SUPPORT**\n  - ${details || 'As prescribed'}\n`;
  }
  
  // Special handling for NEBULIZATION
  if (medText.match(/NEBULI[SZ]ATION/i)) {
    return `• **Nebulization**\n  - ${medText.replace(/NEBULI[SZ]ATION/i, '').trim() || 'As prescribed'}\n`;
  }
  
  // Extract components - more flexible regex
  const medMatch = medText.match(/^(TAB|CAP|INJ|SYR|SUSP|TABLET|CAPSULE|INJECTION|SYRUP)\s+([A-Z0-9\s]+?)(?:\s+(\d+(?:\.?\d+)?\s*(?:MG|ML|GM|MCG|G|%)))?(?:\s+(\d+-\d+-\d+))?(?:\s+X\s*(\d+)\s*(?:DAYS?|DAY|WKS?|WEEKS?|MONTHS?))?(?:\s+(.*?))?$/i);
  
  if (!medMatch) {
    // Return as-is if we can't parse, but formatted nicely
    return `• ${medText}\n`;
  }
  
  const [, type, name, dosage, timing, duration, extra] = medMatch;
  
  let formatted = `• **${type.toUpperCase()} ${name.trim()}`;
  if (dosage) {
    formatted += ` ${dosage.toUpperCase()}**`;
  } else {
    formatted += '**';
  }
  
  formatted += '\n';
  
  // Add timing with explanation
  if (timing) {
    const parts = timing.split('-');
    if (parts.length === 3) {
      const [morning, afternoon, night] = parts.map(Number);
      let explanation = '';
      
      if (morning > 0 && afternoon === 0 && night === 0) {
        explanation = `take ${morning} tablet${morning > 1 ? 's' : ''} in the morning`;
      } else if (morning === 0 && afternoon === 0 && night > 0) {
        explanation = `take ${night} tablet${night > 1 ? 's' : ''} at night`;
      } else if (morning > 0 && afternoon === 0 && night > 0) {
        explanation = `take ${morning} tablet${morning > 1 ? 's' : ''} in the morning and ${night} tablet${night > 1 ? 's' : ''} at night`;
      } else if (morning > 0 && afternoon > 0 && night > 0) {
        if (morning === afternoon && afternoon === night) {
          explanation = `take ${morning} tablet${morning > 1 ? 's' : ''} three times a day (morning, afternoon, and night)`;
        } else {
          explanation = `take ${morning} in morning, ${afternoon} in afternoon, ${night} at night`;
        }
      } else if (morning === 0 && afternoon > 0 && night === 0) {
        explanation = `take ${afternoon} tablet${afternoon > 1 ? 's' : ''} in the afternoon`;
      } else if (morning === 0 && afternoon > 0 && night > 0) {
        explanation = `take ${afternoon} tablet${afternoon > 1 ? 's' : ''} in the afternoon and ${night} tablet${night > 1 ? 's' : ''} at night`;
      } else if (morning > 0 && afternoon > 0 && night === 0) {
        explanation = `take ${morning} tablet${morning > 1 ? 's' : ''} in the morning and ${afternoon} tablet${afternoon > 1 ? 's' : ''} in the afternoon`;
      }
      
      formatted += `  - Timing: **${timing}** (${explanation})\n`;
    }
  }
  
  // Add duration
  if (duration) {
    formatted += `  - Duration: **${duration} days**`;
    if (extra && extra.match(/AND STOP/i)) {
      formatted += ', then **STOP completely**';
    }
    formatted += '\n';
  }
  
  // Add extra info (FOLLOWED BY, etc.)
  if (extra) {
    if (extra.match(/FOLLOWED BY/i)) {
      formatted += `  - **Note:** ${extra.trim()}\n`;
    } else if (!extra.match(/AND STOP/i)) {
      // Other extra info that wasn't already included
      formatted += `  - ${extra.trim()}\n`;
    }
  }
  
  return formatted;
}

/**
 * Format hospital medication (simpler format, just description)
 */
function formatHospitalMedication(medText) {
  // Clean up the text
  let cleaned = medText.trim();
  
  // If it's already formatted nicely, return as-is
  if (cleaned.match(/^(INJ|TAB|CAP|SYR|NEBULI)/i)) {
    return `- ${cleaned}`;
  }
  
  return `- ${cleaned}`;
}

/**
 * Merge parsed data with AI-generated summary
 * @param {string} aiSummary - The summary from Mistral
 * @param {object} parsedData - The structured data from parser
 * @returns {string} - Enhanced summary with accurate structured data
 */
function mergeWithAISummary(aiSummary, parsedData) {
  console.log('[Parser] Merging parsed data with AI summary...');
  
  // If no structured data was extracted, return AI summary as-is
  if (!parsedData.hasStructuredData) {
    console.log('[Parser] No structured data to merge, using AI summary as-is');
    return aiSummary;
  }
  
  let result = '';
  
  // Extract sections from AI summary (preserve AI's narrative for these)
  const patientHistoryMatch = aiSummary.match(/\*\*PATIENT HISTORY\*\*([\s\S]*?)(?=\*\*CONDITION WHEN ADMITTED\*\*|$)/i);
  const conditionAdmittedMatch = aiSummary.match(/\*\*CONDITION WHEN ADMITTED\*\*([\s\S]*?)(?=\*\*DIAGNOSIS|$)/i);
  const conditionDischargeMatch = aiSummary.match(/\*\*CONDITION AT DISCHARGE\*\*([\s\S]*?)(?=\*\*MEDICATIONS|$)/i);
  const followUpMatch = aiSummary.match(/\*\*FOLLOW-UP AND FUTURE CARE\*\*([\s\S]*?)(?=\*\*ADDITIONAL|$)/i);
  const additionalMatch = aiSummary.match(/\*\*ADDITIONAL INFORMATION\*\*([\s\S]*?)(?=\*\*FINAL CHECKLIST|$)/i);
  
  // ========================================
  // PATIENT HISTORY (from AI)
  // ========================================
  if (patientHistoryMatch) {
    result += '**PATIENT HISTORY**' + patientHistoryMatch[1].trim() + '\n\n';
  }
  
  // ========================================
  // CONDITION WHEN ADMITTED (from AI)
  // ========================================
  if (conditionAdmittedMatch) {
    result += '**CONDITION WHEN ADMITTED**' + conditionAdmittedMatch[1].trim() + '\n\n';
  }
  
  // ========================================
  // DIAGNOSIS AND TREATMENT GIVEN (from PARSED DATA)
  // ========================================
  result += '**DIAGNOSIS AND TREATMENT GIVEN**\n\n';
  
  if (parsedData.diagnoses.length > 0) {
    result += 'DIAGNOSES:\n';
    parsedData.diagnoses.forEach(diag => {
      result += `- ${diag}\n`;
    });
    result += '\n';
  }
  
  if (parsedData.tests.length > 0) {
    result += 'TESTS & PROCEDURES:\n';
    parsedData.tests.forEach(test => {
      result += `- ${test}\n`;
    });
    result += '\n';
  }
  
  if (parsedData.hospitalMedications.length > 0) {
    result += 'HOSPITAL MEDICATIONS (Given During Stay):\n';
    parsedData.hospitalMedications.forEach(med => {
      result += `${formatHospitalMedication(med)}\n`;
    });
    result += '\n';
  }
  
  // ========================================
  // CONDITION AT DISCHARGE (from AI)
  // ========================================
  if (conditionDischargeMatch) {
    result += '**CONDITION AT DISCHARGE**' + conditionDischargeMatch[1].trim() + '\n\n';
  }
  
  // ========================================
  // MEDICATIONS TO FOLLOW AFTER DISCHARGE (from PARSED DATA)
  // ========================================
  result += '**MEDICATIONS TO FOLLOW AFTER DISCHARGE**\n\n';
  
  if (parsedData.dischargeMedications.length > 0) {
    parsedData.dischargeMedications.forEach(med => {
      result += `${formatMedication(med)}\n`;
    });
  } else {
    result += 'No specific medications prescribed for home use.\n';
  }
  
  result += '\n';
  
  // ========================================
  // FOLLOW-UP AND FUTURE CARE (from AI)
  // ========================================
  if (followUpMatch) {
    result += '**FOLLOW-UP AND FUTURE CARE**' + followUpMatch[1].trim() + '\n\n';
  }
  
  // ========================================
  // ADDITIONAL INFORMATION (from AI)
  // ========================================
  if (additionalMatch) {
    result += '**ADDITIONAL INFORMATION**' + additionalMatch[1].trim();
  }
  
  console.log('[Parser] ✅ Merge complete');
  return result.trim();
}

module.exports = {
  parseDischargeDocument,
  mergeWithAISummary
};

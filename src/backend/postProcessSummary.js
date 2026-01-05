/**
 * Post-Processing Service for Medical Summaries
 * 
 * Fixes structural issues in Mistral output by reorganizing sections
 * to ensure correct placement of hospital vs discharge medications.
 */

/**
 * Post-processes and restructures the summary to fix common Mistral mistakes
 * @param {string} rawSummary - The raw summary from Mistral
 * @returns {string} - Properly structured summary
 */
function postProcessSummary(rawSummary) {
  console.log('[PostProcess] Starting summary restructuring...');
  
  try {
    // 🔧 CRITICAL FIX: Clean OCR artifacts FIRST
    let cleanedSummary = cleanOCRArtifacts(rawSummary);
    
    // 🔧 FIX: Detect if Mistral cut off mid-response (incomplete medications)
    cleanedSummary = fixIncompleteMedications(cleanedSummary);
    
    // Parse the summary into sections
    const sections = parseSections(cleanedSummary);
    
    // Detect and categorize all content
    const categorized = categorizeSectionContent(sections);
    
    // Reconstruct the summary with correct structure
    const restructured = reconstructSummary(categorized);
    
    console.log('[PostProcess] ✅ Summary restructured successfully');
    return restructured;
    
  } catch (error) {
    console.error('[PostProcess] Error during post-processing:', error);
    // Return original if post-processing fails
    return rawSummary;
  }
}

/**
 * Clean OCR artifacts and malformed text
 */
function cleanOCRArtifacts(summary) {
  console.log('[PostProcess] Cleaning OCR artifacts...');
  
  let cleaned = summary;
  
  // Remove HTML-like artifacts (MORE AGGRESSIVE)
  cleaned = cleaned.replace(/artery walls\">/g, '');
  cleaned = cleaned.replace(/artery\s+walls\s*["\']?\s*>/g, '');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned.replace(/["\'][^"\']*>/g, '');
  
  // Remove "systemic artery walls">HYPERTENSION" pattern specifically
  cleaned = cleaned.replace(/systemic\s+artery\s+walls["\']?>\s*/gi, 'systemic ');
  cleaned = cleaned.replace(/\(\s*systemic\s+artery\s+walls["\']?>\s*hypertension\s*\)/gi, '(high blood pressure)');
  
  // Remove website URLs and OCR garbage at end of lines
  cleaned = cleaned.replace(/www\.[a-z0-9\-]+\.(org|com|in)[^\s]*/gi, '');
  cleaned = cleaned.replace(/[A-Z0-9]{10,}/g, ''); // Long alphanumeric strings
  
  // Remove pipes and OCR artifacts
  cleaned = cleaned.replace(/\s*\|\s*/g, ' ');
  cleaned = cleaned.replace(/\s{2,}/g, ' '); // Multiple spaces to single space
  
  // Fix common OCR mistakes
  cleaned = cleaned.replace(/TOMBINU/g, '');
  cleaned = cleaned.replace(/OLD MEDICATIONG/g, '');
  cleaned = cleaned.replace(/MH\d{8}/g, ''); // Medical record numbers
  cleaned = cleaned.replace(/KMC\s*No\.?\s*\d{5,}/gi, ''); // Doctor registration numbers
  cleaned = cleaned.replace(/RMHIP\/\d+/g, '');
  cleaned = cleaned.replace(/AdMG\/[\d\.]+/g, '');
  
  // Remove "Prepared By:", "Sinus rhythm", ECG artifacts at end
  cleaned = cleaned.replace(/\*\*Prepared By:\*\*[\s\S]*$/i, '');
  cleaned = cleaned.replace(/- Prepared By:[\s\S]*$/i, '');
  cleaned = cleaned.replace(/- Sinus rhythm[\s\S]*$/i, '');
  cleaned = cleaned.replace(/Abnormal R-wave[\s\S]*$/i, '');
  
  // Remove trailing numbers and dates at end (OCR artifacts)
  cleaned = cleaned.replace(/\d{2}\/\d{2}\/\d{4}\s*&\s*[\d:]+[AP]M\s*$/gm, '');
  
  // Remove duplicate section headers if they appear
  cleaned = cleaned.replace(/(\*\*DIAGNOSIS AND TREATMENT GIVEN\*\*[\s\S]*?)\*\*DIAGNOSIS AND TREATMENT GIVEN\*\*/i, '$1');
  cleaned = cleaned.replace(/(\*\*MEDICATIONS TO FOLLOW AFTER DISCHARGE\*\*[\s\S]*?)\*\*MEDICATIONS TO FOLLOW AFTER DISCHARGE\*\*/i, '$1');
  
  return cleaned.trim();
}

/**
 * Fix incomplete medication sections (when Mistral cuts off mid-response)
 */
function fixIncompleteMedications(summary) {
  console.log('[PostProcess] Checking for incomplete medications...');
  
  // Detect incomplete medication entries
  // Pattern: medication line ends mid-sentence or has all remaining meds mashed together in one line
  const lines = summary.split('\n');
  const fixedLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if this is a medication line with **TAB/CAP** followed by ALL remaining medications
    if (trimmed.match(/\*\*TAB |CAP /i) && trimmed.length > 300) {
      console.log('[PostProcess] ⚠️  Found overly long medication line, attempting to split...');
      
      // Try to split by medication names (TAB, CAP, INJ)
      const splitMeds = trimmed.split(/(\*\*(?:TAB|CAP|INJ)\s+[^\*]+)/i).filter(s => s.trim());
      
      // Add each medication as a separate line
      splitMeds.forEach(med => {
        if (med.trim()) {
          fixedLines.push(med.trim());
        }
      });
    } else if (trimmed.includes('Note:') && trimmed.length > 200) {
      // If "Note:" field contains mashed medications, split them out
      console.log('[PostProcess] ⚠️  Found medications mashed in Note field...');
      
      const parts = trimmed.split('Note:');
      fixedLines.push(parts[0].trim()); // Add the part before "Note:"
      
      // The Note content likely has medications
      if (parts[1]) {
        const notePart = parts[1].trim();
        // Try to extract individual medications
        const meds = notePart.split(/(\s+TAB\s+|\s+CAP\s+)/i);
        meds.forEach((med, idx) => {
          if (med.trim() && !med.match(/^\s*(TAB|CAP)\s*$/i)) {
            fixedLines.push(`• **${med.trim()}`);
          }
        });
      }
    } else {
      fixedLines.push(line);
    }
  }
  
  return fixedLines.join('\n');
}

/**
 * Parse the summary into sections
 */
function parseSections(summary) {
  const sections = {
    patientHistory: '',
    conditionWhenAdmitted: '',
    diagnosisAndTreatment: '',
    testResults: '',
    conditionAtDischarge: '',
    medicationsToFollow: '',
    followUpCare: '',
    additionalInfo: ''
  };
  
  // Split by section headers
  const lines = summary.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (let line of lines) {
    const trimmed = line.trim();
    
    // Detect section headers
    if (trimmed.match(/^\*\*PATIENT HISTORY\*\*/i)) {
      if (currentSection) sections[currentSection] = currentContent.join('\n');
      currentSection = 'patientHistory';
      currentContent = [line];
    } else if (trimmed.match(/^\*\*CONDITION WHEN ADMITTED\*\*/i)) {
      if (currentSection) sections[currentSection] = currentContent.join('\n');
      currentSection = 'conditionWhenAdmitted';
      currentContent = [line];
    } else if (trimmed.match(/^\*\*DIAGNOSIS AND TREATMENT GIVEN\*\*/i)) {
      if (currentSection) sections[currentSection] = currentContent.join('\n');
      currentSection = 'diagnosisAndTreatment';
      currentContent = [line];
    } else if (trimmed.match(/^\*\*TEST RESULTS\*\*/i)) {
      if (currentSection) sections[currentSection] = currentContent.join('\n');
      currentSection = 'testResults';
      currentContent = [line];
    } else if (trimmed.match(/^\*\*CONDITION AT DISCHARGE\*\*/i)) {
      if (currentSection) sections[currentSection] = currentContent.join('\n');
      currentSection = 'conditionAtDischarge';
      currentContent = [line];
    } else if (trimmed.match(/^\*\*MEDICATIONS TO FOLLOW AFTER DISCHARGE\*\*/i)) {
      if (currentSection) sections[currentSection] = currentContent.join('\n');
      currentSection = 'medicationsToFollow';
      currentContent = [line];
    } else if (trimmed.match(/^\*\*FOLLOW-UP AND FUTURE CARE\*\*/i)) {
      if (currentSection) sections[currentSection] = currentContent.join('\n');
      currentSection = 'followUpCare';
      currentContent = [line];
    } else if (trimmed.match(/^\*\*ADDITIONAL INFORMATION\*\*/i)) {
      if (currentSection) sections[currentSection] = currentContent.join('\n');
      currentSection = 'additionalInfo';
      currentContent = [line];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }
  
  // Save last section
  if (currentSection) {
    sections[currentSection] = currentContent.join('\n');
  }
  
  return sections;
}

/**
 * Categorize all content from sections
 */
function categorizeSectionContent(sections) {
  console.log('[PostProcess] Categorizing content...');
  
  const categorized = {
    patientHistory: sections.patientHistory,
    conditionWhenAdmitted: sections.conditionWhenAdmitted,
    diagnoses: [],
    testsAndProcedures: [],
    hospitalMedications: [],
    dischargeMedications: [],
    conditionAtDischarge: sections.conditionAtDischarge,
    followUpCare: sections.followUpCare,
    additionalInfo: sections.additionalInfo
  };
  
  // Parse "DIAGNOSIS AND TREATMENT GIVEN" section
  if (sections.diagnosisAndTreatment) {
    const lines = sections.diagnosisAndTreatment.split('\n');
    let inSubsection = null;
    
    for (let line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and main header
      if (!trimmed || trimmed.match(/^\*\*DIAGNOSIS AND TREATMENT GIVEN\*\*/i)) {
        continue;
      }
      
      // Detect subsections
      if (trimmed.match(/^DIAGNOSES:/i)) {
        inSubsection = 'diagnoses';
        continue;
      } else if (trimmed.match(/^TESTS.*PROCEDURES:/i)) {
        inSubsection = 'tests';
        continue;
      } else if (trimmed.match(/^HOSPITAL MEDICATIONS/i)) {
        inSubsection = 'hospitalMeds';
        continue;
      }
      
      // Categorize each line based on content
      const category = detectLineCategory(trimmed);
      
      if (category === 'medication') {
        // Further categorize as hospital or discharge
        if (isHospitalMedication(trimmed)) {
          categorized.hospitalMedications.push(line);
        } else {
          categorized.dischargeMedications.push(line);
        }
      } else if (category === 'test') {
        categorized.testsAndProcedures.push(line);
      } else if (category === 'diagnosis') {
        categorized.diagnoses.push(line);
      } else {
        // Default routing based on subsection
        if (inSubsection === 'diagnoses') {
          categorized.diagnoses.push(line);
        } else if (inSubsection === 'tests') {
          // Still need to check if it's actually a medication
          if (detectLineCategory(trimmed) === 'medication') {
            if (isHospitalMedication(trimmed)) {
              categorized.hospitalMedications.push(line);
            } else {
              categorized.dischargeMedications.push(line);
            }
          } else {
            categorized.testsAndProcedures.push(line);
          }
        } else if (inSubsection === 'hospitalMeds') {
          categorized.hospitalMedications.push(line);
        }
      }
    }
  }
  
  // Parse "TEST RESULTS" section (sometimes meds are here)
  if (sections.testResults) {
    const lines = sections.testResults.split('\n');
    const realTests = [];
    
    for (let line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.match(/^\*\*TEST RESULTS\*\*/i)) {
        continue;
      }
      
      const category = detectLineCategory(trimmed);
      
      if (category === 'medication') {
        if (isHospitalMedication(trimmed)) {
          categorized.hospitalMedications.push(line);
        } else {
          categorized.dischargeMedications.push(line);
        }
      } else {
        realTests.push(line);
      }
    }
    
    // Update test results to only contain actual tests
    if (realTests.length > 0) {
      categorized.testResults = realTests;
    }
  }
  
  // Parse "MEDICATIONS TO FOLLOW AFTER DISCHARGE" section
  if (sections.medicationsToFollow) {
    const lines = sections.medicationsToFollow.split('\n');
    
    for (let line of lines) {
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.match(/^\*\*MEDICATIONS TO FOLLOW/i)) {
        continue;
      }
      
      // Check if it's actually a hospital medication
      if (isHospitalMedication(trimmed)) {
        categorized.hospitalMedications.push(line);
      } else {
        categorized.dischargeMedications.push(line);
      }
    }
  }
  
  // Remove duplicates
  categorized.diagnoses = [...new Set(categorized.diagnoses)];
  categorized.testsAndProcedures = [...new Set(categorized.testsAndProcedures)];
  categorized.hospitalMedications = [...new Set(categorized.hospitalMedications)];
  categorized.dischargeMedications = [...new Set(categorized.dischargeMedications)];
  
  console.log('[PostProcess] Categorized:', {
    diagnoses: categorized.diagnoses.length,
    tests: categorized.testsAndProcedures.length,
    hospitalMeds: categorized.hospitalMedications.length,
    dischargeMeds: categorized.dischargeMedications.length
  });
  
  return categorized;
}

/**
 * Detect what category a line belongs to
 */
function detectLineCategory(line) {
  const lower = line.toLowerCase();
  
  // Medication indicators (must come first to catch "TAB", "CAP", etc.)
  const medKeywords = [
    'tab ', 'tablet', 'cap ', 'capsule', 'syrup', 'susp ', 'suspension',
    'inj ', 'injection', 'iv ', 'intravenous', 'nebul', 'inhaler',
    'mg', 'ml', 'mcg', 'gm', 'gram',
    '1-0-1', '1-0-0', '0-0-1', '2-0-2', '0-1-0',
    'once daily', 'twice daily', 'three times', 'od', 'bd', 'tid', 'qid',
    'before food', 'after food', 'with food'
  ];
  
  // Test/procedure indicators
  const testKeywords = [
    'hb', 'hemoglobin', 'wbc', 'rbc', 'platelet', 'plt',
    'echo', 'ecg', 'x-ray', 'mri', 'ct scan', 'ultrasound',
    'blood test', 'urine test', 'culture', 'panel',
    'normal', 'abnormal', 'positive', 'negative',
    'ejection fraction', 'ef', 'saturation',
    '6 minute walk', '6mwt'
  ];
  
  // Diagnosis indicators
  const diagnosisKeywords = [
    'acute', 'chronic', 'exacerbation', 'failure',
    'diabetes', 'hypertension', 'copd', 'asthma',
    'type 1', 'type 2', 'grade', 'stage'
  ];
  
  // Check medications FIRST (highest priority)
  for (let keyword of medKeywords) {
    if (lower.includes(keyword)) {
      return 'medication';
    }
  }
  
  // Check tests
  for (let keyword of testKeywords) {
    if (lower.includes(keyword)) {
      return 'test';
    }
  }
  
  // Check diagnosis
  for (let keyword of diagnosisKeywords) {
    if (lower.includes(keyword)) {
      return 'diagnosis';
    }
  }
  
  // Default: if starts with "- " and contains ":", likely a test
  if (line.match(/^-\s+.*:/)) {
    return 'test';
  }
  
  return 'unknown';
}

/**
 * Check if a medication is a hospital medication (IV, injection, etc.)
 */
function isHospitalMedication(line) {
  const lower = line.toLowerCase();
  
  // Hospital medication keywords
  const hospitalKeywords = [
    'inj ', 'injection',
    ' iv ', 'i.v.', 'intravenous',
    'nebul', 'nebulizer', 'nebulisation',
    'infusion', 'drip',
    'qid', 'q4h', 'q6h', 'q8h', // hospital frequency patterns
    'stat', 'emergency'
  ];
  
  for (let keyword of hospitalKeywords) {
    if (lower.includes(keyword)) {
      return true;
    }
  }
  
  // Check if it starts with "INJ" or "IV"
  if (lower.match(/^-?\s*\*?\*?(inj|iv)\s/)) {
    return true;
  }
  
  return false;
}

/**
 * Reconstruct the summary with proper section order
 */
function reconstructSummary(categorized) {
  const parts = [];
  
  // Patient History
  if (categorized.patientHistory && categorized.patientHistory.trim()) {
    parts.push(categorized.patientHistory.trim());
  }
  
  // Condition When Admitted
  if (categorized.conditionWhenAdmitted && categorized.conditionWhenAdmitted.trim()) {
    parts.push(categorized.conditionWhenAdmitted.trim());
  }
  
  // Diagnosis and Treatment Given
  let diagnosisSectionParts = [];
  diagnosisSectionParts.push('**DIAGNOSIS AND TREATMENT GIVEN**');
  diagnosisSectionParts.push('');
  
  if (categorized.diagnoses.length > 0) {
    diagnosisSectionParts.push('DIAGNOSES:');
    diagnosisSectionParts.push(...categorized.diagnoses);
    diagnosisSectionParts.push('');
  }
  
  if (categorized.testsAndProcedures.length > 0) {
    diagnosisSectionParts.push('TESTS & PROCEDURES:');
    diagnosisSectionParts.push(...categorized.testsAndProcedures);
    diagnosisSectionParts.push('');
  }
  
  if (categorized.hospitalMedications.length > 0) {
    diagnosisSectionParts.push('HOSPITAL MEDICATIONS (Given During Stay):');
    diagnosisSectionParts.push(...categorized.hospitalMedications);
  }
  
  parts.push(diagnosisSectionParts.join('\n').trim());
  
  // Test Results (if separate from Diagnosis section)
  if (categorized.testResults && categorized.testResults.length > 0) {
    let testResultsParts = [];
    testResultsParts.push('**TEST RESULTS**');
    testResultsParts.push('');
    testResultsParts.push(...categorized.testResults);
    parts.push(testResultsParts.join('\n').trim());
  }
  
  // Condition At Discharge
  if (categorized.conditionAtDischarge && categorized.conditionAtDischarge.trim()) {
    parts.push(categorized.conditionAtDischarge.trim());
  }
  
  // Medications to Follow After Discharge - ALWAYS include if we have any
  if (categorized.dischargeMedications.length > 0) {
    let medsParts = [];
    medsParts.push('**MEDICATIONS TO FOLLOW AFTER DISCHARGE**');
    medsParts.push('');
    medsParts.push(...categorized.dischargeMedications);
    parts.push(medsParts.join('\n').trim());
  } else {
    // If no discharge medications found, check if section exists in original
    if (categorized.medicationsToFollow && categorized.medicationsToFollow.trim()) {
      parts.push(categorized.medicationsToFollow.trim());
    }
  }
  
  // Follow-Up Care
  if (categorized.followUpCare && categorized.followUpCare.trim()) {
    parts.push(categorized.followUpCare.trim());
  }
  
  // Additional Information
  if (categorized.additionalInfo && categorized.additionalInfo.trim()) {
    parts.push(categorized.additionalInfo.trim());
  }
  
  return parts.join('\n\n');
}

module.exports = {
  postProcessSummary
};
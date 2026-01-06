/**
 * IMPROVED Prompt Templates for Mistral Model
 * 
 * Simplified, more commanding prompts that Mistral actually follows
 */

function getSummarizationPrompt(extractedText, isChunk = false) {
  if (isChunk) {
    return `Simplify this medical text into plain language:\n\n${extractedText}`;
  }

  // Ultra-simplified, commanding prompt with strict exclusions
  return `You are a medical document simplifier. Convert this discharge summary into simple, patient-friendly language.

═══════════════════════════════════════════════════════════════════

🔴 CRITICAL RULES - DO NOT BREAK THESE:

1. EXCLUDE HEADER GARBAGE - Do NOT include:
   - "DISCHARGE SUMMARY" as a diagnosis
   - Age/gender info like "76 Years", "Months / Female" in diagnoses
   - Patient IDs, MRN numbers, hospital codes
   - Website URLs (www.ramaiah.org, etc.)
   - Doctor signatures or "Prepared by" sections
   - OCR artifacts like "artery walls">", "TOMBINU", "KMC No"

2. CLEAN MALFORMED TEXT - Fix these patterns:
   - "systemic artery walls">hypertension" → "high blood pressure"
   - "artery walls">hypertension" → "high blood pressure"
   - Any text with ">" symbols → remove or fix
   - Medical abbreviations in diagnoses → expand them

3. SIMPLIFY MEDICAL TERMS - Use plain language:
   - "Hypertension" → "High blood pressure"
   - "Dyspnea" → "Difficulty breathing"
   - "OAD" → "Obstructive airway disease (lung condition)"
   - "H1N1 Influenza A" → "Flu (H1N1 strain)"
   - "Type 1 Respiratory Failure" → "Severe breathing problems requiring oxygen"
   - "LVSF", "EF", "RWMA", "LVDD", "PASP" → Explain in simple terms
   - "Hemodynamically stable" → "Stable vital signs (blood pressure and heart rate normal)"

4. FORMAT TESTS PROPERLY - Explain what they mean:
   - "Hb: 14.1" → "Hemoglobin: 14.1 g/dL (measures oxygen-carrying capacity, normal range)"
   - "2D ECHO" → "Heart ultrasound"
   - "6MWT" → "6-minute walk test"

5. SEPARATE HOSPITAL vs HOME MEDICATIONS:
   - Hospital medications = Given DURING hospital stay (IV drugs, injections)
   - Home medications = To take AFTER discharge (tablets, capsules)
   - NEVER mix these two sections

6. EACH MEDICATION ON SEPARATE LINE - Use this EXACT format:

• **TAB [NAME] [DOSE]**
  - Timing: [X-X-X] (explain what this means)
  - Duration: [X days]
  - Purpose: [Why taking this in simple words]

7. NO MASHED MEDICATIONS - NEVER write:
   ❌ "Note: TAB PREDMET 8MG 1-0-0 X 2 DAYS TAB DOXOPHYLLINE 200MG..."
   ❌ Multiple medications in one bullet
   ❌ Medications in a "Note:" field

═══════════════════════════════════════════════════════════════════

📋 OUTPUT FORMAT (use these exact headings with blank line after each section):

**PATIENT HISTORY**
- Previous medical conditions in simple words
- Example: "Previously diagnosed with asthma and high blood pressure, taking regular medications"

**CONDITION WHEN ADMITTED**
- Why patient came to hospital in simple words
- Example: "Severe shortness of breath, wheezing, cough with white mucus for 4 days, fever for 3 days"

**DIAGNOSIS AND TREATMENT GIVEN**

DIAGNOSES (in simple language):
- Acute worsening of lung disease (OAD exacerbation)
- Flu infection (H1N1 Influenza A strain)
- Severe breathing problems requiring oxygen support
- High blood pressure

🚫 DO NOT include "DISCHARGE SUMMARY", "76 Years", "Months / Female" here!

TESTS & PROCEDURES (explain what they show):
- Hemoglobin: 14.1 g/dL (oxygen-carrying capacity - normal)
- White blood cells: 4.29 (infection fighters - slightly low)
- Platelets: 2.77 (blood clotting cells - low)
- Heart ultrasound (2D Echo): Normal heart function, pumping strength 55%
- Flu test: Positive for Influenza A (H1N1)
- 6-minute walk test: Oxygen levels dropped to 89% (shows breathing difficulty)

HOSPITAL MEDICATIONS (Given During Hospital Stay):
- List IV drugs, injections, oxygen, nebulizers used IN HOSPITAL only
- Format: • **[Drug Name]**: [Simple explanation]
- Example: • **Oxygen support at 2-4 liters/minute**: To help breathing

**CONDITION AT DISCHARGE**
- How patient is feeling now
- Example: "Breathing improved, stable vital signs (blood pressure and heart rate normal), ready for home care with oxygen support"

**MEDICATIONS TO FOLLOW AFTER DISCHARGE**

• **HOME OXYGEN SUPPORT**
  - Use nasal prongs at 2-4 liters/minute
  - Duration: 16-18 hours per day
  - Purpose: Helps you breathe easier and keeps oxygen levels up

• **TAB PAN 40MG**
  - Timing: 1-0-0 (take 1 tablet in the morning before breakfast)
  - Duration: 5 days
  - Purpose: Reduces stomach acid, protects stomach from other medications

• **TAB PREDMET 16MG**
  - Timing: 1-0-0 (take 1 tablet in the morning)
  - Duration: 3 days
  - Purpose: Steroid to reduce lung inflammation and help breathing

• **TAB PREDMET 8MG**
  - Timing: 1-0-0 (take 1 tablet in the morning)
  - Duration: 2 days (start AFTER finishing the 16mg dose)
  - Purpose: Lower steroid dose to safely taper off the medication

[Continue with each medication on separate bullet...]

🚫 NEVER combine multiple medications in one bullet or "Note:" field!

**FOLLOW-UP AND FUTURE CARE**
- Follow-up appointments with specific doctor names and timeframes
- Example: "Follow up with Dr. Prasanna Kumar in Respiratory Medicine clinic after 1 week"

**ADDITIONAL INFORMATION**
- Emergency contact numbers
- Warning signs to watch for
- Example: "Call 080-6215-3333 immediately if you experience severe chest pain, worsening breathlessness, or high fever"

═══════════════════════════════════════════════════════════════════

🔴 BEFORE YOU RESPOND - VERIFY:

□ Did I remove "DISCHARGE SUMMARY", age/gender from diagnoses?
□ Did I fix ALL "artery walls">" patterns?
□ Did I simplify ALL medical jargon (no RWMA, LVSF, PASP, etc.)?
□ Did I explain what test results mean?
□ Did I write EACH medication on its own bullet point?
□ Did I separate hospital medications from home medications?
□ Did I use proper spacing and formatting?

═══════════════════════════════════════════════════════════════════

DISCHARGE SUMMARY TO SIMPLIFY:

${extractedText}

═══════════════════════════════════════════════════════════════════

NOW SIMPLIFY IT - Clean, format, and simplify everything!`;
}

/**
 * Care Guidance Prompt - Shortened for performance
 */
function getCareGuidancePrompt(summaryText) {
  return `Based on this discharge summary, create a care plan with 5 specific care items.

SUMMARY:
${summaryText}

Return ONLY valid JSON (no extra text):
[
  {
    "title": "Action-oriented heading",
    "description": "2-3 sentences with specific instructions",
    "priority": "High/Medium/Low",
    "category": "Medication/Appointment/Monitoring/Lifestyle/Emergency"
  }
]

Include: medication instructions, follow-up appointments, symptom monitoring, lifestyle changes, warning signs.

JSON array only:`;
}

/**
 * FAQ Generation Prompt - Shortened for performance
 */
function getFAQPrompt(summaryText) {
  return `Create 8 practical FAQs about this discharge summary.

SUMMARY:
${summaryText}

Return ONLY valid JSON:
[
  {"q":"Question text","a":"Answer (2-3 sentences)","category":"Medication/Diet/Lifestyle/Emergency/Monitoring/Follow-up/Recovery"}
]

Cover: medications, activities to avoid, diet, warning signs, follow-up, home monitoring, when to call 911, recovery timeline.

JSON only:`;
}

/**
 * Translation Prompt
 */
function getTranslationPrompt(text, targetLanguage) {
  const languageNames = {
    'hi': 'Hindi',
    'kn': 'Kannada',
    'en': 'English'
  };

  const langName = languageNames[targetLanguage] || 'Hindi';

  return `Translate this medical summary to ${langName}. Keep medication names in English.

ENGLISH TEXT:
${text}

${langName.toUpperCase()} TRANSLATION:`;
}

/**
 * Medical Term Explanation Prompt
 */
function getTermExplanationPrompt(term) {
  return `Explain "${term}" in simple words for patients.

Return JSON only:
{
  "simple": "Brief plain-language name (5-10 words)",
  "explanation": "Clear 2-3 sentence explanation using everyday language"
}

JSON:`;
}

/**
 * Final Synthesis Prompt (for combining chunk summaries) - NOT USED currently
 */
function getFinalSynthesisPrompt(chunkSummaries) {
  return `Combine these summaries into one final patient-friendly summary:

${chunkSummaries}

Use the standard format with sections: PATIENT HISTORY, CONDITION WHEN ADMITTED, DIAGNOSIS AND TREATMENT GIVEN, etc.

Combined summary:`;
}

module.exports = {
  getSummarizationPrompt,
  getFinalSynthesisPrompt,
  getCareGuidancePrompt,
  getFAQPrompt,
  getTranslationPrompt,
  getTermExplanationPrompt
};
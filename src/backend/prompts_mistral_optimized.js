/**
 * OPTIMIZED Prompts for Mistral 7B
 * 
 * Shorter, simpler prompts that Mistral can actually follow
 */

function getSummarizationPrompt(extractedText, isChunk = false) {
  if (isChunk) {
    return `Simplify this medical text:\n\n${extractedText}`;
  }

  // SHORT, DIRECT PROMPT - Mistral works better with less text
  return `Convert this hospital discharge summary into simple, patient-friendly language.

CRITICAL RULES:
1. Remove garbage: Don't copy "DISCHARGE SUMMARY", "76 Years", "Months/Female", "www.", "KMC No", doctor names, "Prepared by"
2. Fix broken text: Change "artery walls">hypertension" to "high blood pressure"
3. Simplify terms: hypertension→high blood pressure, dyspnea→difficulty breathing, OAD→lung disease
4. Each medication separate: NEVER combine medications in one line

OUTPUT FORMAT:

**PATIENT HISTORY**
- Previous conditions in simple words

**CONDITION WHEN ADMITTED**
- Why they came to hospital

**DIAGNOSIS AND TREATMENT GIVEN**

DIAGNOSES (simple language):
- List each diagnosis

TESTS & PROCEDURES:
- List test results

HOSPITAL MEDICATIONS (During Stay):
- IV drugs and treatments given in hospital

**CONDITION AT DISCHARGE**
- How patient is now

**MEDICATIONS TO FOLLOW AFTER DISCHARGE**

• **TAB [NAME] [DOSE]**
  - Timing: 1-0-0 (morning)
  - Duration: X days
  - Purpose: Why taking this

**FOLLOW-UP AND FUTURE CARE**
- Follow-up appointments

**ADDITIONAL INFORMATION**
- Emergency contacts

DOCUMENT:
${extractedText}

SIMPLIFIED VERSION:`;
}

function getCareGuidancePrompt(summaryText) {
  return `Create 5 care instructions from this summary.

${summaryText}

Return ONLY JSON:
[{"title":"","description":"","priority":"High/Medium/Low","category":"Medication/Appointment/Monitoring/Lifestyle/Emergency"}]`;
}

function getFAQPrompt(summaryText) {
  return `Create 8 FAQs about this summary.

${summaryText}

Return ONLY JSON:
[{"q":"","a":"","category":"Medication/Diet/Lifestyle/Emergency/Monitoring/Follow-up/Recovery"}]`;
}

function getTranslationPrompt(text, targetLanguage) {
  const languageNames = {
    'hi': 'Hindi',
    'kn': 'Kannada',
    'en': 'English'
  };

  const langName = languageNames[targetLanguage] || 'Hindi';

  return `Translate to ${langName}. Keep medication names in English.

ENGLISH:
${text}

${langName.toUpperCase()}:`;
}

function getTermExplanationPrompt(term) {
  return `Explain "${term}" in simple words.

JSON only:
{"simple":"","explanation":""}`;
}

function getFinalSynthesisPrompt(chunkSummaries) {
  return `Combine these summaries:

${chunkSummaries}

Combined:`;
}

module.exports = {
  getSummarizationPrompt,
  getFinalSynthesisPrompt,
  getCareGuidancePrompt,
  getFAQPrompt,
  getTranslationPrompt,
  getTermExplanationPrompt
};

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
2. Fix broken text: Change "artery walls">hypertension" or "ultrasound">echo" or "word">word" to proper words WITHOUT the "> symbol
3. Simplify terms: hypertension→high blood pressure, dyspnea→difficulty breathing, OAD→lung disease
4. Each medication separate: NEVER combine medications in one line
5. SPACING: Add blank lines between ALL sections
6. ⚠️ DO NOT make predictions: Don't predict prognosis, recovery time, or future health outcomes. Only summarize what's documented.

OUTPUT FORMAT (with blank lines):

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

• **TAB [NAME] [DOSE]** | Timing: 1-0-0 | Before/After food

• **TAB [NAME] [DOSE]** | Timing: 0-1-0 | Before/After food

(Keep it SHORT - just name, dose, timing, before/after food)

**FOLLOW-UP AND FUTURE CARE**
- Follow-up appointments

**ADDITIONAL INFORMATION**
- Emergency contacts

IMPORTANT: 
- Add a blank line before each ** section header
- Do NOT add "NOTE:" or "DISCHARGE SUMMARY" sections at the end
- For medications: ONLY show name, dose, timing (1-0-0), and before/after food - nothing else
- Remove ALL "> symbols from text (like "artery walls">hypertension should become "high blood pressure")

DOCUMENT:
${extractedText}

SIMPLIFIED VERSION:`;
}

function getCareGuidancePrompt(summaryText) {
  return `Based on this medical summary, create 5-6 SPECIFIC care instructions for THIS patient's condition.

${summaryText}

REQUIRED TOPICS (use ACTUAL medication names, doses, and conditions from the summary):
1. Medication instructions - Include specific drug names, dosages, timing from summary
2. Follow-up appointments - When to see doctor for their specific condition
3. Symptom monitoring - What symptoms to watch for their diagnosis
4. Lifestyle changes - Diet/activity changes for their condition
5. Warning signs - Emergency symptoms specific to their diagnosis

⚠️ DO NOT make predictions about recovery time, prognosis, or future outcomes. Only use information from the document.

DO NOT include: Patient name, doctor name, hospital name, dates

Return ONLY a JSON array (max 80 chars per description):
[{"title":"Take [Medication Name] Daily","description":"Take [drug] [dose] at [time] with food for [condition]. Never skip doses.","priority":"High","category":"Medication"}]

Categories: Medication, Follow-up, Lifestyle, Warning Signs, Monitoring

JSON array:`;
}

function getFAQPrompt(summaryText) {
  return `Generate 6-8 FAQs about HOME CARE for the medical conditions in this summary.

${summaryText}

GENERATE questions like:
- "How should I take my medications?"
- "What foods should I avoid?"
- "When should I call the doctor?"
- "What warning signs should I watch for?"
- "Can I exercise after discharge?"
- "How long will recovery take?"

DO NOT generate questions like:
- "What is the patient's name?" ❌
- "Who is my doctor?" ❌
- "What is my age?" ❌
- "When was I admitted?" ❌

⚠️ DO NOT make predictions about prognosis or future outcomes. Only use documented information.

Focus on: medication management, diet, activities, warning signs, follow-up care, recovery

Return ONLY valid JSON array (max 100 chars per answer):
[{"q":"How should I take my medications?","a":"Take aspirin 81mg and atorvastatin 40mg daily with dinner. Never skip doses.","category":"Medication"}]

JSON array:`;
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
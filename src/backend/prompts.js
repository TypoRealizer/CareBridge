/**
 * Prompt Templates for Mistral Model
 * 
 * These templates ensure consistent, high-quality outputs for medical text processing.
 * Use low temperature (0-0.2) for deterministic results.
 */

/**
 * Summarization Prompt Template
 * Converts complex medical discharge notes into patient-friendly summaries
 */
function getSummarizationPrompt(extractedText, isChunk = false) {
  if (isChunk) {
    // For chunk processing
    return `SYSTEM: You are a medical-language simplifier. Produce a short, accurate, patient-friendly summary of the given hospital discharge note section.
GUIDELINES:
- Keep medical facts unchanged.
- Use plain language; avoid jargon. Replace technical terms with simple words in parentheses when necessary.
- Output must be concise and in bullet points.
- If a medication is ambiguous, flag it as [CONFIRM MED].

USER: Summarize this section: 
${extractedText}`;
  }

  // For full document or final synthesis
  return `SYSTEM: You are a medical-language simplifier. Produce a short, accurate, patient-friendly summary of the given hospital discharge note.
GUIDELINES:
- Keep medical facts unchanged.
- Use plain language; avoid jargon. Replace technical terms with simple words in parentheses when necessary.
- Output in bullet points under these headings: Diagnosis, Procedures, Medications (name — dose — timing), Key Warnings, Follow-up.
- Keep the summary comprehensive but digestible. For large documents, you may exceed 200 words if necessary to maintain completeness.
- If a medication is ambiguous, flag it as [CONFIRM MED].

USER: Summarize: 
${extractedText}`;
}

/**
 * Final Synthesis Prompt (for combining chunk summaries)
 */
function getFinalSynthesisPrompt(chunkSummaries) {
  return `SYSTEM: You are a medical-language simplifier. Combine these partial summaries into one final, coherent, patient-friendly summary.
GUIDELINES:
- Consolidate duplicate information
- Maintain chronological flow
- Organize under headings: Diagnosis, Procedures, Medications (name — dose — timing), Key Warnings, Follow-up
- Keep comprehensive but clear (may exceed 200 words if needed)

USER: Combine these summaries:
${chunkSummaries}

Final consolidated summary:`;
}

/**
 * Care Guidance Prompt Template
 * Generates structured care instructions with JSON output
 */
function getCareGuidancePrompt(summaryText) {
  return `SYSTEM: You are a medical care coordinator. Based on the patient's discharge summary, create a comprehensive care plan with detailed, actionable instructions.

USER: Summary:
${summaryText}

Generate care guidance as a JSON array with 5-7 specific care items. Each item must have:
- "title": A clear, action-oriented heading (e.g., "Take Your Heart Medications")
- "description": A detailed 2-3 sentence explanation with specific instructions, timing, and rationale based on the patient's condition
- "priority": Either "High", "Medium", or "Low" based on medical urgency
- "category": One of "Medication", "Appointment", "Monitoring", "Lifestyle", or "Emergency"

The care items should be SPECIFIC to the patient's diagnosis, procedures, and medications mentioned in the summary. Include:
1. Medication instructions with names, dosages, and timing
2. Follow-up appointment scheduling
3. Symptom monitoring specific to their condition
4. Lifestyle modifications relevant to their diagnosis
5. Warning signs to watch for

Example format:
[
  {
    "title": "Take Aspirin and Clopidogrel Daily",
    "description": "Take aspirin 81mg and clopidogrel 75mg together each morning with food to prevent blood clots after your stent placement. These medications are crucial for preventing another heart attack. Do not skip doses or stop taking them without consulting your cardiologist, even if you feel better.",
    "priority": "High",
    "category": "Medication"
  },
  ...
]

Return ONLY a valid JSON array with 5-7 detailed care items, no additional text:`;
}

/**
 * FAQ Generation Prompt Template
 * Generates patient-oriented Q&A pairs with detailed explanations
 */
function getFAQPrompt(summaryText) {
  return `You are a medical educator. Based on this discharge summary, create 10 practical FAQs that patients commonly ask.

Summary:
${summaryText}

Generate 10 FAQs in valid JSON format. Each FAQ must have:
- q: The question (clear and specific)
- a: The answer (2-4 sentences with practical advice)
- category: One of [Medication, Diet, Lifestyle, Emergency, Monitoring, Follow-up, Recovery]

Cover these topics:
1. How to take medications (names, doses, timing)
2. What activities to avoid
3. Diet changes needed
4. Warning signs to watch for
5. When to schedule follow-up
6. What to monitor at home
7. When to call 911
8. Exercise restrictions
9. Managing the condition
10. Recovery timeline

Format:
[
  {"q":"How do I take my medications?","a":"Take aspirin 81mg and clopidogrel 75mg daily with food. Never skip doses. These prevent blood clots after your stent placement. Call your doctor before stopping any medication.","category":"Medication"},
  {"q":"What activities should I avoid?","a":"Avoid heavy lifting over 10 pounds for 2 weeks. Don't do strenuous exercise until cleared by your doctor. Light walking is encouraged. Gradually increase activity as you feel better.","category":"Lifestyle"}
]

Return ONLY valid JSON (no extra text):`;
}

/**
 * Translation Prompt Template
 * Translates medical summaries while preserving medical accuracy
 */
function getTranslationPrompt(text, targetLanguage) {
  const languageNames = {
    'hi': 'Hindi',
    'kn': 'Kannada',
    'en': 'English'
  };

  const langName = languageNames[targetLanguage] || 'Hindi';

  return `SYSTEM: You are a medical translation expert. Translate the following medical text from English to ${langName}.
GUIDELINES:
- Maintain patient-friendly tone
- Preserve medical accuracy
- Keep critical medical terms in English (with translation in parentheses if helpful)
- Ensure dosages and medication names remain clear

USER: Translate this medical summary to ${langName}:
${text}

${langName} Translation:`;
}

module.exports = {
  getSummarizationPrompt,
  getFinalSynthesisPrompt,
  getCareGuidancePrompt,
  getFAQPrompt,
  getTranslationPrompt
};

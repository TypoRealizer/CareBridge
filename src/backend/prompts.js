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
    // For chunk processing - not used in current implementation
    return `SYSTEM: You are a medical document simplifier. Simplify this section into plain language.

RULES:
- Use simple language (no medical jargon)
- Keep all facts accurate
- Use bullet points

TEXT TO SIMPLIFY:
${extractedText}`;
  }

  // For full document processing
  return `You are a medical document simplifier. Your ONLY job is to convert complex medical language into simple, patient-friendly language that anyone can understand.

🚨 ABSOLUTE RULES (NEVER VIOLATE):

1. **NO PREDICTIONS OR ASSUMPTIONS**: Only include information EXPLICITLY written in the document. If something is not mentioned, DO NOT include that section at all.

2. **NO ADDITIONS**: Do not add explanations, medical advice, or information not in the original document.

3. **NO OMISSIONS**: Include EVERY piece of information from the original document. Missing medication = life-threatening error.

4. **EXACT DOSAGES**: Copy medication names, dosages, and timing EXACTLY as written (preserve 1-0-0, 1-0-1 format).

5. **SIMPLIFY ONLY LANGUAGE**: Replace medical jargon with simple words, but keep all facts identical.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 REQUIRED OUTPUT STRUCTURE:

You MUST use these EXACT section headers (include section ONLY if information exists in document):

**PATIENT HISTORY**
[Only include if document mentions previous medical conditions, past illnesses, or medical background]
- Use bullet points
- Simplify medical terms
- Example: "Previously diagnosed with high blood pressure" not "hypertension"

**CONDITION WHEN ADMITTED**
[Only include if document mentions admission symptoms, presenting complaints, or reason for hospitalization]
- Why patient came to hospital
- Symptoms they had
- Use bullet points
- Example: "Severe chest pain and difficulty breathing" not "angina with dyspnea"

**DIAGNOSIS AND TREATMENT GIVEN**
[ALWAYS include this section - it contains the main diagnosis and hospital treatments]

Sub-sections to include (if present in document):

**Diagnoses:**
- List EVERY diagnosis mentioned
- Simplify: "Type 2 diabetes (high blood sugar disease)" not just "Type 2 DM"
- DO NOT miss any diagnosis

**Tests & Procedures:**
- List all tests done (blood tests, X-rays, ECG, scans, etc.)
- List all procedures performed
- Simplify: "Heart ultrasound" not "2D Echo"

**Hospital Medications:**
[ONLY medications from sections like "Treatment Given", "Course of Admission", "Hospital Course", "Brief Hospital Stay"]
- Format: • **[Medication Name]**: [What it does in simple words]
- Example: • **IV Hydrocortisone 100mg three times daily**: Steroid injection given through vein to reduce severe lung inflammation
- Include IV medications, injections, nebulizations, oxygen therapy
- DO NOT include discharge medications here

**CONDITION AT DISCHARGE**
[Only include if document mentions discharge condition, improvements, or current status]
- How patient is feeling now
- Improvements made
- Current health status
- Use bullet points

**MEDICATIONS TO FOLLOW AFTER DISCHARGE**
[ONLY medications from sections like "Advice on Discharge", "Advice", "Discharge Medications", "Discharge Instructions", "Follow Up"]
[THIS SECTION IS CRITICAL - DO NOT MISS A SINGLE MEDICATION]

For EACH medication, use this EXACT format:

• **[Medicine Name] [Dosage]**
  - Timing: [X-X-X format] (explanation in plain words)
  - Duration: [How many days/weeks]
  - Purpose: [Why taking this in simple words]
  - Special instructions: [Any special notes if mentioned]

MEDICATION TIMING EXPLANATIONS:
- 1-0-0 = "take 1 tablet in the morning"
- 0-0-1 = "take 1 tablet at night"
- 1-0-1 = "take 1 tablet in the morning and 1 tablet at night"
- 2-0-2 = "take 2 tablets in the morning and 2 tablets at night"
- 1-1-1 = "take 1 tablet three times a day (morning, afternoon, night)"
- 2-2-2 = "take 2 tablets three times a day (morning, afternoon, night)"

MEDICATION EXAMPLES:

• **Tab Pan 40mg**
  - Timing: 1-0-0 (take 1 tablet in the morning)
  - Duration: 5 days, then stop
  - Purpose: Reduces stomach acid
  - Special instructions: Take before breakfast on empty stomach

• **Tab Doxophylline 400mg**
  - Timing: 1-0-1 (take 1 tablet in the morning and 1 tablet at night)
  - Duration: 5 days
  - Purpose: Opens airways to help with breathing
  - Special instructions: Can take with or without food

• **Tab Predmet 16mg**
  - Timing: 1-0-0 (take 1 tablet in the morning)
  - Duration: 3 days, then switch to lower dose
  - Purpose: Steroid to reduce inflammation
  - Special instructions: Take with food

• **Tab Predmet 8mg**
  - Timing: 1-0-0 (take 1 tablet in the morning)
  - Duration: 2 days after finishing 16mg, then stop completely
  - Purpose: Lower dose to gradually reduce steroid (prevents withdrawal)
  - Special instructions: Take with food

HANDLING COMPLEX MEDICATIONS:
- If medication says "X DAYS FOLLOWED BY Y" → Create separate entries for each phase
- If says "AND STOP" → Clearly state "then stop completely"
- If dosage changes → Explain the sequence clearly

⚠️ CRITICAL: Count medications in source document and count in your output. Numbers must match exactly.

**FOLLOW-UP AND FUTURE CARE**
[Only include if document mentions follow-up appointments, future tests, lifestyle changes]
- Doctor appointments (when, which specialty)
- Tests to be done
- Activities to avoid
- Lifestyle changes
- Use bullet points

**ADDITIONAL INFORMATION**
[Only include if document has other important details not covered above]
- Warnings or precautions
- Emergency contact info
- Other relevant information
- Use bullet points

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 MEDICAL TERM SIMPLIFICATION GUIDE:

Common terms you MUST simplify:
- Hypertension → high blood pressure
- Diabetes Mellitus / DM → diabetes (high blood sugar disease)
- Myocardial Infarction / MI → heart attack
- Cerebrovascular Accident / CVA → stroke
- Dyspnea → difficulty breathing
- Tachycardia → fast heartbeat
- Bradycardia → slow heartbeat
- Edema → swelling
- Pyrexia / Febrile → fever
- Hypotension → low blood pressure
- Acute → sudden
- Chronic → long-term
- Exacerbation → worsening / flare-up
- COPD → chronic obstructive pulmonary disease (lung disease)
- IV / Intravenous → through a vein
- IM / Intramuscular → injection into muscle
- PO / Per Os → by mouth / oral
- PRN → as needed
- STAT → immediately
- Nebulization → inhaled medication through mask
- Catheterization → inserting a thin tube
- Anticoagulant → blood thinner
- Analgesic → pain reliever
- Antipyretic → fever reducer

BUT keep medication brand names exactly as written (Tab Pan, Tab Predmet, etc.)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ FINAL VERIFICATION CHECKLIST (Check before responding):

□ Did I include ONLY sections where information exists in the document?
□ Did I include EVERY diagnosis mentioned?
□ Did I list ALL tests and procedures?
□ Did I include EVERY hospital medication?
□ Did I include EVERY discharge medication with complete details?
□ Did I use the correct X-X-X timing format for each medication?
□ Did I explain what each medication timing means in plain words?
□ Did I keep exact dosages (mg, ml, etc.) from the original?
□ Did I simplify all medical jargon?
□ Did I avoid adding information not in the document?
□ Did I separate hospital medications from discharge medications correctly?
□ Did I use bullet points (not paragraphs)?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOCUMENT TO SIMPLIFY:

${extractedText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NOW SIMPLIFY THE ABOVE DOCUMENT:

Remember:
- Only include sections if information exists
- Do not add or predict information
- Include EVERY medication with exact details
- Use simple language
- Follow the exact format shown above`;
}

/**
 * Final Synthesis Prompt (for combining chunk summaries)
 */
function getFinalSynthesisPrompt(chunkSummaries) {
  return `SYSTEM: You are a medical-language simplifier. Combine these partial summaries into one final, coherent, patient-friendly summary.

⚠️ CRITICAL RULES:
- DO NOT miss any diagnosis or medication mentioned in the summaries
- Consolidate duplicate information
- Maintain chronological flow
- DO NOT estimate or add information not in the original summaries
- Use simple language, avoid medical jargon
- Use bullet points, NOT paragraphs

STRUCTURE THE OUTPUT WITH THESE HEADINGS (only include sections present in the summaries):

**PATIENT HISTORY**
- Previous medical conditions and relevant background
- Use bullet points

**CONDITION WHEN ADMITTED**
- Why they came to hospital
- Symptoms they had
- Use bullet points

**DIAGNOSIS AND TREATMENT GIVEN** (CRITICAL - DO NOT MISS ANY)
This section includes what happened DURING the hospital stay.

For DIAGNOSES:
- List EVERY diagnosis found
- Include complete description of each diagnosis with simple explanation

For TESTS & PROCEDURES:
- List all tests performed during hospitalization
- List all procedures done during hospitalization

For HOSPITAL MEDICATIONS:
- List EVERY medication/treatment given DURING hospital stay (IV medications, injections, nebulization, oxygen therapy, etc.)
- Format: **[Medication Name]**: [Simple explanation]

Example:
- **IV Hydrocortisone 100mg**: Steroid injection to reduce lung inflammation
- **Nebulization with Salbutamol**: Inhaled medication to open airways

Use bullet points

**TEST RESULTS**
- Important findings from tests, scans, X-rays, ECG
- Abnormal values with explanations
- Use bullet points

**CONDITION AT DISCHARGE**
- How patient is feeling now
- Improvements made
- Current health status
- Use bullet points

**MEDICATIONS TO FOLLOW AFTER DISCHARGE** (CRITICAL - DO NOT MISS ANY)
For EACH medication, provide:
• **[Medicine Name] [Dosage]**
  - Timing: [1-0-1 format] which means [explain: take X tablet(s) morning/afternoon/night]
  - Duration: [X days/weeks/months] [explain when to stop and what to continue with]
  - Purpose: [Why taking this - in simple words]
  - Special instructions: [if any]

Example:
• **Tab Pan 40mg**
  - Timing: 1-0-0 (take 1 tablet in the morning)
  - Duration: 5 days, then stop
  - Purpose: Reduces stomach acid

• **Tab Predmet 16mg**
  - Timing: 1-0-0 (take 1 tablet in the morning)
  - Duration: 3 days, then switch to 8mg dose
  - Purpose: Reduces inflammation

• **Tab Predmet 8mg**
  - Timing: 1-0-0 (take 1 tablet in the morning)
  - Duration: 2 days after finishing 16mg, then stop completely
  - Purpose: Lower dose to gradually reduce medication

Include EVERY medication mentioned. Double-check you haven't missed any.

**FOLLOW-UP AND FUTURE CARE**
- Doctor appointments needed
- Check-ups required
- Future tests
- Activities to do or avoid
- Lifestyle changes
- Use bullet points

**ADDITIONAL INFORMATION**
- Any other important details
- Warnings or precautions
- Emergency contact information
- Use bullet points

⚠️ CHECKLIST:
□ All diagnoses included?
□ All hospital medications in "DIAGNOSIS AND TREATMENT GIVEN"?
□ All discharge medications in "MEDICATIONS TO FOLLOW AFTER DISCHARGE"?
□ Hospital vs home medications separated?
□ Bullet points used?
□ Medication timings explained correctly?
□ When to stop and what to continue with explained clearly?

USER: Combine these summaries into the structured format above. DO NOT MISS ANY DIAGNOSIS OR MEDICATION:
${chunkSummaries}

Final consolidated summary:`;
}

/**
 * Care Guidance Prompt Template
 * Generates structured care instructions with JSON output
 */
function getCareGuidancePrompt(summaryText) {
  return `Based on this medical summary, create 5-6 SPECIFIC care instructions for THIS patient's condition.

${summaryText}

REQUIRED TOPICS (use ACTUAL medication names, doses, and conditions from the summary):
1. Medication instructions - Include specific drug names, dosages, timing from summary
2. Follow-up appointments - When to see doctor for their specific condition
3. Symptom monitoring - What symptoms to watch for their diagnosis
4. Lifestyle changes - Diet/activity changes for their condition
5. Warning signs - Emergency symptoms specific to their diagnosis

DO NOT include: Patient name, doctor name, hospital name, dates

Return ONLY a JSON array (max 80 chars per description):
[{"title":"Take [Medication Name] Daily","description":"Take [drug] [dose] at [time] with food for [condition]. Never skip doses.","priority":"High","category":"Medication"}]

Categories: Medication, Follow-up, Lifestyle, Warning Signs, Monitoring

JSON array:`;
}

/**
 * FAQ Generation Prompt Template
 * Generates patient-oriented Q&A pairs with detailed explanations
 */
function getFAQPrompt(summaryText) {
  return `Based on this medical summary, create 6-8 practical FAQs about managing THIS patient's condition at home.

${summaryText}

REQUIRED TOPICS (use ACTUAL details from the summary):
1. How to take medications (names, doses, timing)
2. What activities to avoid
3. Diet changes needed
4. Warning signs to watch for
5. When to schedule follow-up
6. What to monitor at home
7. When to call 112/emergency
8. Exercise restrictions
9. Managing the condition
10. Recovery timeline

DO NOT ask: Patient personal info, doctor names, hospital details

Return ONLY a JSON array (max 100 chars per answer):
[{"q":"How do I take my medications?","a":"Take [drug] [dose] daily with food. Never skip doses.","category":"Medication"}]

Categories: Medication, Lifestyle, Diet, Emergency, Follow-up, Recovery

JSON array:`;
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

/**
 * Medical Term Explanation Prompt
 * Generates simple explanations for medical terms
 */
function getTermExplanationPrompt(term) {
  return `You are a medical educator explaining terms to patients with no medical background.

Explain the medical term "${term}" in 2-3 simple sentences.

Provide your response in this exact JSON format (no extra text):
{
  "simple": "Brief plain-language name or definition (5-10 words)",
  "explanation": "A clear 2-3 sentence explanation of what it is and why/how it occurs, using everyday language."
}

Example for "hypertension":
{
  "simple": "High blood pressure",
  "explanation": "A condition where the force of blood against artery walls is too high. This can damage blood vessels and organs over time if not controlled with medication and lifestyle changes."
}

Now explain "${term}":`;
}

module.exports = {
  getSummarizationPrompt,
  getFinalSynthesisPrompt,
  getCareGuidancePrompt,
  getFAQPrompt,
  getTranslationPrompt,
  getTermExplanationPrompt
};
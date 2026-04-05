const settings = require('../../config/settings');

const PROMPTS = {
  drivers_license: `Extract the expiration date from this driver's license image. Return ONLY the date in YYYY-MM-DD format. If you cannot determine the date, return "UNKNOWN".`,
  tb_test: `Extract the test read date or completion date from this TB test result image. Return ONLY the date in YYYY-MM-DD format. If you cannot determine the date, return "UNKNOWN".`,
  background_check: `Extract the registration date from this background check document. Return ONLY the date in YYYY-MM-DD format. If you cannot determine the date, return "UNKNOWN".`,
  car_insurance: `Extract the policy expiration date from this car insurance document. Return ONLY the date in YYYY-MM-DD format. If you cannot determine the date, return "UNKNOWN".`,
};

async function extractDateFromDocument(documentType, fileBuffer, mimeType) {
  // Demo/mock mode: simulate AI extraction when no API key is set
  if (!settings.ai.enabled) {
    return simulateAiExtraction(documentType);
  }

  if (!PROMPTS[documentType]) {
    return { date: null, confidence: 0, error: 'No extraction prompt for this document type' };
  }

  try {
    const base64 = fileBuffer.toString('base64');
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.ai.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPTS[documentType] },
              { inline_data: { mime_type: mimeType, data: base64 } },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 50 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('[ai-scanner] Gemini API error:', err);
      return { date: null, confidence: 0, error: 'AI API request failed' };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text || text === 'UNKNOWN') {
      return { date: null, confidence: 0, error: 'Could not extract date' };
    }

    // Validate date format
    const dateMatch = text.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!dateMatch) {
      return { date: null, confidence: 0, error: `Invalid date format: ${text}` };
    }

    const parsed = new Date(text);
    if (isNaN(parsed.getTime())) {
      return { date: null, confidence: 0, error: `Invalid date: ${text}` };
    }

    return { date: text, confidence: 0.9, error: null };
  } catch (err) {
    console.error('[ai-scanner] Extraction error:', err.message);
    return { date: null, confidence: 0, error: err.message };
  }
}

function simulateAiExtraction(documentType) {
  // Simulate AI extracting a date from the document with a slight offset
  // to demonstrate the mismatch detection feature
  const today = new Date();

  const simulated = {
    drivers_license: () => {
      // AI "reads" an expiration date ~5 days off from what user might enter
      const d = new Date(today);
      d.setMonth(d.getMonth() + 18);
      d.setDate(d.getDate() + 5);
      return d.toISOString().split('T')[0];
    },
    tb_test: () => {
      // AI "reads" the test read date ~2 days off
      const d = new Date(today);
      d.setMonth(d.getMonth() - 3);
      d.setDate(d.getDate() - 2);
      return d.toISOString().split('T')[0];
    },
    background_check: () => {
      // AI "reads" registration date accurately
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().split('T')[0];
    },
    car_insurance: () => {
      // AI "reads" expiration date matching the user entry
      const d = new Date(today);
      d.setMonth(d.getMonth() + 8);
      return d.toISOString().split('T')[0];
    },
  };

  const generator = simulated[documentType];
  if (!generator) {
    return { date: null, confidence: 0, error: 'No AI extraction for this document type' };
  }

  const extractedDate = generator();
  console.log(`[ai-scanner] DEMO MODE: Simulated extraction for ${documentType} -> ${extractedDate}`);
  return { date: extractedDate, confidence: 0.85, error: null };
}

module.exports = { extractDateFromDocument, PROMPTS };

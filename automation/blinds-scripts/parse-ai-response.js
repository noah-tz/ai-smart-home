// Parse Gemini AI response (or return mock if debug.mockAI is enabled)
const config = $('Load Config').first().json;

// --- DEBUG MODE: skip AI parsing, return mock result ---
if (config.debug && config.debug.mockAI) {
  const isCloudy = config.debug.mockBlindsResult !== false; // false = close blinds, true = keep open
  const reason = isCloudy
    ? '🧪 DEBUG MOCK: תריסים נשארים פתוחים (mockBlindsResult: true/undefined)'
    : '🧪 DEBUG MOCK: תריסים נסגרים (mockBlindsResult: false)';
  return [{ json: { isCloudy, reason } }];
}

// --- PRODUCTION MODE ---
const response = $input.first().json;

try {
  const text = response.candidates[0].content.parts[0].text;
  const cleaned = text.replace(/```json|```/g, '').trim();
  const result = JSON.parse(cleaned);
  return [{ json: { isCloudy: result.isCloudy, reason: result.reason } }];
} catch (e) {
  const month = new Date().getMonth() + 1;
  const isSummer = config.settings.SUMMER_MONTHS.includes(month);

  if (isSummer) {
    return [{ json: { isCloudy: false, reason: 'שגיאה בפענוח תשובת AI. בחודשי הקיץ (חודש ' + month + '), כברירת מחדל התריסים נסגרים.' } }];
  } else {
    return [{ json: { isCloudy: true, reason: 'שגיאה בפענוח תשובת AI. בחודשי החורף (חודש ' + month + '), כברירת מחדל התריסים נשארים פתוחים.' } }];
  }
}

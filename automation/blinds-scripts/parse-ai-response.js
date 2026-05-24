// Parse Gemini AI response
const config = $('Load Config').first().json;

// --- DEBUG MODE: safety net (normally handled by AI Failed node) ---
if (config.debug && config.debug.mockAI) {
  const mockResult = config.debug.blinds && config.debug.blinds.mockResult;
  const isCloudy = mockResult !== false;
  const reason = isCloudy
    ? '🧪 MOCK: תריסים נשארים פתוחים'
    : '🧪 MOCK: תריסים נסגרים';
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

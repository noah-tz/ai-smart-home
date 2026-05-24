// AI request failed - check if this is mock mode or real failure
const config = $('Load Config').first().json;

// --- DEBUG MODE: return mock result from config ---
if (config.debug && config.debug.mockAI) {
  const mockResult = config.debug.blinds && config.debug.blinds.mockResult;
  const isCloudy = mockResult !== false;
  const reason = isCloudy
    ? '🧪 MOCK: תריסים נשארים פתוחים (mockResult != false)'
    : '🧪 MOCK: תריסים נסגרים (mockResult: false)';
  return [{ json: { isCloudy, reason } }];
}

// --- PRODUCTION: seasonal fallback ---
const month = new Date().getMonth() + 1;
const isSummer = config.settings.SUMMER_MONTHS.includes(month);

if (isSummer) {
  return [{ json: { isCloudy: false, reason: 'חלה תקלה בניתוח הנתונים על ידי הבינה המלאכותית (השירות לא זמין). בחודשי הקיץ (חודש ' + month + '), כברירת מחדל התריסים נסגרים.' } }];
} else {
  return [{ json: { isCloudy: true, reason: 'חלה תקלה בניתוח הנתונים על ידי הבינה המלאכותית (השירות לא זמין). בחודשי החורף (חודש ' + month + '), כברירת מחדל התריסים נשארים פתוחים.' } }];
}

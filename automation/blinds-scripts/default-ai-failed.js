// AI request failed - check if this is mock mode or real failure
const config = $('Load Config').first().json;

// --- DEBUG MODE: return mock result from config ---
if (config.debug && config.debug.mockAI) {
  const isCloudy = config.debug.mockBlindsResult !== false;
  const reason = isCloudy
    ? '🧪 DEBUG MOCK: תריסים נשארים פתוחים (mockBlindsResult != false)'
    : '🧪 DEBUG MOCK: תריסים נסגרים (mockBlindsResult: false)';
  return [{ json: { isCloudy, reason } }];
}

// --- PRODUCTION: seasonal fallback ---
const now = new Date();
const month = now.getMonth() + 1;
const isSummer = config.settings.SUMMER_MONTHS.includes(month);

if (isSummer) {
  return [{ json: { isCloudy: false, reason: 'חלה תקלה בניתוח הנתונים על ידי הבינה המלאכותית (השירות לא זמין). בחודשי הקיץ (חודש ' + month + '), כברירת מחדל התריסים נסגרים.' } }];
} else {
  return [{ json: { isCloudy: true, reason: 'חלה תקלה בניתוח הנתונים על ידי הבינה המלאכותית (השירות לא זמין). בחודשי החורף (חודש ' + month + '), כברירת מחדל התריסים נשארים פתוחים.' } }];
}

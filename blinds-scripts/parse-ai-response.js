// Parse Gemini AI response
const response = $input.first().json;

try {
  const text = response.candidates[0].content.parts[0].text;
  const cleaned = text.replace(/```json|```/g, '').trim();
  const result = JSON.parse(cleaned);
  return [{ json: { isCloudy: result.isCloudy, reason: result.reason } }];
} catch (e) {
  return [{ json: { isCloudy: true, reason: 'שגיאה בפענוח תשובת AI. התריסים יישארו פתוחים ליתר ביטחון.' } }];
}
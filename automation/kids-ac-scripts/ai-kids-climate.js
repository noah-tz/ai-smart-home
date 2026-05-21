// AI Kids' Sleep & Climate Guardian
// Decides whether to turn kids AC ON or OFF based on temperature and season
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('/home/node/.n8n/config.json', 'utf8'));
const weather = $input.first().json;

const GEMINI_KEY = config.secrets.GEMINI_API_KEY;
const DEVICE_ID = config.devices.AC_KIDS;

const prompt = `You are the "AI Kids' Sleep & Climate Guardian," a specialized environmental AI agent dedicated to maintaining optimal, healthy sleeping conditions for children while preventing energy waste.

Your controllable entity is:
- Kids' Room AC (ID: "${DEVICE_ID}" - You can only turn it ON or OFF via code "switch". Temperature is pre-set by parent.)

Current Context:
- Current Time: ${weather.currentTime}
- Hour: ${weather.hour}:00
- Current Outdoor Temp: ${weather.currentTemp}°C
- Temperature Trend (next 4 hours): ${weather.trend}
- Season: ${weather.isSummer ? 'Summer (months 5-10)' : 'Winter (months 11-4)'}
- Month: ${weather.month}

RULES:
1. SUMMER MODE (months 5-10, AC is set to Cool):
   - Turn ON when outdoor temp > 20°C
   - Turn OFF when outdoor temp drops below 17°C
   - Between 02:00-05:00 (deep sleep), prefer OFF if temp is borderline (17-20°C)

2. WINTER MODE (months 11-4, AC is set to Heat):
   - Turn ON when outdoor temp < 10°C
   - Turn OFF when outdoor temp rises above 10°C
   - Keep ON during 02:00-05:00 if temp is very cold (< 5°C)

3. ENERGY SAVING:
   - If temperature trend shows rapid cooling (summer) or warming (winter), anticipate and turn OFF early
   - Don't toggle ON/OFF for small fluctuations (hysteresis: use 2°C buffer)

4. CHILD SAFETY:
   - Never leave AC running in Cool mode if outdoor temp < 15°C
   - Never leave AC off in Heat mode if outdoor temp < 5°C

Output ONLY valid JSON:
{
  "analysis": "Brief reasoning about current conditions and decision",
  "action_required": true or false,
  "command": {
    "deviceId": "${DEVICE_ID}",
    "action": "ON or OFF",
    "commands": [{"code": "switch", "value": true or false}],
    "justification": "One sentence reason in Hebrew"
  }
}

If no action is needed (AC is already in correct state based on conditions), set action_required to false and command to null.`;

const payload = {
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        analysis: { type: "string" },
        action_required: { type: "boolean" },
        command: {
          type: "object",
          properties: {
            deviceId: { type: "string" },
            action: { type: "string" },
            commands: { type: "array", items: { type: "object", properties: { code: { type: "string" }, value: { type: "boolean" } } } },
            justification: { type: "string" }
          }
        }
      },
      required: ["analysis", "action_required"]
    }
  }
};

const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_KEY;

try {
  const response = await this.helpers.httpRequest({
    method: 'POST', url, body: payload, json: true,
    headers: { 'Content-Type': 'application/json' }
  });
  const text = response.candidates[0].content.parts[0].text;
  const result = JSON.parse(text.replace(/```json|```/g, '').trim());
  return [{ json: result }];
} catch (e) {
  return [{ json: { analysis: "Error: " + e.message, action_required: false, command: null } }];
}

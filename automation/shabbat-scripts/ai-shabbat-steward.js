// AI Erev Shabbat/Chag Steward - Plans EVENING actions
// Runs at 15:00 daily. Only acts if there's a Kodesh entry tonight.
// Responsibilities:
//   1. If transition Chol→Kodesh tonight: shutdown boiler + mini-bar
//   2. Plan evening/night actions (AC for dinner, bedrooms, etc.)
//   Does NOT handle: havdalah, daytime Shabbat actions
const config = $('Load Config').first().json;

// --- DEBUG MODE: return mock result ---
if (config.debug && config.debug.mockAI) {
  const mock = (config.debug.shabbat && config.debug.shabbat.mockResult) || { reasoning_summary: 'MOCK: ללא פעולות', schedule: [] };
  return [{ json: mock }];
}

const shabbatData = $('Check Shabbat Entry').first().json;
const weatherData = $('Get Weather Forecast').first().json;

const GEMINI_KEY = config.secrets.GEMINI_API_KEY;
const devices = config.devices;

const prompt = `You are the "AI Erev Shabbat/Chag Steward." You plan EVENING actions for tonight.
It is now 15:00. You run every day at 15:00 and only act if there is a Kodesh entry (candle lighting) tonight.

YOUR SCOPE (tonight only):
- Plan actions from NOW (15:00) until tomorrow morning 11:00.
- You do NOT plan daytime Shabbat actions (that's another agent's job).
- You do NOT handle havdalah/transition to Chol (that's another agent's job).

TRANSITION LOGIC:
- isTransitionCholToKodesh: ${shabbatData.isTransitionCholToKodesh} 
  → If TRUE: Today is Chol transitioning to Kodesh tonight. You MUST turn OFF boiler (30 min before candles) and mini-bar (at candle lighting).
  → If FALSE: Already Kodesh (multi-day chag). Do NOT turn off boiler/mini-bar (already off). Only plan evening comfort actions.

Available smart entities:
- Boiler (ID="${devices.BOILER}" - code "switch_1") - OFF only if transition Chol→Kodesh
- Mini-Bar (ID="${devices.MINI_BAR}" - code "switch_1") - OFF only if transition Chol→Kodesh
- Living Room ACs (IDs: "${devices.AC_LIVING_1}", "${devices.AC_LIVING_2}" - codes: "switch", "mode", "temp_set")
- Bedroom AC (ID="${devices.AC_BEDROOM}")
- Kids Room AC (ID="${devices.AC_KIDS}")
- Shutters (Left="${devices.SHUTTER_LEFT}", Right="${devices.SHUTTER_RIGHT}" - code "percent_control", 0=closed, 100=open)

Context:
- Candle Lighting: ${shabbatData.candleLighting}
- Sunset: ${shabbatData.sunsetTime}
- Is Summer Month: ${shabbatData.isSummerMonth}
- Month: ${shabbatData.month}
- Max Temperature: ${weatherData.maxTemp}°C
- Current Temperature: ${weatherData.currentTemp}°C
- Forecast: ${JSON.stringify(weatherData.forecast.slice(0, 12))}

RULES:
1. If isTransitionCholToKodesh=true:
   - Boiler OFF 30 min before candle lighting
   - Mini-Bar OFF at candle lighting
2. If isTransitionCholToKodesh=false: Skip boiler/mini-bar (already handled)
3. Summer (months 5-10) + temp > 20°C:
   - Living room ACs ON 1 hour after sunset for 2 hours (Friday night dinner)
   - After dinner: Bedroom AC ON until 11:00 next day (always in summer)
   - After dinner: Kids AC ON until 11:00 next day (only if temp > 20°C)
4. Shutters: Close before sunset if hot day.

Output ONLY valid JSON:
{
  "reasoning_summary": "Brief Hebrew summary",
  "schedule": [
    {
      "time": "YYYY-MM-DDTHH:MM:SS+03:00",
      "deviceId": "tuya_device_id",
      "entity": "entity_name",
      "action": "ON/OFF/SET",
      "commands": [{"code": "command_code", "value": "value"}],
      "explanation": "Why (Hebrew)"
    }
  ]
}`;

const payload = {
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        reasoning_summary: { type: "string" },
        schedule: {
          type: "array",
          items: {
            type: "object",
            properties: {
              time: { type: "string" },
              deviceId: { type: "string" },
              entity: { type: "string" },
              action: { type: "string" },
              commands: { type: "array", items: { type: "object", properties: { code: { type: "string" }, value: {} } } },
              explanation: { type: "string" }
            },
            required: ["time", "deviceId", "entity", "action", "commands", "explanation"]
          }
        }
      },
      required: ["reasoning_summary", "schedule"]
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
  return [{ json: { reasoning_summary: "שגיאה: " + e.message, schedule: [] } }];
}

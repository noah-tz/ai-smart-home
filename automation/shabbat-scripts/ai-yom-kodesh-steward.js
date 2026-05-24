// AI Yom Kodesh (Shabbat/Chag Day) Steward
// Runs at 11:00 daily. Only acts if today is Kodesh.
// Responsibilities:
//   1. Daytime comfort actions (ACs for lunch, afternoon rest)
//   2. If transition Kodesh→Chol today: turn ON mini-bar at havdalah
//   Does NOT handle: erev actions, candle lighting shutdowns
const config = $('Load Config').first().json;

// --- DEBUG MODE: return mock result ---
if (config.debug && config.debug.mockAI) {
  const mock = (config.debug.shabbat && config.debug.shabbat.mockResult) || { reasoning_summary: 'MOCK: ללא פעולות', schedule: [] };
  return [{ json: mock }];
}

const kodeshData = $('Check Yom Kodesh').first().json;
const weatherData = $('Get Weather Forecast').first().json;

const GEMINI_KEY = config.secrets.GEMINI_API_KEY;
const devices = config.devices;

const prompt = `You are the "AI Yom Kodesh (Shabbat Day) Steward." You manage DAYTIME actions during Shabbat/Chag.
It is now 11:00 on a day that is Kodesh (Shabbat or Yom Tov).

YOUR SCOPE (today 11:00 until tonight):
- Plan daytime comfort actions (ACs, shutters)
- If there's a transition Kodesh→Chol today (havdalah): turn ON mini-bar at havdalah time
- You do NOT handle erev/candle lighting (that was yesterday's agent)

TRANSITION LOGIC:
- transitionToChol: ${kodeshData.transitionToChol}
  → If TRUE: Havdalah is today. Turn ON mini-bar at havdalah time.
  → If FALSE: Kodesh continues tomorrow (multi-day). Do NOT turn on mini-bar.

Available smart entities:
- Living Room ACs (IDs: "${devices.AC_LIVING_1}", "${devices.AC_LIVING_2}" - codes: "switch", "mode", "temp_set")
- Bedroom AC (ID="${devices.AC_BEDROOM}")
- Kids Room AC (ID="${devices.AC_KIDS}")
- Kitchen AC (ID="${devices.AC_KITCHEN}")
- Mini-Bar (ID="${devices.MINI_BAR}" - code "switch_1") - ON only if transition Kodesh→Chol
- Shutters (Left="${devices.SHUTTER_LEFT}", Right="${devices.SHUTTER_RIGHT}" - code "percent_control")

Context:
- Today: ${kodeshData.dateStr}
- Transition to Chol: ${kodeshData.transitionToChol}
- Havdalah time: ${kodeshData.havdalahToday || 'No havdalah today'}
- Sunset: ${kodeshData.sunset}
- Is Summer: ${kodeshData.isSummerMonth}
- Month: ${kodeshData.month}
- Max Temperature: ${weatherData.maxTemp}°C
- Current Temperature: ${weatherData.currentTemp}°C
- Forecast: ${JSON.stringify(weatherData.forecast.slice(0, 12))}

RULES:
1. Turn OFF bedroom/kids ACs at 11:00 (they ran all night from erev agent).
2. Kitchen AC ON 11:30, OFF 12:00 (pre-lunch, summer+hot only).
3. Living room ACs ON 12:00-14:00 (Shabbat lunch, summer+hot only).
4. Bedroom AC ON 14:00 until sunset (always in summer for afternoon rest).
5. Kids AC ON 14:00 until sunset (only if temp > 20°C).
6. If transitionToChol=true: Mini-Bar ON at havdalah time.
7. If transitionToChol=false: Do NOT touch mini-bar.
8. Skip AC actions if NOT summer (months 5-10) or temp < 20°C (except bedroom=always in summer).

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

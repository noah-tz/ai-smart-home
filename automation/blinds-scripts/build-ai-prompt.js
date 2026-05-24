// Build the AI prompt from weather data
const config = $('Load Config').first().json;

// --- DEBUG MODE: return empty payload so Gemini fails fast → goes to AI Failed node ---
if (config.debug && config.debug.mockAI) {
  return [{ json: { _mock: true } }];
}

// --- PRODUCTION MODE ---
const weatherData = $input.first().json;

const MIN_RAD = config.weather.minRadiationForSunnyWm2;
const CLOUDY_PCT = config.weather.cloudyThresholdPercentage * 100;
const COLD_TEMP = config.weather.coldThresholdCelsius;

const prompt = "Analyze the following IMS weather data from the last 2 hours (10-minute intervals): " + JSON.stringify(weatherData) +
  ".\n\nYour task is to decide if the blinds should remain OPEN (isCloudy: true) or CLOSE (isCloudy: false)." +
  "\n\nData Context:" +
  "\n- 'globalRadiation' is measured in W/m^2. Values below " + MIN_RAD + " W/m^2 during daytime indicate cloudy conditions." +
  "\n- 'rain' > 0 indicates active rain." +
  "\n\nRules:" +
  "\n1. For each interval, determine if it is 'cloudy/rainy' (globalRadiation < " + MIN_RAD + " OR rain > 0) or 'sunny'." +
  "\n2. If more than " + CLOUDY_PCT + "% of the intervals were 'cloudy/rainy', return isCloudy: true." +
  "\n3. If it is currently sunny but it's a COLD day (temperature below " + COLD_TEMP + "\u00b0C), return isCloudy: true." +
  "\n4. Only return isCloudy: false if it is sunny AND the temperature is comfortably warm (" + COLD_TEMP + "\u00b0C or above)." +
  "\n5. Provide a detailed and clear reason for your decision in Hebrew." +
  "\n\nReturn JSON: {\"isCloudy\": boolean, \"reason\": string}";

const payload = {
  contents: [{ role: "user", parts: [{ text: prompt }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "object",
      properties: {
        isCloudy: { type: "boolean" },
        reason: { type: "string" }
      },
      required: ["isCloudy", "reason"]
    }
  }
};

return [{ json: payload }];

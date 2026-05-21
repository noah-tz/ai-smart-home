const scriptProperties = PropertiesService.getScriptProperties();

const IMS_API_TOKEN = scriptProperties.getProperty("IMS_API_TOKEN"); // Token for IMS API (if required)
const LATITUDE = 31.701311; // Your home latitude
const LONGITUDE = 34.993257; // Your home longitude

const IS_ACTIVE_PROJECT = true;
const CLOUDY_THRESHOLD_PERCENTAGE = 0.7; // If > 70% of the time range is cloudy/rainy, it's considered a cloudy day.
const COLD_THRESHOLD_CELSIUS = 20; // Blinds stay open if below this temperature.
const MIN_RADIATION_FOR_SUNNY_WM2 = 400; // globalRadiation below this value is considered cloudy.


/**
 * Core function: Checks cloudiness using AI interpretation.
 */
function checkCloudyWithAI() {
  UtilsProject.AddLog("AiWeather", "start check CloudyWith by AI");
  var rawWeatherData = getRawWeather();

  // If data collection failed, default to TRUE (keep open) to be safe.
  if (!rawWeatherData) {
    UtilsProject.AddLog("AiWeather", "No weather data collected. Defaulting to OPEN for safety.");
    return { isCloudy: true, reason: "לא ניתן היה לקבל נתוני מזג אוויר מהשירות המטאורולוגי. התריסים יישארו פתוחים ליתר ביטחון." };
  }

  var schema = {
    type: "object",
    properties: {
      isCloudy: { type: "boolean" },
      reason: { type: "string" }
    },
    required: ["isCloudy", "reason"]
  };

  var prompt = "Analyze the following IMS weather data from the last 2 hours (10-minute intervals): " + JSON.stringify(rawWeatherData) +
    ".\n\nYour task is to decide if the blinds should remain OPEN (isCloudy: true) or CLOSE (isCloudy: false)." +
    "\n\nData Context:" +
    "\n- 'globalRadiation' is measured in W/m^2. Values below " + MIN_RADIATION_FOR_SUNNY_WM2 + " W/m^2 during daytime indicate cloudy conditions. High values (e.g., 500-1000+) indicate clear sunny conditions." +
    "\n- 'rain' > 0 indicates active rain." +
    "\n\nRules:" +
    "\n1. For each interval, determine if it is 'cloudy/rainy' (globalRadiation < " + MIN_RADIATION_FOR_SUNNY_WM2 + " OR rain > 0) or 'sunny'." +
    "\n2. If more than " + (CLOUDY_THRESHOLD_PERCENTAGE * 100) + "% of the intervals were 'cloudy/rainy', return isCloudy: true." +
    "\n3. If it is currently sunny but it's a COLD day (temperature below " + COLD_THRESHOLD_CELSIUS + "°C), return isCloudy: true (we want the blinds open to let the sun heat the house)." +
    "\n4. Only return isCloudy: false if it is sunny AND the temperature is comfortably warm (" + COLD_THRESHOLD_CELSIUS + "°C or above)." +
    "\n5. Provide a detailed and clear reason for your decision in Hebrew, as this will be sent to the user." +
    "\n\nReturn the result in JSON format matching the schema.";

  var payload = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var aiResponseText = UtilsProject.getGeminiResponse(options, undefined, "AiWeather");
    UtilsProject.AddLog("AiWeather", "AI Response Text: " + aiResponseText);

    if (aiResponseText) {
      var cleanJson = aiResponseText.replace(/```json|```/g, "").trim();
      var aiResult = JSON.parse(cleanJson);

      UtilsProject.AddLog("AiWeather", "AI Decision: " + aiResult.isCloudy + " | Reason: " + aiResult.reason);
      return aiResult;
    } else {
      UtilsProject.AddLog("AiWeather", "No valid AI response received. Defaulting to OPEN.");
      return { isCloudy: true, reason: "שגיאה בקבלת תשובה מהבינה המלאכותית. התריסים יישארו פתוחים ליתר ביטחון." };
    }
  } catch (e) {
    UtilsProject.AddLog("AiWeather", "Error in AI request/parsing: " + e.toString() + ". Defaulting to OPEN.");
    return { isCloudy: true, reason: "שגיאה בעיבוד הנתונים: " + e.toString() + ". התריסים יישארו פתוחים ליתר ביטחון." };
  }
}

/**
 * Helper function: Get raw weather from Israel Meteorological Service API.
 * @returns {Object|null} The weather data object or null if failed.
 */
function getRawWeather() {
  UtilsProject.AddLog("AiWeather", "start getRawWeather");
  var allStationsUrl = "https://api.ims.gov.il/v1/envista/stations";
  var options = {
    method: "get",
    headers: { "Authorization": "ApiToken " + IMS_API_TOKEN },
    muteHttpExceptions: true
  };

  try {
    /** @type {GoogleAppsScript.URL_Fetch.HTTPResponse} */
    var response = UrlFetchApp.fetch(allStationsUrl, options);
    var stations = JSON.parse(response.getContentText());

    // 1. Sort stations by distance from your home
    var sortedStations = stations.map(function (s) {
      var dist = Math.sqrt(Math.pow(s.location.latitude - LATITUDE, 2) + Math.pow(s.location.longitude - LONGITUDE, 2));
      return { station: s, distance: dist };
    }).sort((a, b) => a.distance - b.distance);

    // 2. Iterate stations (nearest to farthest) until one with radiation sensor (Grad) is found
    /** @type {Object} */
    var targetStation = null;
    /** @type {Object} */
    var weatherData = null;

    for (var i = 0; i < sortedStations.length; i++) {
      var sId = sortedStations[i].station.stationId;
      // Get data for the last 2 hours (approx) to avoid point-in-time errors.
      // 10 minutes intervals * 13 = ~2 hours
      var dataUrl = "https://api.ims.gov.il/v1/envista/stations/" + sId + "/data/?from=" +
        Utilities.formatDate(new Date(Date.now() - 2 * 60 * 60 * 1000), "GMT+2", "yyyy/MM/dd HH:mm") +
        "&to=" + Utilities.formatDate(new Date(), "GMT+2", "yyyy/MM/dd HH:mm");

      var dataResponse = UrlFetchApp.fetch(dataUrl, options);
      var contentText = dataResponse.getContentText();

      if (!contentText || contentText.trim() === "") {
        UtilsProject.AddLog("AiWeather", "Empty response from IMS API for station: " + sId);
        continue;
      }

      var data;
      try {
        data = JSON.parse(contentText);
      } catch (e) {
        UtilsProject.AddLog("AiWeather", "Failed to parse JSON for station: " + sId + ". Response was: " + contentText.substring(0, 100));
        continue;
      }

      if (data.data && data.data.length > 0) {
        // Check if the latest point has radiation sensor (Grad)
        var latestPoint = data.data[data.data.length - 1];
        var hasRadiationSensor = latestPoint.channels.some(c => c.name === "Grad" && c.value !== null);

        if (hasRadiationSensor) {
          targetStation = sortedStations[i].station;
          weatherData = processIMSData(data, targetStation);
          break; // Found suitable station
        }
      }
    }

    if (!weatherData) {
      UtilsProject.AddLog("AiWeather", "No station with radiation sensor found in the area.");
      return null;
    }

    UtilsProject.AddLog("AiWeather", "Selected station: " + targetStation.name);
    return weatherData;

  } catch (e) {
    UtilsProject.AddLog("AiWeather", "Error in getRawWeather: " + e.toString());
    return null;
  }
}

/**
 * Helper function for channel processing.
 * @param {Object} data - The raw data from API.
 * @param {Object} station - The station object.
 * @returns {Object} Processed weather object.
 */
function processIMSData(data, station) {
  var history = data.data.map(function (item) {
    var result = {
      datetime: item.datetime,
      rain: null, humidity: null, globalRadiation: null, temperature: null
    };
    item.channels.forEach(function (c) {
      if (c.status === 1) {
        if (c.name === "Rain") result.rain = c.value;
        if (c.name === "RH") result.humidity = c.value;
        if (c.name === "Grad") result.globalRadiation = c.value;
        if (c.name === "TD") result.temperature = c.value;
      }
    });
    return result;
  });

  return {
    stationId: station.stationId,
    stationName: station.name,
    dataPoints: history
  };
}

/**
 * Main function to run at halachic noon.
 * Checks cloudiness and closes blinds if sunny.
 */
function dailyBlindsCheck() {
  try {
    var aiResult = checkCloudyWithAI();
    var isCloudy = aiResult.isCloudy;
    var reason = aiResult.reason;

    UtilsProject.AddLog("AiWeather", "Is it cloudy today? " + isCloudy);

    if (!isCloudy && IS_ACTIVE_PROJECT) {
      CloseAllBlinds();
      UtilsProject.AddLog("AiWeather", "Not cloudy today, blinds will close.");
    } else {
      UtilsProject.AddLog("AiWeather", "Blinds will remain open. Reason: " + reason);
    }
    sendEmail(isCloudy, reason);
  } catch (e) {
    UtilsProject.AddLog("AiWeather", "Error in dailyBlindsCheck: " + e.toString());
  } finally { UtilsProject.Flush(); }
}

/**
 * Sends an email notification about the daily blinds check results.
 * The email content varies based on whether the project is active and the cloudiness status.
 * @param {boolean} isCloudy - Whether the AI determined it is cloudy/rainy today.
 */
function sendEmail(isCloudy, reason) {
  try {
    var recipient = "noahtzit@gmail.com";
    var subject = "עדכון מצב תריסים יומי - AI Weather";

    var statusColor = isCloudy ? "#3498db" : "#e67e22";
    var statusText = isCloudy ? "התריסים נשארים פתוחים" : "התריסים נסגרים כעת";
    var icon = isCloudy ? "☁️" : "☀️";

    var htmlBody = `
      <div style="direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${icon} ${statusText}</h1>
        </div>
        <div style="padding: 30px; line-height: 1.6; color: #333;">
          <p style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">ניתוח המערכת:</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-right: 5px solid ${statusColor}; border-radius: 4px; margin-bottom: 20px; font-style: italic;">
            ${reason}
          </div>
          <p style="font-size: 14px; color: #777;">
            ההחלטה התקבלה על ידי בינה מלאכותית בהתבסס על נתוני השירות המטאורולוגי ב-2 השעות האחרונות.
          </p>
        </div>
        <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #999;">
          AI Weather Automation System
        </div>
      </div>
    `;

    UtilsProject.AddLog("AiWeather", "Sending beautiful HTML email.");
    MailApp.sendEmail({
      to: recipient,
      subject: subject,
      htmlBody: htmlBody
    });
    UtilsProject.AddLog("AiWeather", "Email sent successfully.");
  } catch (e) {
    UtilsProject.AddLog("AiWeather", "Error sending email: " + e.toString());
  }
}

/**
 * Test function to verify the new weather AI logic.
 * Run this from the Apps Script editor.
 */
function testWeatherAI() {
  const mockData_ColdAndSunny = {
    stationId: "123",
    stationName: "Test Station",
    dataPoints: [
      { datetime: "2024-03-01T10:00:00Z", rain: 0, humidity: 40, globalRadiation: 800, temperature: 15 },
      { datetime: "2024-03-01T10:10:00Z", rain: 0, humidity: 40, globalRadiation: 810, temperature: 15.2 },
      { datetime: "2024-03-01T10:20:00Z", rain: 0, humidity: 39, globalRadiation: 820, temperature: 15.5 }
    ]
  };

  const mockData_Cloudy70Percent = {
    stationId: "123",
    stationName: "Test Station",
    dataPoints: [
      { datetime: "2024-03-01T10:00:00Z", rain: 1, humidity: 80, globalRadiation: 100, temperature: 22 },
      { datetime: "2024-03-01T10:10:00Z", rain: 0, humidity: 85, globalRadiation: 50, temperature: 21.8 },
      { datetime: "2024-03-01T10:20:00Z", rain: 0, humidity: 82, globalRadiation: 800, temperature: 22.1 } // Sunny moment
    ]
  };

  function runMockTest(name, mockData) {
    UtilsProject.AddLog("AiWeather", "--- RUNNING MOCK TEST: " + name + " ---");
    const originalGetRawWeather = getRawWeather;
    getRawWeather = () => mockData;

    try {
      const result = checkCloudyWithAI();
      UtilsProject.AddLog("AiWeather", "RESULT for " + name + ": " + JSON.stringify(result));
    } finally {
      getRawWeather = originalGetRawWeather;
    }
  }

  runMockTest("Cold and Sunny (Decision: Keep Open)", mockData_ColdAndSunny);
  runMockTest("Cloudy 70% (Decision: Keep Open)", mockData_Cloudy70Percent);
}


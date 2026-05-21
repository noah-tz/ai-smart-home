// Get weather forecast for the next 36 hours from Tomorrow.io
const config = $('Load Config').first().json;
const LAT = config.settings.LATITUDE;
const LON = config.settings.LONGITUDE;
const API_KEY = config.secrets.TOMORROW_IO_KEY;

const url = `https://api.tomorrow.io/v4/weather/forecast?location=${LAT},${LON}&timesteps=1h&apikey=${API_KEY}`;

const response = await this.helpers.httpRequest({
  method: 'GET',
  url: url,
  json: true
});

// Extract relevant hourly data for the next 36 hours
const hourly = (response.timelines?.hourly || []).slice(0, 36).map(h => ({
  time: h.time,
  temperature: h.values?.temperature,
  humidity: h.values?.humidity,
  cloudCover: h.values?.cloudCover,
  weatherCode: h.values?.weatherCode
}));

// Calculate max temperature for today/tomorrow
const maxTemp = Math.max(...hourly.map(h => h.temperature || 0));

return [{
  json: {
    forecast: hourly,
    maxTemp,
    currentTemp: hourly[0]?.temperature || null
  }
}];

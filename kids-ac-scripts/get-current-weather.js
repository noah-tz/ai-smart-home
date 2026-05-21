// Get current temperature and 4-hour trend from Tomorrow.io
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('/home/node/.n8n/config.json', 'utf8'));

const LAT = config.settings.LATITUDE;
const LON = config.settings.LONGITUDE;
const API_KEY = config.secrets.TOMORROW_IO_KEY;

const url = `https://api.tomorrow.io/v4/weather/forecast?location=${LAT},${LON}&timesteps=1h&apikey=${API_KEY}`;

const response = await this.helpers.httpRequest({
  method: 'GET',
  url: url,
  json: true
});

const hourly = (response.timelines?.hourly || []).slice(0, 5);
const currentTemp = hourly[0]?.values?.temperature || null;
const tempIn4h = hourly[4]?.values?.temperature || currentTemp;

// Determine trend
let trend = 'Stable';
if (tempIn4h !== null && currentTemp !== null) {
  const diff = tempIn4h - currentTemp;
  if (diff < -3) trend = `Dropping fast from ${currentTemp}C to ${tempIn4h}C`;
  else if (diff < -1) trend = `Dropping slowly from ${currentTemp}C to ${tempIn4h}C`;
  else if (diff > 3) trend = `Rising fast from ${currentTemp}C to ${tempIn4h}C`;
  else if (diff > 1) trend = `Rising slowly from ${currentTemp}C to ${tempIn4h}C`;
  else trend = `Stable around ${currentTemp}C`;
}

const now = new Date();
const month = now.getMonth() + 1;
const hour = now.getHours();
const isSummer = config.settings.SUMMER_MONTHS.includes(month);

return [{
  json: {
    currentTemp,
    tempIn4h,
    trend,
    month,
    hour,
    isSummer,
    currentTime: now.toISOString()
  }
}];

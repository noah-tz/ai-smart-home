// Fetch weather data from nearest IMS station with radiation sensor
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('/config/config.json', 'utf8'));
const candidates = $input.first().json.candidates;
const IMS_TOKEN = $env.IMS_API_TOKEN;

const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

// Format dates for IMS API
function formatDate(d) {
  const offset = config.weather.timezoneOffsetHours;
  const local = new Date(d.getTime() + offset * 60 * 60 * 1000);
  const iso = local.toISOString();
  const year = iso.slice(0, 4);
  const month = iso.slice(5, 7);
  const day = iso.slice(8, 10);
  const time = iso.slice(11, 16);
  return year + '/' + month + '/' + day + ' ' + time;
}

const fromStr = encodeURIComponent(formatDate(twoHoursAgo));
const toStr = encodeURIComponent(formatDate(now));

for (const candidate of candidates) {
  try {
    const url = 'https://api.ims.gov.il/v1/envista/stations/' + candidate.stationId + '/data/?from=' + fromStr + '&to=' + toStr;

    const response = await this.helpers.httpRequest({
      method: 'GET',
      url: url,
      headers: { 'Authorization': 'ApiToken ' + IMS_TOKEN },
      json: true
    });

    if (response && response.data && response.data.length > 0) {
      const latestPoint = response.data[response.data.length - 1];
      const hasGrad = latestPoint.channels.some(
        c => c.name === 'Grad' && c.value !== null
      );

      if (hasGrad) {
        const dataPoints = response.data.map(item => {
          const result = {
            datetime: item.datetime,
            rain: null,
            humidity: null,
            globalRadiation: null,
            temperature: null
          };

          item.channels.forEach(c => {
            if (c.status === 1) {
              if (c.name === 'Rain') result.rain = c.value;
              if (c.name === 'RH') result.humidity = c.value;
              if (c.name === 'Grad') result.globalRadiation = c.value;
              if (c.name === 'TD') result.temperature = c.value;
            }
          });

          return result;
        });

        return [{
          json: {
            stationId: candidate.stationId,
            stationName: candidate.name,
            dataPoints,
            success: true
          }
        }];
      }
    }
  } catch (e) {
    continue;
  }
}

return [{
  json: {
    success: false,
    reason: 'No station with radiation sensor found'
  }
}];

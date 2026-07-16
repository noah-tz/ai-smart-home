// Fetch weather data from nearest IMS station with radiation sensor
const candidates = $input.first().json.candidates;
const config = $('Load Config').first().json;
const IMS_TOKEN = config.secrets.IMS_API_TOKEN;

const now = new Date();
const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

// Format dates for IMS API in ISO format (YYYY-MM-DDTHH:MM:SS)
// Using ISO avoids URL encoding issues with slashes and spaces
function formatDate(d) {
  const formatter = new Intl.DateTimeFormat('en-IL', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const hour = parts.find(p => p.type === 'hour').value;
  const minute = parts.find(p => p.type === 'minute').value;
  const second = parts.find(p => p.type === 'second').value;
  return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second;
}

// Encode colons in time values - IMS API requires %3A for colons in query params
const fromStr = formatDate(twoHoursAgo).replace(/:/g, '%3A');
const toStr = formatDate(now).replace(/:/g, '%3A');

for (const candidate of candidates) {
  try {
    const url = 'https://api.ims.gov.il/v1/envista/stations/' + candidate.stationId + '/data/?from=' + fromStr + '&to=' + toStr;

    const response = await this.helpers.httpRequest({
      method: 'GET',
      url: url,
      headers: {
        'Authorization': 'ApiToken ' + IMS_TOKEN,
        'Accept': 'application/json'
      },
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

// AI Kids' Sleep Climate Guardian
// Runs every hour 21:00-07:00
// Summer (months 5-10): AC is on COOL - turn OFF when outdoor temp drops below 17°C
// Winter (months 11-4): AC is on HEAT - turn ON when outdoor temp drops below 10°C, OFF when above 12°C
const crypto = require('crypto');
const config = $('Load Config').first().json;

const DEVICE_ID = config.devices.AC_KIDS;
const TUYA_ACCESS_ID = config.secrets.TUYA_ACCESS_ID;
const TUYA_ACCESS_SECRET = config.secrets.TUYA_ACCESS_SECRET;
const API_URL = 'https://openapi.tuyaeu.com';
const TOMORROW_KEY = config.secrets.TOMORROW_IO_KEY;
const LAT = config.location.latitude;
const LON = config.location.longitude;

const now = new Date();
const hour = now.getHours();
const month = now.getMonth() + 1;
const isSummer = config.settings.SUMMER_MONTHS.includes(month);

// Only run between 21:00-07:00
if (hour >= 7 && hour < 21) {
  return [{ json: { action: 'skip', reason: 'Not nighttime (21:00-07:00)', hour } }];
}

// Get current weather from Tomorrow.io
const weatherUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${LAT},${LON}&apikey=${TOMORROW_KEY}`;
const weather = await this.helpers.httpRequest({ method: 'GET', url: weatherUrl, json: true });
const outdoorTemp = weather.data?.values?.temperature;

if (outdoorTemp === null || outdoorTemp === undefined) {
  return [{ json: { action: 'error', reason: 'Could not get outdoor temperature' } }];
}

// Decision logic
let shouldBeOn = false;
let reason = '';

if (isSummer) {
  // Summer: AC is on COOL. Turn OFF when outdoor < 17°C (natural cooling sufficient)
  if (outdoorTemp >= 17) {
    shouldBeOn = true;
    reason = `קיץ, טמפרטורה חיצונית ${outdoorTemp}°C (מעל 17°C) - מזגן קירור דולק`;
  } else {
    shouldBeOn = false;
    reason = `קיץ, טמפרטורה חיצונית ${outdoorTemp}°C (מתחת ל-17°C) - מזגן כבוי, קירור טבעי מספיק`;
  }
} else {
  // Winter: AC is on HEAT. Turn ON when outdoor < 10°C, OFF when > 12°C (hysteresis)
  if (outdoorTemp < 10) {
    shouldBeOn = true;
    reason = `חורף, טמפרטורה חיצונית ${outdoorTemp}°C (מתחת ל-10°C) - מזגן חימום דולק`;
  } else if (outdoorTemp > 12) {
    shouldBeOn = false;
    reason = `חורף, טמפרטורה חיצונית ${outdoorTemp}°C (מעל 12°C) - מזגן חימום כבוי`;
  } else {
    // Between 10-12: maintain current state (don't toggle)
    return [{ json: { action: 'maintain', reason: `חורף, טמפרטורה ${outdoorTemp}°C (10-12°C) - שומר מצב קיים`, outdoorTemp } }];
  }
}

// Execute Tuya command
async function sendTuyaCommand(turnOn) {
  // Get token
  const timestamp = Date.now().toString();
  const tokenPath = '/v1.0/token?grant_type=1';
  const contentHash = crypto.createHash('sha256').update('').digest('hex');
  const stringToSign = 'GET\n' + contentHash + '\n\n' + tokenPath;
  const str = TUYA_ACCESS_ID + timestamp + stringToSign;
  const sign = crypto.createHmac('sha256', TUYA_ACCESS_SECRET).update(str).digest('hex').toUpperCase();

  const tokenResp = await this.helpers.httpRequest({
    method: 'GET', url: API_URL + tokenPath,
    headers: { 't': timestamp, 'sign': sign, 'client_id': TUYA_ACCESS_ID, 'sign_method': 'HMAC-SHA256' },
    json: true
  });
  const token = tokenResp.result.access_token;

  // Send command
  const cmdTimestamp = Date.now().toString();
  const cmdPath = '/v1.0/devices/' + DEVICE_ID + '/commands';
  const body = JSON.stringify({ commands: [{ code: 'switch', value: turnOn }] });
  const cmdContentHash = crypto.createHash('sha256').update(body).digest('hex');
  const cmdStringToSign = 'POST\n' + cmdContentHash + '\n\n' + cmdPath;
  const cmdStr = TUYA_ACCESS_ID + token + cmdTimestamp + cmdStringToSign;
  const cmdSign = crypto.createHmac('sha256', TUYA_ACCESS_SECRET).update(cmdStr).digest('hex').toUpperCase();

  return await this.helpers.httpRequest({
    method: 'POST', url: API_URL + cmdPath,
    headers: { 't': cmdTimestamp, 'sign': cmdSign, 'client_id': TUYA_ACCESS_ID, 'sign_method': 'HMAC-SHA256', 'access_token': token, 'Content-Type': 'application/json' },
    body, json: true
  });
}

const result = await sendTuyaCommand.call(this, shouldBeOn);

return [{
  json: {
    action: shouldBeOn ? 'ON' : 'OFF',
    reason,
    outdoorTemp,
    isSummer,
    month,
    hour,
    tuyaSuccess: result.success
  }
}];

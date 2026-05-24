// Close both Tuya blinds using signed API requests
const crypto = require('crypto');

const config = $('Load Config').first().json;
const TUYA_ACCESS_ID = config.secrets.TUYA_ACCESS_ID;
const TUYA_ACCESS_SECRET = config.secrets.TUYA_ACCESS_SECRET;
const API_URL = 'https://openapi.tuyaeu.com';
const inputJson = $input.first().json;
const token = inputJson.token;

// Preserve AI decision data for downstream email node
const isCloudy = inputJson.isCloudy;
const reason = inputJson.reason;

const BLINDS = [
  config.devices.SHUTTER_RIGHT,
  config.devices.SHUTTER_LEFT
];

const results = [];

for (const deviceId of BLINDS) {
  const timestamp = Date.now().toString();
  const path = '/v1.0/devices/' + deviceId + '/commands';
  const body = JSON.stringify({ commands: [{ code: 'control', value: 'close' }] });

  const contentHash = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = 'POST\n' + contentHash + '\n\n' + path;
  const str = TUYA_ACCESS_ID + token + timestamp + stringToSign;
  const sign = crypto.createHmac('sha256', TUYA_ACCESS_SECRET).update(str).digest('hex').toUpperCase();

  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: API_URL + path,
    headers: {
      't': timestamp,
      'sign': sign,
      'client_id': TUYA_ACCESS_ID,
      'sign_method': 'HMAC-SHA256',
      'access_token': token,
      'Content-Type': 'application/json'
    },
    body: body,
    json: true
  });

  results.push({ deviceId, success: response.success, result: response });
}

return [{ json: { blindsResults: results, isCloudy, reason } }];

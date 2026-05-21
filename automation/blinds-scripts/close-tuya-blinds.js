// Close both Tuya blinds using signed API requests
const crypto = require('crypto');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('/config/config.json', 'utf8'));
const TUYA_ACCESS_ID = $env.TUYA_ACCESS_ID;
const TUYA_ACCESS_SECRET = $env.TUYA_ACCESS_SECRET;
const API_URL = 'https://openapi.tuyaeu.com';
const token = $input.first().json.token;

const BLINDS = [
  config.blinds.rightDeviceId,
  config.blinds.leftDeviceId
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

return [{ json: { blindsResults: results } }];

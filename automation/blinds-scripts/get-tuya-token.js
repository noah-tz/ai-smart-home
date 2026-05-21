// Get Tuya access token using HMAC-SHA256 signature
const crypto = require('crypto');

const TUYA_ACCESS_ID = $env.TUYA_ACCESS_ID;
const TUYA_ACCESS_SECRET = $env.TUYA_ACCESS_SECRET;
const API_URL = 'https://openapi.tuyaeu.com';

const timestamp = Date.now().toString();
const path = '/v1.0/token?grant_type=1';

// Calculate signature (no token for auth request)
const contentHash = crypto.createHash('sha256').update('').digest('hex');
const stringToSign = 'GET\n' + contentHash + '\n\n' + path;
const str = TUYA_ACCESS_ID + timestamp + stringToSign;
const sign = crypto.createHmac('sha256', TUYA_ACCESS_SECRET).update(str).digest('hex').toUpperCase();

const response = await this.helpers.httpRequest({
  method: 'GET',
  url: API_URL + path,
  headers: {
    't': timestamp,
    'sign': sign,
    'client_id': TUYA_ACCESS_ID,
    'sign_method': 'HMAC-SHA256'
  },
  json: true
});

if (response.success && response.result && response.result.access_token) {
  return [{ json: { token: response.result.access_token } }];
} else {
  throw new Error('Failed to get Tuya token: ' + JSON.stringify(response));
}

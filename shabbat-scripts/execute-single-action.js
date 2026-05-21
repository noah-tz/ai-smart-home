// Execute a single Tuya command for the current scheduled action
const crypto = require('crypto');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('/home/node/.n8n/config.json', 'utf8'));

const action = $input.first().json;

const TUYA_ACCESS_ID = config.secrets.TUYA_ACCESS_ID;
const TUYA_ACCESS_SECRET = config.secrets.TUYA_ACCESS_SECRET;
const API_URL = 'https://openapi.tuyaeu.com';

// Get Tuya token
const timestamp = Date.now().toString();
const tokenPath = '/v1.0/token?grant_type=1';
const contentHash = crypto.createHash('sha256').update('').digest('hex');
const stringToSign = 'GET\n' + contentHash + '\n\n' + tokenPath;
const str = TUYA_ACCESS_ID + timestamp + stringToSign;
const sign = crypto.createHmac('sha256', TUYA_ACCESS_SECRET).update(str).digest('hex').toUpperCase();

const tokenResp = await this.helpers.httpRequest({
  method: 'GET',
  url: API_URL + tokenPath,
  headers: { 't': timestamp, 'sign': sign, 'client_id': TUYA_ACCESS_ID, 'sign_method': 'HMAC-SHA256' },
  json: true
});

const token = tokenResp.result.access_token;

// Send command
const cmdTimestamp = Date.now().toString();
const cmdPath = '/v1.0/devices/' + action.deviceId + '/commands';
const body = JSON.stringify({ commands: action.commands });

const cmdContentHash = crypto.createHash('sha256').update(body).digest('hex');
const cmdStringToSign = 'POST\n' + cmdContentHash + '\n\n' + cmdPath;
const cmdStr = TUYA_ACCESS_ID + token + cmdTimestamp + cmdStringToSign;
const cmdSign = crypto.createHmac('sha256', TUYA_ACCESS_SECRET).update(cmdStr).digest('hex').toUpperCase();

const result = await this.helpers.httpRequest({
  method: 'POST',
  url: API_URL + cmdPath,
  headers: {
    't': cmdTimestamp, 'sign': cmdSign, 'client_id': TUYA_ACCESS_ID,
    'sign_method': 'HMAC-SHA256', 'access_token': token,
    'Content-Type': 'application/json'
  },
  body: body,
  json: true
});

return [{
  json: {
    entity: action.entity,
    action: action.action,
    time: action.time,
    success: result.success,
    explanation: action.explanation
  }
}];

// Execute scheduled Tuya commands at the right times
// This node receives a schedule array and executes commands that are due NOW
const crypto = require('crypto');
const config = $('Load Config').first().json;
const scheduleData = $input.first().json;

const TUYA_ACCESS_ID = config.secrets.TUYA_ACCESS_ID;
const TUYA_ACCESS_SECRET = config.secrets.TUYA_ACCESS_SECRET;
const API_URL = 'https://openapi.tuyaeu.com';

// Get Tuya token
async function getTuyaToken() {
  const timestamp = Date.now().toString();
  const path = '/v1.0/token?grant_type=1';
  const contentHash = crypto.createHash('sha256').update('').digest('hex');
  const stringToSign = 'GET\n' + contentHash + '\n\n' + path;
  const str = TUYA_ACCESS_ID + timestamp + stringToSign;
  const sign = crypto.createHmac('sha256', TUYA_ACCESS_SECRET).update(str).digest('hex').toUpperCase();

  const response = await this.helpers.httpRequest({
    method: 'GET',
    url: API_URL + path,
    headers: { 't': timestamp, 'sign': sign, 'client_id': TUYA_ACCESS_ID, 'sign_method': 'HMAC-SHA256' },
    json: true
  });

  return response.result.access_token;
}

// Send command to device
async function sendCommand(token, deviceId, commands) {
  const timestamp = Date.now().toString();
  const path = '/v1.0/devices/' + deviceId + '/commands';
  const body = JSON.stringify({ commands });

  const contentHash = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = 'POST\n' + contentHash + '\n\n' + path;
  const str = TUYA_ACCESS_ID + token + timestamp + stringToSign;
  const sign = crypto.createHmac('sha256', TUYA_ACCESS_SECRET).update(str).digest('hex').toUpperCase();

  const response = await this.helpers.httpRequest({
    method: 'POST',
    url: API_URL + path,
    headers: {
      't': timestamp, 'sign': sign, 'client_id': TUYA_ACCESS_ID,
      'sign_method': 'HMAC-SHA256', 'access_token': token,
      'Content-Type': 'application/json'
    },
    body: body,
    json: true
  });

  return response;
}

// Filter actions that should execute NOW (within 2 minute window)
const now = Date.now();
const WINDOW_MS = 2 * 60 * 1000; // 2 minutes

const dueActions = scheduleData.schedule.filter(action => {
  const actionTime = new Date(action.time).getTime();
  return Math.abs(actionTime - now) <= WINDOW_MS;
});

if (dueActions.length === 0) {
  return [{ json: { executed: 0, message: 'No actions due at this time' } }];
}

// Execute due actions
const token = await getTuyaToken.call(this);
const results = [];

for (const action of dueActions) {
  try {
    const result = await sendCommand.call(this, token, action.deviceId, action.commands);
    results.push({
      entity: action.entity,
      action: action.action,
      success: result.success,
      time: action.time
    });
  } catch (e) {
    results.push({
      entity: action.entity,
      action: action.action,
      success: false,
      error: e.message,
      time: action.time
    });
  }
}

return [{ json: { executed: results.length, results } }];

// --- Tuya Settings
const TUYA_ACCESS_ID = scriptProperties.getProperty("TUYA_ACCESS_ID");
const TUYA_ACCESS_SECRET = scriptProperties.getProperty("TUYA_ACCESS_SECRET");
const API_URL = 'https://openapi.tuyaeu.com'; // Europe server

// --- Your Blinds IDs ---
const BLINDS = {
  RIGHT: scriptProperties.getProperty("BLINDS_RIGHT"),
  LEFT: scriptProperties.getProperty("BLINDS_LEFT")
};

/**
 * Close both blinds
 */
function CloseAllBlinds() {
  try {
    UtilsProject.AddLog("AiWeather", "Starting CloseAllBlinds (Tuya)"
      + "Key blind right: " + BLINDS.RIGHT + ", Key blind left: " + BLINDS.LEFT);
    closeBlind(BLINDS.RIGHT);
    closeBlind(BLINDS.LEFT);
    UtilsProject.AddLog("AiWeather", "Finished CloseAllBlinds (Tuya)");
  } catch (e) {
    UtilsProject.AddLog("AiWeather", "Error in CloseAllBlinds: " + e.toString());
  }
}

function closeBlind(deviceId) {
  const token = getTuyaToken();
  const path = '/v1.0/devices/' + deviceId + '/commands';

  // Standard close command for Smart Life
  const payload = {
    "commands": [
      { "code": "control", "value": "close" }
    ]
  };
  UtilsProject.AddLog("AiWeather", "Tuya payload: " +
    JSON.stringify(payload) +
    " token: " + token +
    " path: " + path);

  const response = sendTuyaRequest(path, 'POST', payload, token);
  UtilsProject.AddLog("AiWeather", "Result for " + deviceId + ": " + response);
}

// --- Infrastructure functions (don't touch here) ---

function getTuyaToken() {
  UtilsProject.AddLog("AiWeather", "Starting getTuyaToken");
  const timestamp = new Date().getTime().toString();
  const path = '/v1.0/token?grant_type=1';
  const sign = calcSign(TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, timestamp, 'GET', path);

  const options = {
    'method': 'get',
    'headers': {
      't': timestamp,
      'sign': sign,
      'client_id': TUYA_ACCESS_ID,
      'sign_method': 'HMAC-SHA256'
    }
  };

  UtilsProject.AddLog("AiWeather", "Tuya options: " + JSON.stringify(options));

  const response = UrlFetchApp.fetch(API_URL + path, options);
  UtilsProject.AddLog("AiWeather", "Tuya response: " + response.getContentText());
  const result = JSON.parse(response.getContentText());
  UtilsProject.AddLog("AiWeather", "got tuya token: " + result.result.access_token);
  return result.result.access_token;
}

function sendTuyaRequest(path, method, body, token) {
  const timestamp = new Date().getTime().toString();
  const bodyStr = JSON.stringify(body);
  const sign = calcSign(TUYA_ACCESS_ID, TUYA_ACCESS_SECRET, timestamp, method, path, bodyStr, token);

  const options = {
    'method': method,
    'contentType': 'application/json',
    'headers': {
      't': timestamp,
      'sign': sign,
      'client_id': TUYA_ACCESS_ID,
      'sign_method': 'HMAC-SHA256',
      'access_token': token
    },
    'payload': bodyStr,
    'muteHttpExceptions': true
  };

  const response = UrlFetchApp.fetch(API_URL + path, options);
  UtilsProject.AddLog("AiWeather", "got tuya response: " + response.getContentText());
  return response.getContentText();
}


/*

*/
function calcSign(id, secret, ts, method, path, body = '', token = '') {
  UtilsProject.AddLog("AiWeather", `Starting calcSign. parameters: id: ${id}, secret: ${secret}, ts: ${ts}, method: ${method}, path: ${path}, body: ${body}, token: ${token}`);
  const contentHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, body)
    .map(b => (b & 0xFF).toString(16).padStart(2, '0')).join('');

  const stringToSign = method + "\n" + contentHash + "\n" + "" + "\n" + path;
  const str = id + token + ts + stringToSign;
  const hash = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_256, str, secret);
  var sign = hash.map(b => (b & 0xFF).toString(16).padStart(2, '0')).join('').toUpperCase();
  UtilsProject.AddLog("AiWeather", "got tuya sign: " + sign);
  return sign;
}
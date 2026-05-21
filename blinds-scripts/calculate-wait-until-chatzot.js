// Calculate wait time until Chatzot (Halachic Noon)
const hebcalData = $input.first().json;
const chatzotISO = hebcalData.times.chatzot;

if (!chatzotISO) {
  // Fallback to 12:00 if API fails
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return [{
    json: {
      chatzotTime: now.toISOString(),
      waitSeconds: Math.max(0, (now.getTime() - Date.now()) / 1000)
    }
  }];
}

const chatzotDate = new Date(chatzotISO);
const waitMs = chatzotDate.getTime() - Date.now();
const waitSeconds = Math.max(0, Math.floor(waitMs / 1000));

return [{
  json: {
    chatzotTime: chatzotISO,
    waitSeconds
  }
}];

// Plan Erev Shabbat actions: shutdown devices + schedule AC for Friday night
const config = $('Load Config').first().json;
const shabbatData = $('Check Shabbat Entry').first().json;
const weatherData = $('Get Weather Forecast').first().json;

const candleLighting = shabbatData.candleLighting;
const sunsetTime = shabbatData.sunsetTime;
const isSummer = shabbatData.isSummerMonth;
const maxTemp = weatherData.maxTemp;

const devices = config.devices;
const schedule = [];

// === FIXED ACTIONS: Always on Erev Shabbat ===

// 1. Turn OFF Boiler 30 min before candle lighting
const clDate = new Date(candleLighting);
const boilerOff = new Date(clDate.getTime() - 30 * 60 * 1000);
schedule.push({
  time: boilerOff.toISOString(),
  deviceId: devices.BOILER,
  entity: 'Boiler',
  action: 'OFF',
  commands: [{ code: 'switch_1', value: false }]
});

// 2. Turn OFF Mini-Bar at candle lighting
schedule.push({
  time: candleLighting,
  deviceId: devices.MINI_BAR,
  entity: 'Mini-Bar',
  action: 'OFF',
  commands: [{ code: 'switch_1', value: false }]
});

// === CONDITIONAL: AC for Friday night dinner (summer + hot) ===
if (isSummer && maxTemp >= config.settings.AC_TEMP_THRESHOLD) {
  // Living room ACs: 1 hour after sunset for 2 hours
  const sunsetDate = new Date(sunsetTime);
  const acOn = new Date(sunsetDate.getTime() + 60 * 60 * 1000);
  const acOff = new Date(acOn.getTime() + 2 * 60 * 60 * 1000);

  // Turn ON living room ACs
  schedule.push({
    time: acOn.toISOString(),
    deviceId: devices.AC_LIVING_1,
    entity: 'AC Living 1',
    action: 'ON',
    commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 24 }]
  });
  schedule.push({
    time: acOn.toISOString(),
    deviceId: devices.AC_LIVING_2,
    entity: 'AC Living 2',
    action: 'ON',
    commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 24 }]
  });

  // Turn OFF living room ACs after dinner
  schedule.push({
    time: acOff.toISOString(),
    deviceId: devices.AC_LIVING_1,
    entity: 'AC Living 1',
    action: 'OFF',
    commands: [{ code: 'switch', value: false }]
  });
  schedule.push({
    time: acOff.toISOString(),
    deviceId: devices.AC_LIVING_2,
    entity: 'AC Living 2',
    action: 'OFF',
    commands: [{ code: 'switch', value: false }]
  });

  // Bedroom AC: after dinner until 11:00 next morning
  schedule.push({
    time: acOff.toISOString(),
    deviceId: devices.AC_BEDROOM,
    entity: 'AC Bedroom',
    action: 'ON',
    commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 24 }]
  });

  // Kids AC: after dinner until 11:00 next morning
  schedule.push({
    time: acOff.toISOString(),
    deviceId: devices.AC_KIDS,
    entity: 'AC Kids',
    action: 'ON',
    commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 24 }]
  });
}

// Sort by time
schedule.sort((a, b) => new Date(a.time) - new Date(b.time));

return [{ json: { schedule, summary: `Erev Shabbat plan: ${schedule.length} actions scheduled` } }];

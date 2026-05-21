// Plan Yom Kodesh (Shabbat/Chag day) actions
const config = $('Load Config').first().json;
const kodeshData = $('Check Yom Kodesh').first().json;
const weatherData = $('Get Weather Forecast').first().json;

const devices = config.devices;
const isSummer = kodeshData.isSummerMonth;
const maxTemp = weatherData.maxTemp;
const sunset = kodeshData.sunset;
const dateStr = kodeshData.dateStr;
const schedule = [];

// === MORNING: Turn off bedroom/kids ACs at 11:00 ===
if (isSummer) {
  const morningOff = `${dateStr}T11:00:00+03:00`;

  schedule.push({
    time: morningOff,
    deviceId: devices.AC_BEDROOM,
    entity: 'AC Bedroom',
    action: 'OFF',
    commands: [{ code: 'switch', value: false }]
  });
  schedule.push({
    time: morningOff,
    deviceId: devices.AC_KIDS,
    entity: 'AC Kids',
    action: 'OFF',
    commands: [{ code: 'switch', value: false }]
  });
}

// === KITCHEN AC: 30 min before lunch (11:30) until lunch (12:00) ===
if (isSummer && maxTemp >= config.settings.AC_TEMP_THRESHOLD) {
  schedule.push({
    time: `${dateStr}T11:30:00+03:00`,
    deviceId: devices.AC_KITCHEN,
    entity: 'AC Kitchen',
    action: 'ON',
    commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 23 }]
  });
  schedule.push({
    time: `${dateStr}T12:00:00+03:00`,
    deviceId: devices.AC_KITCHEN,
    entity: 'AC Kitchen',
    action: 'OFF',
    commands: [{ code: 'switch', value: false }]
  });
}

// === LIVING ROOM ACs: Lunch 12:00-14:00 ===
if (isSummer && maxTemp >= config.settings.AC_TEMP_THRESHOLD) {
  schedule.push({
    time: `${dateStr}T12:00:00+03:00`,
    deviceId: devices.AC_LIVING_1,
    entity: 'AC Living 1',
    action: 'ON',
    commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 24 }]
  });
  schedule.push({
    time: `${dateStr}T12:00:00+03:00`,
    deviceId: devices.AC_LIVING_2,
    entity: 'AC Living 2',
    action: 'ON',
    commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 24 }]
  });
  schedule.push({
    time: `${dateStr}T14:00:00+03:00`,
    deviceId: devices.AC_LIVING_1,
    entity: 'AC Living 1',
    action: 'OFF',
    commands: [{ code: 'switch', value: false }]
  });
  schedule.push({
    time: `${dateStr}T14:00:00+03:00`,
    deviceId: devices.AC_LIVING_2,
    entity: 'AC Living 2',
    action: 'OFF',
    commands: [{ code: 'switch', value: false }]
  });
}

// === AFTERNOON REST: Bedroom/Kids 14:00 until sunset ===
if (isSummer) {
  // Bedroom AC always in summer
  schedule.push({
    time: `${dateStr}T14:00:00+03:00`,
    deviceId: devices.AC_BEDROOM,
    entity: 'AC Bedroom',
    action: 'ON',
    commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 24 }]
  });

  // Kids AC only if hot
  if (maxTemp >= config.settings.AC_TEMP_THRESHOLD) {
    schedule.push({
      time: `${dateStr}T14:00:00+03:00`,
      deviceId: devices.AC_KIDS,
      entity: 'AC Kids',
      action: 'ON',
      commands: [{ code: 'switch', value: true }, { code: 'mode', value: 'cold' }, { code: 'temp_set', value: 24 }]
    });
  }

  // Turn off at sunset
  if (sunset) {
    const sunsetDate = new Date(sunset);
    schedule.push({
      time: sunsetDate.toISOString(),
      deviceId: devices.AC_BEDROOM,
      entity: 'AC Bedroom',
      action: 'OFF',
      commands: [{ code: 'switch', value: false }]
    });
    if (maxTemp >= config.settings.AC_TEMP_THRESHOLD) {
      schedule.push({
        time: sunsetDate.toISOString(),
        deviceId: devices.AC_KIDS,
        entity: 'AC Kids',
        action: 'OFF',
        commands: [{ code: 'switch', value: false }]
      });
    }
  }
}

// === TRANSITION TO CHOL: Turn ON Mini-Bar at havdalah ===
if (kodeshData.transitionToChol && kodeshData.havdalahToday) {
  schedule.push({
    time: kodeshData.havdalahToday,
    deviceId: devices.MINI_BAR,
    entity: 'Mini-Bar',
    action: 'ON',
    commands: [{ code: 'switch_1', value: true }]
  });
}

// Sort by time
schedule.sort((a, b) => new Date(a.time) - new Date(b.time));

return [{ json: { schedule, summary: `Yom Kodesh plan: ${schedule.length} actions scheduled` } }];

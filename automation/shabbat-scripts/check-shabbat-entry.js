// Check if tonight there's a Kodesh entry (candle lighting)
// Also determines if this is a Chol→Kodesh transition or Kodesh→Kodesh (multi-day)
const config = $('Load Config').first().json;
const LAT = config.location.latitude;
const LON = config.location.longitude;

const today = new Date();
const dateStr = today.toISOString().slice(0, 10);
const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
const yesterdayStr = yesterday.toISOString().slice(0, 10);

// Get Hebcal shabbat data
const url = `https://www.hebcal.com/shabbat?cfg=json&latitude=${LAT}&longitude=${LON}&M=on&b=18`;
const response = await this.helpers.httpRequest({ method: 'GET', url, json: true });

let candleLighting = null;
let havdalah = null;
let isErevKodesh = false;
let holidayName = '';

for (const item of response.items || []) {
  const itemDate = item.date ? item.date.slice(0, 10) : '';
  if (item.category === 'candles' && itemDate === dateStr) {
    candleLighting = item.date;
    isErevKodesh = true;
    holidayName = item.title || 'Shabbat';
  }
  if (item.category === 'havdalah') {
    havdalah = item.date;
  }
}

// Determine if today is already Kodesh (yesterday had candle lighting or today is Shabbat morning)
// If today is already Kodesh, then tonight's candle lighting is Kodesh→Kodesh (no shutdown needed)
let isTodayAlreadyKodesh = false;

// Check if yesterday was erev (had candle lighting)
for (const item of response.items || []) {
  const itemDate = item.date ? item.date.slice(0, 10) : '';
  if (item.category === 'candles' && itemDate === yesterdayStr) {
    isTodayAlreadyKodesh = true;
  }
}

// Also check: if today is Saturday (woke up on Shabbat) 
if (today.getDay() === 6) {
  isTodayAlreadyKodesh = true;
}

// Check Hebrew calendar for Yom Tov today
const calUrl = `https://www.hebcal.com/hebcal?v=1&cfg=json&year=now&month=now&maj=on&min=off&mod=off&nx=off&ss=off&mf=off&c=off&geo=pos&latitude=${LAT}&longitude=${LON}`;
const calResp = await this.helpers.httpRequest({ method: 'GET', url: calUrl, json: true });

for (const item of calResp.items || []) {
  const itemDate = item.date ? item.date.slice(0, 10) : '';
  if (itemDate === dateStr && item.yomtov === true) {
    isTodayAlreadyKodesh = true;
  }
}

// KEY LOGIC:
// isTransitionCholToKodesh = there IS candle lighting tonight AND today is NOT already Kodesh
const isTransitionCholToKodesh = isErevKodesh && !isTodayAlreadyKodesh;

// Sunset time (candle lighting + 18 min ≈ sunset)
let sunsetTime = null;
if (candleLighting) {
  const cl = new Date(candleLighting);
  sunsetTime = new Date(cl.getTime() + 18 * 60 * 1000).toISOString();
}

const month = today.getMonth() + 1;
const isSummerMonth = config.settings.SUMMER_MONTHS.includes(month);

return [{
  json: {
    isErevKodesh,
    isTransitionCholToKodesh,
    isTodayAlreadyKodesh,
    candleLighting,
    havdalah,
    sunsetTime,
    holidayName,
    isSummerMonth,
    month,
    dateStr
  }
}];

// Check if today is Yom Kodesh (Shabbat or Chag)
// Also check if there's a transition to Chol at sunset today
const config = $('Load Config').first().json;
const LAT = config.location.latitude;
const LON = config.location.longitude;

const today = new Date();
const dateStr = today.toISOString().slice(0, 10);
const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);

// Get Hebcal data
const url = `https://www.hebcal.com/shabbat?cfg=json&latitude=${LAT}&longitude=${LON}&M=on&b=18`;

const response = await this.helpers.httpRequest({
  method: 'GET',
  url: url,
  json: true
});

// Determine if today is Kodesh
// Today is Kodesh if:
// - It's Saturday (day 6)
// - Or there was candle lighting yesterday (holiday)
// - Or Hebcal shows havdalah for today

let isYomKodesh = (today.getDay() === 6); // Saturday
let havdalahToday = null;
let candleLightingToday = null;
let transitionToChol = false;

for (const item of response.items || []) {
  const itemDate = item.date ? item.date.slice(0, 10) : '';

  // If havdalah is today, there's a transition to Chol
  if (item.category === 'havdalah' && itemDate === dateStr) {
    havdalahToday = item.date;
    transitionToChol = true;
  }

  // If candle lighting was yesterday or today is between candles and havdalah
  if (item.category === 'candles' && itemDate === dateStr) {
    candleLightingToday = item.date;
    // If there's candle lighting today, it means today is also erev (handled by other workflow)
  }
}

// Also check: if today is Saturday, it's definitely Kodesh
// If today is a holiday (check Hebrew calendar)
const hebcalCalUrl = `https://www.hebcal.com/hebcal?v=1&cfg=json&year=now&month=now&maj=on&min=off&mod=off&nx=off&ss=off&mf=off&c=off&geo=pos&latitude=${LAT}&longitude=${LON}`;

const calResponse = await this.helpers.httpRequest({
  method: 'GET',
  url: hebcalCalUrl,
  json: true
});

// Check if today is a Yom Tov
for (const item of calResponse.items || []) {
  const itemDate = item.date ? item.date.slice(0, 10) : '';
  if (itemDate === dateStr && item.yomtov === true) {
    isYomKodesh = true;
  }
}

const month = today.getMonth() + 1;
const isSummerMonth = config.settings.SUMMER_MONTHS.includes(month);

// Get sunset time for today (from Hebcal zmanim)
const zmanimUrl = `https://www.hebcal.com/zmanim?cfg=json&latitude=${LAT}&longitude=${LON}&tzid=Asia/Jerusalem&date=${dateStr}`;
const zmanimResp = await this.helpers.httpRequest({
  method: 'GET',
  url: zmanimUrl,
  json: true
});
const sunset = zmanimResp.times?.sunset || null;

return [{
  json: {
    isYomKodesh,
    transitionToChol,
    havdalahToday,
    sunset,
    isSummerMonth,
    month,
    dateStr
  }
}];

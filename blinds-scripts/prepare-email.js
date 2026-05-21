// Prepare HTML email with blinds status report
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('/config/config.json', 'utf8'));
const inputData = $input.first().json;
const isCloudy = inputData.isCloudy;
const reason = inputData.reason;

const statusColor = isCloudy ? '#3498db' : '#e67e22';
const statusText = isCloudy ? 'התריסים נשארים פתוחים' : 'התריסים נסגרים כעת';
const icon = isCloudy ? '☁️' : '☀️';

const htmlBody = `
<div style="direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
  <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">${icon} ${statusText}</h1>
  </div>
  <div style="padding: 30px; line-height: 1.6; color: #333;">
    <p style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">ניתוח המערכת:</p>
    <div style="background-color: #f9f9f9; padding: 15px; border-right: 5px solid ${statusColor}; border-radius: 4px; margin-bottom: 20px; font-style: italic;">
      ${reason}
    </div>
    <p style="font-size: 14px; color: #777;">
      ההחלטה התקבלה על ידי בינה מלאכותית בהתבסס על נתוני השירות המטאורולוגי ב-2 השעות האחרונות.
    </p>
  </div>
  <div style="background-color: #f1f1f1; padding: 10px; text-align: center; font-size: 12px; color: #999;">
    AI Weather Automation System | n8n
  </div>
</div>
`;

return [{
  json: {
    to: config.notifications.recipientEmail,
    subject: 'עדכון מצב תריסים יומי - AI Weather',
    html: htmlBody,
    isCloudy,
    reason
  }
}];
